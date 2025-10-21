import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { db, Conversation, EvalResult, Dataset, Prompt, DatasetEntry } from "@/lib/db";

export interface EvaluationConfig {
  provider: "openai" | "anthropic" | "google";
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  evaluatorModel?: string;
  evaluatorPrompt: string;
}

export interface EvaluationProgress {
  current: number;
  total: number;
  currentEntry: string;
  progress: number;
}

export interface EvaluationResult {
  success: boolean;
  results: EvalResult[];
  error?: string;
}

export class EvaluationService {
  private getAIClient(provider: string, apiKey: string) {
    switch (provider) {
      case "openai":
        return createOpenAI({ apiKey });
      case "anthropic":
        return createAnthropic({ apiKey });
      case "google":
        return createGoogleGenerativeAI({ apiKey });
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async getApiKey(provider: string): Promise<string> {
    const settings = await db.settings.get('default');
    const apiKey = settings?.api_keys?.[provider as keyof typeof settings.api_keys];
    
    if (!apiKey) {
      throw new Error(`API key not configured for ${provider}. Please add your ${provider} API key in Settings.`);
    }
    
    return apiKey;
  }

  private async generateConversation(
    entry: DatasetEntry & { datasetId: string; datasetName: string },
    prompt: Prompt,
    promptVersion: string,
    config: EvaluationConfig
  ): Promise<Conversation> {
    const apiKey = await this.getApiKey(config.provider);
    const client = this.getAIClient(config.provider, apiKey);
    const promptVersionData = prompt.versions[promptVersion];
    
    if (!promptVersionData) {
      throw new Error(`Prompt version ${promptVersion} not found`);
    }

    let conversation: Conversation;

    if (entry.type === 'single-turn') {
      // Single-turn: generate one response
      const { text } = await generateText({
        model: client(config.model),
        messages: [
          { role: 'system', content: promptVersionData.config.system_prompt },
          { role: 'user', content: entry.input || '' }
        ],
        temperature: config.temperature,
        topP: config.topP
      });

      conversation = {
        id: `conv_${Date.now()}_${Math.random()}`,
        prompt_id: prompt.id,
        prompt_version: promptVersion,
        model: config.model,
        type: 'auto_eval',
        messages: [
          { role: 'user', content: entry.input || '' },
          { role: 'assistant', content: text }
        ],
        metadata: {
          dataset_ref: entry.id,
          date: new Date().toISOString(),
          status: 'completed',
          turn_count: 1
        }
      };
    } else {
      // Multi-turn: simulate conversation
      const messages: any[] = [
        { role: 'system', content: promptVersionData.config.system_prompt }
      ];

      if (entry.conversation && entry.conversation.length > 0) {
        messages.push({ role: 'user', content: entry.conversation[0].content });
      }

      const { text } = await generateText({
        model: client(config.model),
        messages,
        temperature: config.temperature,
        topP: config.topP
      });

      conversation = {
        id: `conv_${Date.now()}_${Math.random()}`,
        prompt_id: prompt.id,
        prompt_version: promptVersion,
        model: config.model,
        type: 'auto_eval',
        messages: [
          { role: 'user', content: entry.conversation?.[0]?.content || '' },
          { role: 'assistant', content: text }
        ],
        metadata: {
          dataset_ref: entry.id,
          date: new Date().toISOString(),
          status: 'completed',
          turn_count: entry.conversation?.length || 1,
          simulated_user: true
        }
      };
    }

    return conversation;
  }

  private async evaluateConversation(
    conversation: Conversation,
    entry: DatasetEntry,
    config: EvaluationConfig
  ): Promise<EvalResult> {
    const apiKey = await this.getApiKey(config.provider);
    const client = this.getAIClient(config.provider, apiKey);
    
    const evalModelToUse = config.evaluatorModel || config.model;
    const conversationText = conversation.messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n');

    const evalPromptText = config.evaluatorPrompt
      .replace('{conversation}', conversationText)
      .replace('{expected_outcome}', (entry as any).expected_behavior || (entry as any).user_behavior?.goal || 'Complete the task successfully');

    const { text: evalText } = await generateText({
      model: client(evalModelToUse),
      prompt: evalPromptText,
      temperature: 0.3
    });

    // Parse evaluation result
    let metrics: Record<string, number> = {};
    let reason = evalText;

    try {
      const jsonMatch = evalText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        metrics = {
          task_completion: parsed.task_completion || parsed.task_success || 0,
          tone: parsed.tone || parsed.empathy || 0,
          clarity: parsed.clarity || parsed.relevance || 0,
          overall: parsed.overall || 0
        };
        reason = parsed.reason || evalText;
      }
    } catch (e) {
      console.error('Failed to parse eval result:', e);
    }

    const evalResult: EvalResult = {
      id: `eval_${Date.now()}_${Math.random()}`,
      conversation_id: conversation.id,
      prompt_id: conversation.prompt_id,
      dataset_entry_id: entry.id,
      eval_type: entry.type,
      metrics,
      reason,
      timestamp: new Date().toISOString(),
      cost: {
        eval_tokens: 100,
        cost_estimate: 0.001
      }
    };

    return evalResult;
  }

  async runEvaluation(
    selectedDatasets: Dataset[],
    prompt: Prompt,
    promptVersion: string,
    config: EvaluationConfig,
    onProgress?: (progress: EvaluationProgress) => void
  ): Promise<EvaluationResult> {
    try {
      // Combine all entries from selected datasets
      const allEntries = selectedDatasets.flatMap(dataset => 
        dataset.entries.map(entry => ({ ...entry, datasetId: dataset.id, datasetName: dataset.name }))
      );
      const totalEntries = allEntries.length;

      const results: EvalResult[] = [];

      for (let i = 0; i < allEntries.length; i++) {
        const entry = allEntries[i];
        
        // Update progress
        onProgress?.({
          current: i + 1,
          total: totalEntries,
          currentEntry: `Processing entry ${i + 1}/${totalEntries} from ${entry.datasetName}: ${entry.title || entry.input?.substring(0, 50) || 'Untitled'}`,
          progress: ((i + 1) / totalEntries) * 100
        });

        try {
          // Step 1: Generate conversation
          const conversation = await this.generateConversation(entry, prompt, promptVersion, config);
          await db.conversations.add(conversation);

          // Step 2: Evaluate the conversation
          const evalResult = await this.evaluateConversation(conversation, entry, config);
          await db.eval_results.add(evalResult);
          
          results.push(evalResult);
        } catch (error) {
          console.error(`Failed to process entry ${entry.id}:`, error);
          // Continue with other entries
        }
      }

      return {
        success: true,
        results
      };
    } catch (error) {
      return {
        success: false,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const evaluationService = new EvaluationService();

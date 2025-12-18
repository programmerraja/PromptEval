/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    db,
    DatasetEntry,
    Conversation,
    ConversationMessage,
    EvalResult,
    PromptVersion,
    EvaluationPrompt,
    Settings,
} from "@/lib/db";
import { generateObject, generateText, tool } from "ai";
import { getAIClient, LLMConfig } from "@/lib/ai-utils";
import { z } from "zod";

export class EvaluationService {
    private async createConversationRecord(
        promptId: string,
        promptVersionId: string,
        model: string,
        datasetEntryId: string,
        messages: ConversationMessage[],
        type: "single-turn" | "multi-turn",
        isSimulation: boolean
    ): Promise<Conversation> {
        const conversation: Conversation = {
            id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            prompt_id: promptId,
            prompt_version: promptVersionId,
            model: model,
            type: "auto_eval",
            messages: messages,
            metadata: {
                dataset_ref: datasetEntryId,
                date: new Date().toISOString(),
                status: "completed",
                turn_count: messages.length,
                simulated_user: isSimulation,
            },
        };
        await db.conversations.add(conversation);
        return conversation;
    }

    async runSingleTurn(
        entry: DatasetEntry,
        systemPrompt: string,
        config: LLMConfig,
        settings: Settings | null
    ): Promise<ConversationMessage[]> {
        const client = getAIClient(config, settings);

        // For single turn, input is from dataset entry
        const input = entry.input || "";

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: input },
        ] as any;

        const { text } = await generateText({
            model: client(config.model),
            messages,
            temperature: config.temperature,
        });

        return [
            { role: "user", content: input },
            { role: "assistant", content: text },
        ];
    }

    async runMultiTurnSimulation(
        entry: DatasetEntry,
        assistantSystemPrompt: string,
        assistantConfig: LLMConfig,
        userConfig: LLMConfig,
        settings: Settings | null,
        maxTurns: number = 10
    ): Promise<ConversationMessage[]> {
        const messages: ConversationMessage[] = [];

        // If dataset has a conversation starter or input, use it?
        // Usually multi-turn datasets might start with a User message.
        let currentSpeaker: "assistant" | "user" = "user"; // Default start

        // Check if we have an extracted user prompt
        const userSystemPrompt =
            entry.extractedPrompt ||
            entry.prompt ||
            entry.input ||
            "You are a simulated user.";

        // Initial message handling could be complex, for now assume purely generative loop start
        // or if entry.conversation has items, maybe use the first one as seed?
        // Let's stick to the generated loop for consistency with the "Simulator" feature.

        let turns = 0;
        while (turns < maxTurns * 2) {
            const config =
                currentSpeaker === "assistant" ? assistantConfig : userConfig;
            const systemPrompt =
                currentSpeaker === "assistant"
                    ? assistantSystemPrompt
                    : userSystemPrompt;
            const client = getAIClient(config, settings);

            // Map roles for the simulator perspective
            // If I am the User Simulator, I see 'assistant' messages as 'user' (inputs to me)
            const contextMessages = [
                { role: "system", content: systemPrompt },
                ...messages.map((m) => ({
                    role:
                        currentSpeaker === "assistant"
                            ? m.role
                            : m.role === "assistant"
                                ? "user"
                                : "assistant",
                    content: m.content,
                })),
            ] as any;

            try {
                const { text } = await generateText({
                    model: client(config.model),
                    messages: contextMessages,
                    temperature: config.temperature,
                });

                // Check end condition
                if (this.checkForEnd(text)) {
                    // Don't add [END] token if possible, or just add the final text?
                    // Usually we add the text.
                    messages.push({ role: currentSpeaker, content: text });
                    break;
                }

                messages.push({ role: currentSpeaker, content: text });

                // Switch turn
                currentSpeaker = currentSpeaker === "assistant" ? "user" : "assistant";
                turns++;
            } catch (e) {
                console.error("Simulation generation failed", e);
                break;
            }
        }

        return messages;
    }

    private checkForEnd(content: string): boolean {
        const endPatterns = [
            /\[END\]/i,
            /\bEND\b$/i,
            /conversation.*complete/i,
            /nothing.*more.*discuss/i,
        ];
        return endPatterns.some((pattern) => pattern.test(content));
    }

    async evaluateConversation(
        conversation: Conversation,
        entry: DatasetEntry,
        evalPrompt: EvaluationPrompt,
        evalConfig: LLMConfig,
        settings: Settings | null,
        metadata?: { provider?: string; model?: string }
    ): Promise<EvalResult> {
        const client = getAIClient(evalConfig, settings);

        // 1. Prepare Eval Prompt
        const conversationText = conversation.messages
            .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
            .join("\n\n");

        const expectedBehavior = entry.expected_behavior
            ? `\nExpected Behavior/Reference:\n${entry.expected_behavior}`
            : "";

        const context = `
    Dataset Context / Input:
    ${entry.input || entry.prompt || "N/A"}
    ${expectedBehavior}
 
    Conversation to Evaluate:
    -----------------------------------
    ${conversationText}
    -----------------------------------
    `;

        // User defined instructions become the System Prompt
        const systemInstruction = evalPrompt.prompt;

        let metrics: Record<string, any> = {};

        // 2. Call Judge using Structured Output if valid schema exists
        if (evalPrompt.schema && Object.keys(evalPrompt.schema).length > 0) {
            // Build dynamic Zod Schema
            const shape: Record<string, any> = {};

            for (const [key, typeVal] of Object.entries(evalPrompt.schema)) {
                const type = String(typeVal);
                if (type === "number") {
                    shape[key] = z.number().describe(`Score for ${key}`);
                } else if (type === "boolean") {
                    shape[key] = z.boolean().describe(`True if ${key} is met`);
                } else if (type.startsWith("enum:")) {
                    const options = type
                        .replace("enum:", "")
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                    if (options.length > 0) {
                        shape[key] = z
                            .enum(options as [string, ...string[]])
                            .describe(`One of: ${options.join(", ")}`);
                    } else {
                        shape[key] = z.string().describe(`Value for ${key}`);
                    }
                } else {
                    shape[key] = z.string().describe(`Analysis/Value for ${key}`);
                }
            }


            const dynamicSchema = z.object(shape);

            try {
                const result = await generateObject({
                    model: client(evalConfig.model),
                    prompt: context,
                    system: systemInstruction,
                    schema: dynamicSchema,
                });

                metrics = result.object;
            } catch (e) {
                console.error("Tool-based generation failed, falling back to text", e);

                // Fallback Logic:
                const { text: evalOutput } = await generateText({
                    model: client(evalConfig.model),
                    messages: [
                        { role: "system", content: systemInstruction },
                        { role: "user", content: context + "\n\nOutput valid JSON only." },
                    ],
                    temperature: 0,
                });

                // Try parse
                const jsonMatch = evalOutput.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        metrics = JSON.parse(jsonMatch[0]);
                    } catch {
                        metrics = { error: "Failed to parse JSON fallback" };
                    }
                }
            }
        } else {
            // Unstructured / Text generation
            const { text: evalOutput } = await generateText({
                model: client(evalConfig.model),
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: context },
                ],
                temperature: 0,
            });

            const jsonMatch = evalOutput.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    metrics = JSON.parse(jsonMatch[0]);
                } catch (e) {
                    metrics = { error: "Failed to parse JSON" };
                }
            }
        }

        // 4. Save Eval Result
        const evalResult: EvalResult = {
            id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            conversation_id: conversation.id,
            prompt_id: conversation.prompt_id,
            dataset_entry_id: entry.id,
            eval_type: entry.type,
            metrics: metrics,
            timestamp: new Date().toISOString(),
            provider: metadata?.provider,
            model: metadata?.model,
        };

        await db.eval_results.add(evalResult);

        return evalResult;
    }

    async deleteEvaluationResult(id: string): Promise<void> {
        await db.eval_results.delete(id);
    }
}

export const evaluationService = new EvaluationService();

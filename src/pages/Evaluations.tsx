
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Play, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import {
  db,
  Dataset,
  Prompt,
  EvalResult,
  Conversation,
  EvaluationPrompt,
  Settings as AppSettings,
} from "@/lib/db";
import { toast } from "@/hooks/use-toast";
import EvaluationPromptManager from "@/components/EvaluationPromptManager";
import { ModelConfiguration } from "@/components/ModelConfig";
import SingleTurnEvaluation from "@/components/SingleTurnEvaluation";
import { EvaluationResults } from "@/components/EvaluationResults";
import { evaluationService } from "@/services/EvaluationService";

const Evaluations = () => {
  const [activeTab, setActiveTab] = useState("single-turn-eval");
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [evalResults, setEvalResults] = useState<EvalResult[]>([]);
  const [customEvalPrompts, setCustomEvalPrompts] = useState<
    EvaluationPrompt[]
  >([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showPromptManager, setShowPromptManager] = useState(false);

  // Config state
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [assistantConfig, setAssistantConfig] = useState<ModelConfiguration>({
    model: "models/gemini-flash-latest",
    provider: "google",
    temperature: 0.7,
    maxTokens: 500,
    topP: 0.9,
  });

  // Evaluator Prompt State
  const [evaluatorPrompt, setEvaluatorPrompt] = useState<string>("");
  const [selectedCustomPrompt, setSelectedCustomPrompt] = useState<string>("");

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentEntry, setCurrentEntry] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPrompt && selectedVersion) {
      const prompt = prompts.find(p => p.id === selectedPrompt);
      const version = prompt?.versions[selectedVersion];
      // Only update if we haven't manually touched it? 
      // Or always sync with selected version defaults?
      // User asked: "when we refresh it reset to old so fix that". 
      // This implies we should be able to persist changes or load correctly.
      // For now, loading from Prompt Version defaults is correct behavior when switching prompts.
      // The fix for persistence is in Prompts.tsx, not here. Here we just load what's in DB.
      if (version?.config) {
        setAssistantConfig({
          model: version.config.model || "models/gemini-flash-latest",
          provider: version.config.provider || "google",
          temperature: version.config.temperature || 0.7,
          maxTokens: version.config.max_tokens || 500,
          topP: version.config.top_p || 0.9,
        });
      }
    }
  }, [selectedPrompt, selectedVersion, prompts]);


  const loadData = async () => {
    const datasetsData = await db.datasets.toArray();
    const promptsData = await db.prompts.toArray();
    const resultsData = await db.eval_results.toArray();
    const customPromptsData = await db.evaluation_prompts.toArray();
    const settingsData = await db.settings.get("default");

    setDatasets(datasetsData);
    setPrompts(promptsData);
    setEvalResults(resultsData);
    setCustomEvalPrompts(customPromptsData);
    setSettings(settingsData);

    // Set default evaluation prompt from settings if not set
    if (!evaluatorPrompt && settingsData?.default_evaluation_prompt) {
      setEvaluatorPrompt(settingsData.default_evaluation_prompt);
    }
  };

  const getSelectedPrompt = () => {
    return prompts.find((p) => p.id === selectedPrompt);
  };

  const getSelectedDatasets = () => {
    return datasets.filter((d) => selectedDatasets.includes(d.id));
  };

  const runEvaluation = async () => {
    // Validation
    if (selectedDatasets.length === 0 || !selectedPrompt || !selectedVersion) {
      toast({
        title: "Configuration incomplete",
        description: "Please select at least one dataset, prompt, and version.",
        variant: "destructive",
      });
      return;
    }

    const settings = await db.settings.get("default");
    const selectedDatasetsList = getSelectedDatasets();
    const prompt = getSelectedPrompt();

    if (selectedDatasetsList.length === 0 || !prompt) return;

    const promptVersion = prompt.versions[selectedVersion];
    if (!promptVersion) return;

    setIsRunning(true);
    setProgress(0);
    setError("");
    // We stay on the config tab to show progress since we moved progress there?
    // User asked to move model config. The progress bar is also in SingleTurnEvaluation now.
    // So we don't need to switch tabs to "run" (which was separate).
    // But we still have a "Results" tab to switch to after.

    const assistantServiceConfig = {
      provider: assistantConfig.provider as "openai" | "anthropic" | "google",
      model: assistantConfig.model,
      temperature: assistantConfig.temperature,
      maxTokens: assistantConfig.maxTokens,
      topP: assistantConfig.topP,
    };

    const userConfig = {
      provider: "google" as const,
      model: "models/gemini-flash-latest",
      temperature: 0.7,
      maxTokens: 2000
    };

    // Hardcoded Evaluator Model for now (Gemini Flash is fast and cheap for judging)
    // Or we could expose this in settings page globally.
    const evalConfig = {
      provider: "google" as const,
      model: "models/gemini-flash-latest",
      temperature: 0.1,
      maxTokens: 2000
    };

    let evalPromptObj: EvaluationPrompt;

    if (selectedCustomPrompt) {
      const found = customEvalPrompts.find(p => p.id === selectedCustomPrompt);
      if (!found) {
        // Fallback if ID is invalid but text exists? 
        // Better to create a temporary object
        if (evaluatorPrompt) {
          evalPromptObj = {
            id: 'temp',
            name: 'Custom',
            prompt: evaluatorPrompt,
            created_at: new Date().toISOString(),
            schema: {}
          };
        } else {
          throw new Error("Selected evaluation prompt not found.");
        }
      } else {
        evalPromptObj = found;
      }
    } else {
      // Loophole: if text is edited but no prompt selected.
      // We create a temporary object wrapping the text.
      evalPromptObj = {
        id: 'adhoc', // This will cause grouping issues if we don't save it. 
        // But for now, we assume user selects a saved prompt or uses default.
        name: 'Ad-hoc Prompt',
        prompt: evaluatorPrompt,
        created_at: new Date().toISOString(),
        schema: {}
      };
    }

    const allEntries = selectedDatasetsList.flatMap((dataset) =>
      dataset.entries.map((entry) => ({
        ...entry,
        datasetId: dataset.id,
        datasetName: dataset.name,
      }))
    );
    const totalEntries = allEntries.length;

    try {
      for (let i = 0; i < allEntries.length; i++) {
        const entry = allEntries[i];
        setCurrentEntry(
          `Processing entry ${i + 1}/${totalEntries} from ${entry.datasetName}: ${entry.title || entry.input?.substring(0, 50) || "Untitled"}`
        );

        let messages: any[] = [];

        if (entry.type === 'single-turn') {
          const systemPrompt = promptVersion.config.system_prompt;
          messages = await evaluationService.runSingleTurn(entry, systemPrompt, assistantServiceConfig, settings || null);
        } else {
          const assistantSystemPrompt = `${promptVersion.config.system_prompt}\n\n${promptVersion.text}`;
          messages = await evaluationService.runMultiTurnSimulation(
            entry,
            assistantSystemPrompt,
            assistantServiceConfig,
            userConfig,
            settings || null
          );
        }

        // Save Conversation Record
        const convId = `conv_${Date.now()}_${i}`;
        const conversation: Conversation = {
          id: convId,
          prompt_id: selectedPrompt,
          prompt_version: selectedVersion,
          model: assistantConfig.model,
          type: "auto_eval",
          messages: messages,
          metadata: {
            dataset_ref: entry.id,
            date: new Date().toISOString(),
            status: "completed",
            turn_count: messages.length,
            simulated_user: entry.type === 'multi-turn'
          }
        };
        await db.conversations.add(conversation);

        // Prepare Snapshot Data
        let snapshotData: EvalResult['snapshot'] = undefined;
        if (entry.type === 'single-turn') {
          snapshotData = {
            system_prompt: promptVersion.config.system_prompt,
            user_input: entry.input,
            assistant_response: messages.find((m: any) => m.role === 'assistant')?.content
          };
        } else {
          snapshotData = {
            system_prompt: `${promptVersion.config.system_prompt}\n\n${promptVersion.text}`, // Full System Context
            messages: messages
          };
        }

        // 2. Evaluate
        await evaluationService.evaluateConversation(
          conversation,
          entry,
          evalPromptObj,
          evalConfig,
          settings || null,
          { provider: assistantConfig.provider, model: assistantConfig.model },
          snapshotData
        );

        setProgress(((i + 1) / totalEntries) * 100);
      }

      await loadData(); // Refresh results

      toast({
        title: "Evaluation complete",
        description: `Evaluated ${totalEntries} entries successfully.`,
      });

      setActiveTab("results");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Evaluation failed");
      toast({
        title: "Evaluation failed",
        description: err.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setProgress(0);
      setCurrentEntry("");
    }
  };


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Evaluations</h1>
          <p className="text-muted-foreground">
            Configure and run prompt evaluations
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="single-turn-eval">Eval Configuration</TabsTrigger>
          <TabsTrigger value="results">Results ({evalResults.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="single-turn-eval" className="space-y-4">
          <SingleTurnEvaluation
            selectedDatasets={selectedDatasets}
            onSelectedDatasetsChange={setSelectedDatasets}
            selectedPrompt={selectedPrompt}
            onSelectedPromptChange={setSelectedPrompt}
            selectedVersion={selectedVersion}
            onSelectedVersionChange={setSelectedVersion}

            assistantConfig={assistantConfig}
            onAssistantConfigChange={setAssistantConfig}

            evaluatorPrompt={evaluatorPrompt}
            onEvaluatorPromptChange={setEvaluatorPrompt}
            selectedCustomPrompt={selectedCustomPrompt}
            onSelectedCustomPromptChange={setSelectedCustomPrompt}

            isRunning={isRunning}
            progress={progress}
            currentEntry={currentEntry}
            error={error}
            onRunEvaluation={runEvaluation}
            prompts={prompts}
          />
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <EvaluationResults
            results={evalResults}
            prompts={prompts}
            evalPrompts={customEvalPrompts}
            onDelete={loadData}
          />
        </TabsContent>
      </Tabs>

      <EvaluationPromptManager
        isOpen={showPromptManager}
        onClose={() => {
          setShowPromptManager(false);
          loadData();
        }}
        onSelectPrompt={(prompt) => {
          setSelectedCustomPrompt(prompt.id);
          setEvaluatorPrompt(prompt.prompt);
          loadData();
        }}
      />
    </div>
  );
};

export default Evaluations;

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, AlertCircle, Settings, FileText, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import EvaluationPromptManager from "@/components/EvaluationPromptManager";
import ModelConfig from "@/components/ModelConfig";
import SingleTurnEvaluation from "@/components/SingleTurnEvaluation";
import { evaluationService } from "@/services/EvaluationService";
import { aggregationService } from "@/services/AggregationService";

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
  const [model, setModel] = useState<string>("models/gemini-flash-latest");
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(500);
  const [topP, setTopP] = useState<number>(0.9);
  const [useCustomEvaluator, setUseCustomEvaluator] = useState<boolean>(false);
  const [evaluatorModel, setEvaluatorModel] = useState<string>("models/gemini-flash-latest");
  const [evaluatorPrompt, setEvaluatorPrompt] = useState<string>("");
  const [selectedCustomPrompt, setSelectedCustomPrompt] = useState<string>("");

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentEntry, setCurrentEntry] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  // Sync config state when prompt version changes
  useEffect(() => {
    if (selectedPrompt && selectedVersion) {
      const prompt = prompts.find(p => p.id === selectedPrompt);
      const version = prompt?.versions[selectedVersion];
      if (version?.config) {
        setModel("models/gemini-flash-latest");
        setTemperature(version.config.temperature || 0.7);
        setMaxTokens(version.config.max_tokens || 500);
        setTopP(version.config.top_p || 0.9);
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

    // Set default evaluation prompt from settings
    if (settingsData?.default_evaluation_prompt) {
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
    const apiKey = settings?.api_keys?.google; // Default check, but service checks per provider

    if (!apiKey && model.includes('gemini')) {
      // Ideally check based on provider, but basic check here
    }

    const selectedDatasetsList = getSelectedDatasets();
    const prompt = getSelectedPrompt();

    if (selectedDatasetsList.length === 0 || !prompt) return;

    const promptVersion = prompt.versions[selectedVersion];
    if (!promptVersion) return;

    setIsRunning(true);
    setProgress(0);
    setError("");
    setActiveTab("run");

    const assistantConfig = {
      provider: "google" as const,
      model: model,
      temperature: temperature,
      maxTokens: maxTokens,
      topP: topP,
      apiKey: apiKey
    };

    const userConfig = {
      provider: "google" as const,
      model: "models/gemini-flash-latest",
      temperature: 0.7,
      maxTokens: 2000
    };

    const evalConfig = {
      provider: "google" as const,
      model: useCustomEvaluator ? evaluatorModel : "models/gemini-flash-latest",
      temperature: 0.1,
      maxTokens: 2000
    };

    let evalPromptObj: EvaluationPrompt;

    if (selectedCustomPrompt) {
      const found = customEvalPrompts.find(p => p.id === selectedCustomPrompt);
      if (!found) {
        throw new Error("Selected evaluation prompt not found. Please refresh or select a valid prompt.");
      }
      evalPromptObj = found;
    } else {
      throw new Error("Evaluation Prompt is required. Please select one from the list.");
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
          `Processing entry ${i + 1}/${totalEntries} from ${entry.datasetName}: ${entry.title || entry.input?.substring(0, 50) || "Untitled"
          }`
        );

        // 1. Run Conversation (Single or Multi Turn)
        let messages: any[] = [];

        if (entry.type === 'single-turn') {
          const systemPrompt = promptVersion.config.system_prompt;
          messages = await evaluationService.runSingleTurn(entry, systemPrompt, assistantConfig);
        } else {
          const assistantSystemPrompt = `${promptVersion.config.system_prompt}\n\n${promptVersion.text}`;
          messages = await evaluationService.runMultiTurnSimulation(
            entry,
            assistantSystemPrompt,
            assistantConfig,
            userConfig
          );
        }

        // Save Conversation Record
        const convId = `conv_${Date.now()}_${i}`;
        const conversation: Conversation = {
          id: convId,
          prompt_id: selectedPrompt,
          prompt_version: selectedVersion,
          model: model,
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

        // 2. Evaluate
        await evaluationService.evaluateConversation(conversation, entry, evalPromptObj, evalConfig);

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

  const handleDeleteResult = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this evaluation result?")) {
      try {
        await evaluationService.deleteEvaluationResult(id);
        toast({
          title: "Deleted",
          description: "Evaluation result deleted successfully.",
        });
        loadData(); // Refresh the list
      } catch (error) {
        console.error("Failed to delete result:", error);
        toast({
          title: "Error",
          description: "Failed to delete evaluation result.",
          variant: "destructive",
        });
      }
    }
  };

  const renderResultsTab = () => {
    if (evalResults.length === 0) {
      return <div className="text-center py-12 text-muted-foreground">No evaluation results yet</div>;
    }

    // Dynamic Table Logic
    const latestResults = evalResults.slice().reverse();
    const allKeys = new Set<string>();
    latestResults.slice(0, 20).forEach(r => Object.keys(r.metrics).forEach(k => allKeys.add(k)));
    const metricKeys = Array.from(allKeys);

    // Aggregation Logic (Simple Layer 1 Overview)
    const aggregation = aggregationService.aggregate(latestResults);

    return (
      <div className="space-y-6">
        {/* Layer 1: Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Runs</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{aggregation.totalRuns}</div></CardContent>
          </Card>
          {/* Dynamically show top metric avgs if numeric */}
          {Object.entries(aggregation.metrics).slice(0, 3).map(([key, metric]) => (
            metric.type === 'number' && metric.stats ? (
              <Card key={key}>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')} (Avg)</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{metric.stats.avg?.toFixed(1)}</div></CardContent>
              </Card>
            ) : null
          ))}
        </div>

        {/* Layer 4: Raw Detail */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Results</CardTitle>
            <CardDescription>View and analyze evaluation outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prompt</TableHead>
                    <TableHead className="w-[200px]">Dataset Entry</TableHead>
                    {metricKeys.map(key => (
                      <TableHead key={key} className="capitalize">{key.replace(/_/g, ' ')}</TableHead>
                    ))}
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>
                        {prompts.find((p) => p.id === result.prompt_id)?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[200px]" title={result.dataset_entry_id}>
                        {result.dataset_entry_id}
                      </TableCell>
                      {metricKeys.map(key => (
                        <TableCell key={key}>
                          {typeof result.metrics[key] === 'number'
                            ? result.metrics[key].toFixed(1)
                            : String(result.metrics[key] || '-')}
                        </TableCell>
                      ))}
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteResult(result.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
        <Button onClick={runEvaluation} disabled={isRunning}>
          <Play className="h-4 w-4 mr-2" />
          {isRunning ? "Running..." : "Run Evaluation"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="single-turn-eval">Eval Configuration</TabsTrigger>
          <TabsTrigger value="model-config">Model Config</TabsTrigger>
          <TabsTrigger value="prompt-management">Prompt Management</TabsTrigger>
          <TabsTrigger value="run">Run Progress</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="single-turn-eval" className="space-y-4">
          <SingleTurnEvaluation
            selectedDatasets={selectedDatasets}
            onSelectedDatasetsChange={setSelectedDatasets}
            selectedPrompt={selectedPrompt}
            onSelectedPromptChange={setSelectedPrompt}
            selectedVersion={selectedVersion}
            onSelectedVersionChange={setSelectedVersion}
            model={model}
            temperature={temperature}
            maxTokens={maxTokens}
            topP={topP}
            useCustomEvaluator={useCustomEvaluator}
            onUseCustomEvaluatorChange={setUseCustomEvaluator}
            evaluatorModel={evaluatorModel}
            onEvaluatorModelChange={setEvaluatorModel}
            evaluatorPrompt={evaluatorPrompt}
            onEvaluatorPromptChange={setEvaluatorPrompt}
            selectedCustomPrompt={selectedCustomPrompt}
            onSelectedCustomPromptChange={setSelectedCustomPrompt}
            isRunning={isRunning}
            progress={progress}
            currentEntry={currentEntry}
            error={error}
            onRunEvaluation={runEvaluation}
            evalResults={evalResults}
            prompts={prompts}
          />
        </TabsContent>

        <TabsContent value="model-config" className="space-y-4">
          <ModelConfig
            model={model}
            temperature={temperature}
            maxTokens={maxTokens}
            topP={topP}
            onModelChange={setModel}
            onTemperatureChange={setTemperature}
            onMaxTokensChange={setMaxTokens}
            onTopPChange={setTopP}
            onProviderChange={() => { }}
            showProvider={true}
            provider="google"
            title="Model Parameters"
            description="Configure the model settings for evaluation"
          />
        </TabsContent>

        <TabsContent value="prompt-management" className="space-y-4">
          {/* Reusing existing logic but wrapping properly if needed or just use the card content */}
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Prompt Management</CardTitle>
              <CardDescription>
                Manage evaluation prompts used for scoring conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Evaluation Prompts</h3>
                  <Button onClick={() => setShowPromptManager(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Manage Evaluation Prompts
                  </Button>
                </div>

                <div className="grid gap-4">
                  {customEvalPrompts.map((evalPrompt) => (
                    <div key={evalPrompt.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{evalPrompt.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Created:{" "}
                            {new Date(
                              evalPrompt.created_at
                            ).toLocaleDateString()}
                          </p>
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">Preview:</p>
                            <div className="bg-muted p-2 rounded text-sm font-mono max-h-20 overflow-y-auto">
                              {evalPrompt.prompt.substring(0, 200)}
                              {evalPrompt.prompt.length > 200 && "..."}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCustomPrompt(evalPrompt.id);
                              setEvaluatorPrompt(evalPrompt.prompt);
                              setActiveTab("single-turn-eval");
                            }}
                          >
                            Use for Evaluation
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {customEvalPrompts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No custom evaluation prompts yet</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="run" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Run Evaluation</CardTitle>
              <CardDescription>
                Execute and monitor evaluation progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isRunning && progress === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Click "Run Evaluation" to start
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>

                  {currentEntry && (
                    <p className="text-sm text-muted-foreground">
                      {currentEntry}
                    </p>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {!isRunning && progress === 100 && (
                    <Alert>
                      <AlertDescription>
                        Evaluation completed successfully!
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {renderResultsTab()}
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

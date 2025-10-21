import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, AlertCircle, Settings, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect } from "react";
import { db, Dataset, Prompt, EvalResult, Conversation, EvaluationPrompt, Settings as AppSettings } from "@/lib/db";
import { toast } from "@/hooks/use-toast";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import EvaluationPromptManager from "@/components/EvaluationPromptManager";
import ModelConfig from "@/components/ModelConfig";

const Evaluations = () => {
  const [activeTab, setActiveTab] = useState("single-turn-eval");
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [evalResults, setEvalResults] = useState<EvalResult[]>([]);
  const [customEvalPrompts, setCustomEvalPrompts] = useState<EvaluationPrompt[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showPromptManager, setShowPromptManager] = useState(false);
  
  // Config state
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [model, setModel] = useState<string>("gpt-4o-mini");
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(500);
  const [topP, setTopP] = useState<number>(0.9);
  const [useCustomEvaluator, setUseCustomEvaluator] = useState<boolean>(false);
  const [evaluatorModel, setEvaluatorModel] = useState<string>("gpt-4o-mini");
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

  const loadData = async () => {
    const datasetsData = await db.datasets.toArray();
    const promptsData = await db.prompts.toArray();
    const resultsData = await db.eval_results.toArray();
    const customPromptsData = await db.evaluation_prompts.toArray();
    const settingsData = await db.settings.get('default');
    
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
    return prompts.find(p => p.id === selectedPrompt);
  };

  const getSelectedDataset = () => {
    return datasets.find(d => d.id === selectedDataset);
  };

  const runEvaluation = async () => {
    // Validation
    if (!selectedDataset || !selectedPrompt || !selectedVersion) {
      toast({
        title: "Configuration incomplete",
        description: "Please select dataset, prompt, and version.",
        variant: "destructive"
      });
      return;
    }

    const settings = await db.settings.get('default');
    const apiKey = settings?.api_keys?.openai;

    if (!apiKey) {
      toast({
        title: "API Key required",
        description: "Please add your OpenAI API key in Settings.",
        variant: "destructive"
      });
      return;
    }

    const dataset = getSelectedDataset();
    const prompt = getSelectedPrompt();
    
    if (!dataset || !prompt) return;

    const promptVersion = prompt.versions[selectedVersion];
    if (!promptVersion) return;

    setIsRunning(true);
    setProgress(0);
    setError("");
    setActiveTab("run");

    const openai = createOpenAI({ apiKey });
    const entries = dataset.entries;
    const totalEntries = entries.length;

    try {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        setCurrentEntry(`Processing entry ${i + 1}/${totalEntries}: ${entry.title || entry.input?.substring(0, 50) || 'Untitled'}`);

        // Step 1: Generate conversation
        let conversation: Conversation;
        
        if (entry.type === 'single-turn') {
          // Single-turn: generate one response
          const { text } = await generateText({
            model: openai(model),
            messages: [
              { role: 'system', content: promptVersion.config.system_prompt },
              { role: 'user', content: entry.input || '' }
            ],
            temperature,
            topP
          });

          conversation = {
            id: `conv_${Date.now()}_${i}`,
            prompt_id: selectedPrompt,
            prompt_version: selectedVersion,
            model,
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
            { role: 'system', content: promptVersion.config.system_prompt }
          ];

          if (entry.conversation && entry.conversation.length > 0) {
            // Use first user message from dataset
            messages.push({ role: 'user', content: entry.conversation[0].content });
          }

          const { text } = await generateText({
            model: openai(model),
            messages,
            temperature,
            topP
          });

          conversation = {
            id: `conv_${Date.now()}_${i}`,
            prompt_id: selectedPrompt,
            prompt_version: selectedVersion,
            model,
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

        // Save conversation
        await db.conversations.add(conversation);

        // Step 2: Evaluate the conversation
        const evalModelToUse = useCustomEvaluator ? evaluatorModel : model;
        const conversationText = conversation.messages
          .map(m => `${m.role}: ${m.content}`)
          .join('\n\n');

        const evalPromptText = evaluatorPrompt
          .replace('{conversation}', conversationText)
          .replace('{expected_outcome}', entry.expected_behavior || entry.user_behavior?.goal || 'Complete the task successfully');

        const { text: evalText } = await generateText({
          model: openai(evalModelToUse),
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

        // Save evaluation result
        const evalResult: EvalResult = {
          id: `eval_${Date.now()}_${i}`,
          conversation_id: conversation.id,
          prompt_id: selectedPrompt,
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

        await db.eval_results.add(evalResult);

        setProgress(((i + 1) / totalEntries) * 100);
      }

      await loadData();
      
      toast({
        title: "Evaluation complete",
        description: `Evaluated ${totalEntries} entries successfully.`
      });

      setActiveTab("results");
    } catch (err: any) {
      setError(err.message || 'Evaluation failed');
      toast({
        title: "Evaluation failed",
        description: err.message || 'An error occurred',
        variant: "destructive"
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
          <h1>Evaluations</h1>
          <p className="text-muted-foreground">Configure and run prompt evaluations</p>
        </div>
        <Button onClick={runEvaluation} disabled={isRunning}>
          <Play className="h-4 w-4 mr-2" />
          {isRunning ? 'Running...' : 'Run Evaluation'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="single-turn-eval">Single Turn Eval</TabsTrigger>
          <TabsTrigger value="model-config">Model Config</TabsTrigger>
          <TabsTrigger value="prompt-management">Prompt Management</TabsTrigger>
          <TabsTrigger value="run">Run</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="single-turn-eval" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Single Turn Evaluation</CardTitle>
              <CardDescription>Configure and run single-turn prompt evaluations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dataset</Label>
                  <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.filter(d => d.type === 'single-turn').map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({d.entries.length} entries)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prompt</Label>
                  <Select value={selectedPrompt} onValueChange={(val) => {
                    setSelectedPrompt(val);
                    const prompt = prompts.find(p => p.id === val);
                    if (prompt) {
                      const versions = Object.keys(prompt.versions);
                      setSelectedVersion(versions[versions.length - 1]);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select prompt" />
                    </SelectTrigger>
                    <SelectContent>
                      {prompts.filter(p => p.type === 'single-turn').map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prompt Version</Label>
                  <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedPrompt && getSelectedPrompt() && 
                        Object.keys(getSelectedPrompt()!.versions).map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="customEval"
                    checked={useCustomEvaluator}
                    onChange={(e) => setUseCustomEvaluator(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="customEval">Use different evaluator model</Label>
                </div>

                {useCustomEvaluator && (
                  <div className="space-y-4 pl-6">
                    <div className="space-y-2">
                      <Label>Evaluator Model</Label>
                      <Input value={evaluatorModel} onChange={(e) => setEvaluatorModel(e.target.value)} />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Evaluation Prompt</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPromptManager(true)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Manage Prompts
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="prompt-source">Prompt Source</Label>
                      <Select 
                        value={selectedCustomPrompt ? "custom" : "default"} 
                        onValueChange={(value) => {
                          if (value === "default") {
                            setSelectedCustomPrompt("");
                            setEvaluatorPrompt(settings?.default_evaluation_prompt || "");
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default Evaluation Prompt</SelectItem>
                          {customEvalPrompts.map((prompt) => (
                            <SelectItem key={prompt.id} value={prompt.id}>
                              {prompt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedCustomPrompt && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground mb-2">
                          Using custom prompt: {customEvalPrompts.find(p => p.id === selectedCustomPrompt)?.name}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const prompt = customEvalPrompts.find(p => p.id === selectedCustomPrompt);
                            if (prompt) {
                              setEvaluatorPrompt(prompt.prompt);
                            }
                          }}
                        >
                          Load Prompt
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <Textarea 
                    value={evaluatorPrompt}
                    onChange={(e) => setEvaluatorPrompt(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                    placeholder="Enter evaluation prompt or select a custom prompt above..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
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
            title="Model Configuration"
            description="Configure model parameters for evaluation"
          />
        </TabsContent>

        <TabsContent value="prompt-management" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Prompt Management</CardTitle>
              <CardDescription>Manage evaluation prompts used for scoring conversations</CardDescription>
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
                            Created: {new Date(evalPrompt.created_at).toLocaleDateString()}
                          </p>
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">Preview:</p>
                            <div className="bg-muted p-2 rounded text-sm font-mono max-h-20 overflow-y-auto">
                              {evalPrompt.prompt.substring(0, 200)}
                              {evalPrompt.prompt.length > 200 && '...'}
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
                              setActiveTab('single-turn-eval');
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
                      <p className="text-sm">Create your first evaluation prompt to get started</p>
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
              <CardDescription>Execute and monitor evaluation progress</CardDescription>
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
                    <p className="text-sm text-muted-foreground">{currentEntry}</p>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {!isRunning && progress === 100 && (
                    <Alert>
                      <AlertDescription>Evaluation completed successfully!</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Results</CardTitle>
              <CardDescription>View and analyze evaluation outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              {evalResults.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No evaluation results yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prompt</TableHead>
                      <TableHead>Dataset Entry</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Tone</TableHead>
                      <TableHead>Clarity</TableHead>
                      <TableHead>Overall</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evalResults.slice().reverse().map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>{prompts.find(p => p.id === result.prompt_id)?.name || 'Unknown'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{result.dataset_entry_id}</TableCell>
                        <TableCell>{result.metrics.task_completion?.toFixed(1) || '-'}</TableCell>
                        <TableCell>{result.metrics.tone?.toFixed(1) || '-'}</TableCell>
                        <TableCell>{result.metrics.clarity?.toFixed(1) || '-'}</TableCell>
                        <TableCell className="font-medium">{result.metrics.overall?.toFixed(1) || '-'}</TableCell>
                        <TableCell>{new Date(result.timestamp).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EvaluationPromptManager
        isOpen={showPromptManager}
        onClose={() => setShowPromptManager(false)}
        onSelectPrompt={(prompt) => {
          setSelectedCustomPrompt(prompt.id);
          setEvaluatorPrompt(prompt.prompt);
        }}
      />
    </div>
  );
};

export default Evaluations;

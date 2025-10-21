import { useState, useEffect } from "react";
import { db, Prompt, PromptVersion, type Settings, Dataset, EvalResult, Conversation } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Save, Copy, Trash2, MoreVertical, X, Play, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Playground from "@/components/Playground";
import VariableEditor from "@/components/VariableEditor";
import ModelConfig from "@/components/ModelConfig";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const Prompts = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("v1");
  const [editingPrompt, setEditingPrompt] = useState({
    name: "",
    description: "",
    type: "single-turn" as "single-turn" | "multi-turn",
    text: "",
    system_prompt: "",
    temperature: 0.7,
    max_tokens: 500,
    top_p: 0.9,
    model: "gpt-4o-mini"
  });
  
  const [settings, setSettings] = useState<Settings | null>(null);
  
  const [extractionPrompt, setExtractionPrompt] = useState("");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const [promptToDelete, setPromptToDelete] = useState<Prompt | null>(null);
  
  const [showVersionDeleteDialog, setShowVersionDeleteDialog] = useState(false);
  
  const [versionToDelete, setVersionToDelete] = useState<{ promptId: string; versionId: string } | null>(null);
  
  // Evaluation state
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [evalResults, setEvalResults] = useState<EvalResult[]>([]);
  const [selectedEvalDataset, setSelectedEvalDataset] = useState<string>("");
  const [selectedEvalVersion, setSelectedEvalVersion] = useState<string>("");
  const [isRunningEval, setIsRunningEval] = useState(false);
  const [evalProgress, setEvalProgress] = useState(0);
  const [currentEvalEntry, setCurrentEvalEntry] = useState("");
  const [evalError, setEvalError] = useState("");
  const [evaluatorPrompt, setEvaluatorPrompt] = useState("");
  const [provider, setProvider] = useState<"openai" | "anthropic" | "google">("openai");
  
  const { toast } = useToast();

  useEffect(() => {
    loadPrompts();
    loadSettings();
    loadDatasets();
    loadEvalResults();
  }, []);

  useEffect(() => {
    if (selectedPrompt) {
      setSelectedEvalVersion(Object.keys(selectedPrompt.versions)[0] || "v1");
      loadEvalResultsForPrompt(selectedPrompt.id);
    }
  }, [selectedPrompt]);

  const loadPrompts = async () => {
    const allPrompts = await db.prompts.toArray();
    setPrompts(allPrompts);
  };

  const loadSettings = async () => {
    try {
      const settingsData = await db.settings.get("default");
      setSettings(settingsData);
      if (settingsData?.global_extraction_prompt) {
        setExtractionPrompt(settingsData.global_extraction_prompt);
      }
      if (settingsData?.default_evaluation_prompt) {
        setEvaluatorPrompt(settingsData.default_evaluation_prompt);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const loadDatasets = async () => {
    const datasetsData = await db.datasets.toArray();
    setDatasets(datasetsData);
  };

  const loadEvalResults = async () => {
    const resultsData = await db.eval_results.toArray();
    setEvalResults(resultsData);
  };

  const loadEvalResultsForPrompt = async (promptId: string) => {
    const resultsData = await db.eval_results.where("prompt_id").equals(promptId).toArray();
    setEvalResults(resultsData);
  };

  const createNewPrompt = async () => {
    const newPrompt: Prompt = {
      id: `prompt_${Date.now()}`,
      name: "New Prompt",
      type: "single-turn",
      description: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      versions: {
        v1: {
          version_id: "v1",
          text: "",
          variables: {},
          config: {
            temperature: 0.7,
            max_tokens: 500,
            top_p: 0.9,
            system_prompt: "",
            model: "gpt-4o-mini"
          },
          created_at: new Date().toISOString()
        }
      }
    };
    await db.prompts.add(newPrompt);
    await loadPrompts();
    setSelectedPrompt(newPrompt);
    setSelectedVersion("v1");
    toast({
      title: "Prompt created",
      description: "New prompt has been created successfully"
    });
  };

  const savePrompt = async () => {
    if (!selectedPrompt) return;

    const version = selectedPrompt.versions[selectedVersion];
    const updatedPrompt = {
      ...selectedPrompt,
      name: editingPrompt.name,
      type: editingPrompt.type,
      description: editingPrompt.description,
      updated_at: new Date().toISOString(),
      versions: {
        ...selectedPrompt.versions,
        [selectedVersion]: {
          ...version,
          text: editingPrompt.text,
          variables: version.variables || {},
          config: {
            temperature: editingPrompt.temperature,
            max_tokens: editingPrompt.max_tokens,
            top_p: editingPrompt.top_p,
            system_prompt: editingPrompt.system_prompt,
            model: editingPrompt.model
          }
        }
      }
    };

    await db.prompts.update(selectedPrompt.id, updatedPrompt);
    await loadPrompts();
    toast({
      title: "Saved",
      description: "Prompt has been saved successfully"
    });
  };

  const selectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setSelectedVersion("v1");
    const version = prompt.versions.v1;
    setEditingPrompt({
      name: prompt.name,
      description: prompt.description || "",
      type: prompt.type || "single-turn",
      text: version.text,
      system_prompt: version.config.system_prompt,
      temperature: version.config.temperature,
      max_tokens: version.config.max_tokens,
      top_p: version.config.top_p,
      model: version.config.model || "gpt-4o-mini"
    });
  };

  const createNewVersion = async () => {
    if (!selectedPrompt) return;

    const versionNumbers = Object.keys(selectedPrompt.versions)
      .map(v => parseInt(v.replace('v', '')))
      .filter(n => !isNaN(n));
    const nextVersionNumber = versionNumbers.length > 0 ? Math.max(...versionNumbers) + 1 : 1;
    const newVersionId = `v${nextVersionNumber}`;

    const newVersion: PromptVersion = {
      version_id: newVersionId,
      text: editingPrompt.text,
      variables: {},
      config: {
        temperature: editingPrompt.temperature,
        max_tokens: editingPrompt.max_tokens,
        top_p: editingPrompt.top_p,
        system_prompt: editingPrompt.system_prompt,
        model: editingPrompt.model
      },
      created_at: new Date().toISOString()
    };

    const updatedPrompt = {
      ...selectedPrompt,
      versions: {
        ...selectedPrompt.versions,
        [newVersionId]: newVersion
      },
      updated_at: new Date().toISOString()
    };

    await db.prompts.update(selectedPrompt.id, updatedPrompt);
    await loadPrompts();
    setSelectedPrompt(updatedPrompt);
    setSelectedVersion(newVersionId);
    
    toast({
      title: "Version created",
      description: `New version ${newVersionId} has been created successfully`
    });
  };

  const deletePrompt = async () => {
    if (!promptToDelete) return;

    await db.prompts.delete(promptToDelete.id);
    await loadPrompts();
    setSelectedPrompt(null);
    setPromptToDelete(null);
    setShowDeleteDialog(false);
    
    toast({
      title: "Prompt deleted",
      description: "Prompt has been deleted successfully"
    });
  };

  const deleteVersion = async () => {
    if (!versionToDelete || !selectedPrompt) return;

    const { promptId, versionId } = versionToDelete;
    const prompt = await db.prompts.get(promptId);
    if (!prompt) return;

    // Don't allow deleting the last version
    if (Object.keys(prompt.versions).length <= 1) {
      toast({
        title: "Cannot delete version",
        description: "Cannot delete the last remaining version",
        variant: "destructive"
      });
      return;
    }

    const updatedVersions = { ...prompt.versions };
    delete updatedVersions[versionId];

    const updatedPrompt = {
      ...prompt,
      versions: updatedVersions,
      updated_at: new Date().toISOString()
    };

    await db.prompts.update(promptId, updatedPrompt);
    await loadPrompts();
    
    // If we deleted the currently selected version, switch to v1
    if (selectedPrompt.id === promptId && selectedVersion === versionId) {
      setSelectedVersion("v1");
      const v1Version = updatedVersions.v1;
      if (v1Version) {
        setEditingPrompt({
          name: updatedPrompt.name,
          description: updatedPrompt.description || "",
          type: updatedPrompt.type || "single-turn",
          text: v1Version.text,
          system_prompt: v1Version.config.system_prompt,
          temperature: v1Version.config.temperature,
          max_tokens: v1Version.config.max_tokens,
          top_p: v1Version.config.top_p,
          model: v1Version.config.model || "gpt-4o-mini"
        });
      }
      setSelectedPrompt(updatedPrompt);
    }

    setVersionToDelete(null);
    setShowVersionDeleteDialog(false);
    
    toast({
      title: "Version deleted",
      description: `Version ${versionId} has been deleted successfully`
    });
  };

  const switchVersion = (versionId: string) => {
    if (!selectedPrompt) return;
    
    const version = selectedPrompt.versions[versionId];
    if (!version) return;

    setSelectedVersion(versionId);
    setEditingPrompt({
      name: selectedPrompt.name,
      description: selectedPrompt.description || "",
      type: selectedPrompt.type || "single-turn",
      text: version.text,
      system_prompt: version.config.system_prompt,
      temperature: version.config.temperature,
      max_tokens: version.config.max_tokens,
      top_p: version.config.top_p,
      model: version.config.model || "gpt-4o-mini"
    });
  };

  const runEvaluation = async () => {
    if (!selectedPrompt || !selectedEvalDataset || !selectedEvalVersion) {
      toast({
        title: "Configuration incomplete",
        description: "Please select dataset and version.",
        variant: "destructive"
      });
      return;
    }

    const settings = await db.settings.get('default');
    let apiKey: string | undefined;
    
    switch (provider) {
      case 'openai':
        apiKey = settings?.api_keys?.openai;
        break;
      case 'anthropic':
        apiKey = settings?.api_keys?.anthropic;
        break;
      case 'google':
        apiKey = settings?.api_keys?.google;
        break;
    }

    if (!apiKey) {
      toast({
        title: "API Key required",
        description: `Please add your ${provider.charAt(0).toUpperCase() + provider.slice(1)} API key in Settings.`,
        variant: "destructive"
      });
      return;
    }

    const dataset = datasets.find(d => d.id === selectedEvalDataset);
    const promptVersion = selectedPrompt.versions[selectedEvalVersion];
    
    if (!dataset || !promptVersion) return;

    setIsRunningEval(true);
    setEvalProgress(0);
    setEvalError("");

    let modelClient: any;
    
    switch (provider) {
      case 'openai':
        modelClient = createOpenAI({ apiKey });
        break;
      case 'anthropic':
        // For now, we'll use OpenAI client for Anthropic models
        // In a real implementation, you'd use the Anthropic SDK
        modelClient = createOpenAI({ apiKey });
        break;
      case 'google':
        // For now, we'll use OpenAI client for Google models
        // In a real implementation, you'd use the Google AI SDK
        modelClient = createOpenAI({ apiKey });
        break;
      default:
        modelClient = createOpenAI({ apiKey });
    }
    
    const entries = dataset.entries;
    const totalEntries = entries.length;

    try {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        setCurrentEvalEntry(`Processing entry ${i + 1}/${totalEntries}: ${entry.title || entry.input?.substring(0, 50) || 'Untitled'}`);

        // Step 1: Generate conversation
        let conversation: Conversation;
        
        if (entry.type === 'single-turn') {
          // Single-turn: generate one response
          const { text } = await generateText({
            model: modelClient(promptVersion.config.model),
            messages: [
              { role: 'system', content: promptVersion.config.system_prompt },
              { role: 'user', content: entry.input || '' }
            ],
            temperature: promptVersion.config.temperature,
            topP: promptVersion.config.top_p
          });

          conversation = {
            id: `conv_${Date.now()}_${i}`,
            prompt_id: selectedPrompt.id,
            prompt_version: selectedEvalVersion,
            model: promptVersion.config.model,
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
            model: modelClient(promptVersion.config.model),
            messages,
            temperature: promptVersion.config.temperature,
            topP: promptVersion.config.top_p
          });

          conversation = {
            id: `conv_${Date.now()}_${i}`,
            prompt_id: selectedPrompt.id,
            prompt_version: selectedEvalVersion,
            model: promptVersion.config.model,
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
        const conversationText = conversation.messages
          .map(m => `${m.role}: ${m.content}`)
          .join('\n\n');

        const evalPromptText = evaluatorPrompt
          .replace('{conversation}', conversationText)
          .replace('{expected_outcome}', entry.expected_behavior || entry.user_behavior?.goal || 'Complete the task successfully');

        const { text: evalText } = await generateText({
          model: modelClient(promptVersion.config.model),
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
          prompt_id: selectedPrompt.id,
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

        setEvalProgress(((i + 1) / totalEntries) * 100);
      }

      await loadEvalResultsForPrompt(selectedPrompt.id);
      
      toast({
        title: "Evaluation complete",
        description: `Evaluated ${totalEntries} entries successfully.`
      });
    } catch (err: any) {
      setEvalError(err.message || 'Evaluation failed');
      toast({
        title: "Evaluation failed",
        description: err.message || 'An error occurred',
        variant: "destructive"
      });
    } finally {
      setIsRunningEval(false);
      setEvalProgress(0);
      setCurrentEvalEntry("");
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      <div className="w-64 border-r border-border">
        <div className="p-4 border-b border-border">
          <Button onClick={createNewPrompt} className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Prompt
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="p-2 space-y-1">
            {prompts.map((prompt) => (
              <div key={prompt.id} className="flex items-center group">
                <Button
                  variant={selectedPrompt?.id === prompt.id ? "secondary" : "ghost"}
                  className="flex-1 justify-start"
                  onClick={() => selectPrompt(prompt)}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{prompt.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {Object.keys(prompt.versions).length} versions
                    </span>
                  </div>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setPromptToDelete(prompt);
                        setShowDeleteDialog(true);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Prompt
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1">
        {!selectedPrompt ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Plus className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Select a prompt or create a new one</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="editor" className="h-full">
            <div className="border-b border-border px-6 py-3">
              <TabsList>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="playground">Playground</TabsTrigger>
                <TabsTrigger value="eval">Eval</TabsTrigger>
                <TabsTrigger value="results">Eval Results</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="editor" className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Input
                    value={editingPrompt.name}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                    className="text-2xl font-bold border-none p-0 h-auto"
                    placeholder="Prompt name"
                  />
                  <Input
                    value={editingPrompt.description}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, description: e.target.value })}
                    className="text-sm text-muted-foreground border-none p-0 h-auto"
                    placeholder="Description"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Prompt Type</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="single-turn"
                        name="prompt-type"
                        value="single-turn"
                        checked={editingPrompt.type === "single-turn"}
                        onChange={(e) => setEditingPrompt({ ...editingPrompt, type: e.target.value as "single-turn" | "multi-turn" })}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="single-turn" className="text-sm font-normal cursor-pointer">
                        Single Turn
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="multi-turn"
                        name="prompt-type"
                        value="multi-turn"
                        checked={editingPrompt.type === "multi-turn"}
                        onChange={(e) => setEditingPrompt({ ...editingPrompt, type: e.target.value as "single-turn" | "multi-turn" })}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="multi-turn" className="text-sm font-normal cursor-pointer">
                        Multi Turn
                      </Label>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {editingPrompt.type === "single-turn" 
                      ? "Single turn prompts generate one response per user input"
                      : "Multi turn prompts support ongoing conversations"
                    }
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={savePrompt} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button onClick={createNewVersion} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Version
                  </Button>
                </div>
              </div>

              {/* Version Management */}
              {selectedPrompt && Object.keys(selectedPrompt.versions).length > 0 && (
                <div className="space-y-2">
                  <Label>Versions</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(selectedPrompt.versions).map((versionId) => (
                      <div key={versionId} className="flex items-center gap-1">
                        <Button
                          variant={selectedVersion === versionId ? "default" : "outline"}
                          size="sm"
                          onClick={() => switchVersion(versionId)}
                        >
                          {versionId}
                        </Button>
                        {Object.keys(selectedPrompt.versions).length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setVersionToDelete({ promptId: selectedPrompt.id, versionId });
                              setShowVersionDeleteDialog(true);
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label>System Prompt</Label>
                  <Textarea
                    value={editingPrompt.system_prompt}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, system_prompt: e.target.value })}
                    placeholder="You are a helpful assistant..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>User Prompt</Label>
                  <Textarea
                    value={editingPrompt.text}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, text: e.target.value })}
                    placeholder="Enter your prompt here..."
                    className="min-h-[200px]"
                  />
                </div>

                <ModelConfig
                  model={editingPrompt.model}
                  temperature={editingPrompt.temperature}
                  maxTokens={editingPrompt.max_tokens}
                  topP={editingPrompt.top_p}
                  onModelChange={(model) => setEditingPrompt({ ...editingPrompt, model })}
                  onTemperatureChange={(temperature) => setEditingPrompt({ ...editingPrompt, temperature })}
                  onMaxTokensChange={(max_tokens) => setEditingPrompt({ ...editingPrompt, max_tokens })}
                  onTopPChange={(top_p) => setEditingPrompt({ ...editingPrompt, top_p })}
                  showProvider={true}
                  provider={provider}
                  onProviderChange={setProvider}
                  title="Model Configuration"
                  description="Model parameters for this prompt"
                />

                <VariableEditor
                  promptText={editingPrompt.text}
                  systemPrompt={editingPrompt.system_prompt}
                  variables={selectedPrompt?.versions[selectedVersion]?.variables || {}}
                  onPromptChange={(text) => setEditingPrompt({ ...editingPrompt, text })}
                  onSystemPromptChange={(system_prompt) => setEditingPrompt({ ...editingPrompt, system_prompt })}
                  onVariablesChange={(variables) => {
                    if (selectedPrompt) {
                      const updatedPrompt = {
                        ...selectedPrompt,
                        versions: {
                          ...selectedPrompt.versions,
                          [selectedVersion]: {
                            ...selectedPrompt.versions[selectedVersion],
                            variables
                          }
                        }
                      };
                      setSelectedPrompt(updatedPrompt);
                    }
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="playground" className="h-full">
              <Playground
                promptText={editingPrompt.text}
                systemPrompt={editingPrompt.system_prompt}
                prompt={selectedPrompt}
                onSaveConversation={async (messages) => {
                  try {
                    // Create a new dataset entry from the conversation
                    const datasetEntry = {
                      id: `entry_${Date.now()}`,
                      type: "multi-turn" as const,
                      title: `Playground Conversation - ${new Date().toLocaleString()}`,
                      conversation: messages,
                      created_at: new Date().toISOString(),
                    };

                    // Find or create a playground dataset
                    let playgroundDataset = await db.datasets.where("name").equals("Playground Conversations").first();
                    
                    if (!playgroundDataset) {
                      playgroundDataset = {
                        id: `dataset_${Date.now()}`,
                        name: "Playground Conversations",
                        type: "multi-turn" as const,
                        description: "Conversations exported from the playground",
                        created_at: new Date().toISOString(),
                        entries: [],
                      };
                      await db.datasets.add(playgroundDataset);
                    }

                    // Add the entry to the dataset
                    playgroundDataset.entries.push(datasetEntry);
                    await db.datasets.update(playgroundDataset.id, {
                      entries: playgroundDataset.entries
                    });

                    toast({
                      title: "Saved",
                      description: "Conversation saved as dataset entry",
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to save conversation",
                      variant: "destructive",
                    });
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="eval" className="p-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Evaluation</CardTitle>
                  <CardDescription>Run evaluations on this prompt using selected datasets</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Dataset</Label>
                      <Select value={selectedEvalDataset} onValueChange={setSelectedEvalDataset}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select dataset" />
                        </SelectTrigger>
                        <SelectContent>
                          {datasets.filter(d => d.type === selectedPrompt?.type).map(d => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name} ({d.entries.length} entries)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Prompt Version</Label>
                      <Select value={selectedEvalVersion} onValueChange={setSelectedEvalVersion}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select version" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPrompt && Object.keys(selectedPrompt.versions).map(v => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Select value={provider} onValueChange={(value) => setProvider(value as "openai" | "anthropic" | "google")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="google">Google</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label>Evaluation Prompt</Label>
                      <Textarea 
                        value={evaluatorPrompt}
                        onChange={(e) => setEvaluatorPrompt(e.target.value)}
                        rows={6}
                        className="font-mono text-sm"
                        placeholder="Enter evaluation prompt..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={runEvaluation} disabled={isRunningEval || !selectedEvalDataset || !selectedEvalVersion}>
                      <Play className="h-4 w-4 mr-2" />
                      {isRunningEval ? 'Running...' : 'Run Evaluation'}
                    </Button>
                  </div>

                  {isRunningEval && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{Math.round(evalProgress)}%</span>
                        </div>
                        <Progress value={evalProgress} />
                      </div>

                      {currentEvalEntry && (
                        <p className="text-sm text-muted-foreground">{currentEvalEntry}</p>
                      )}

                      {evalError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{evalError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

           
            <TabsContent value="results" className="p-6">
              <Card>
                <CardHeader>
                  <CardTitle>Evaluation Results</CardTitle>
                  <CardDescription>Past evaluation scores for this prompt</CardDescription>
                </CardHeader>
                <CardContent>
                  {evalResults.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No evaluations yet
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
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
        )}
      </div>

      {/* Delete Prompt Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{promptToDelete?.name}"? This action cannot be undone.
              All versions and associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deletePrompt} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Version Confirmation Dialog */}
      <AlertDialog open={showVersionDeleteDialog} onOpenChange={setShowVersionDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete version "{versionToDelete?.versionId}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteVersion} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Prompts;

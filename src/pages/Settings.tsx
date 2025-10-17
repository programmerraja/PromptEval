import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Eye, EyeOff, Download, Upload, Trash2, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { db, Prompt, Dataset, Conversation, Evaluation, EvalResult, PlaygroundSession, EvaluationPrompt, ExtractionPrompt, type Settings } from "@/lib/db";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const Settings = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);
  
  const [storageUsage, setStorageUsage] = useState<{
    prompts: number;
    datasets: number;
    conversations: number;
    evaluations: number;
    evalResults: number;
    playgroundSessions: number;
    evaluationPrompts: number;
    extractionPrompts: number;
    settings: number;
    total: number;
  } | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
    calculateStorageUsage();
  }, []);

  const loadSettings = async () => {
    const data = await db.settings.get('default');
    setSettings(data);
  };

  const calculateStorageUsage = async () => {
    try {
      const [
        prompts,
        datasets,
        conversations,
        evaluations,
        evalResults,
        playgroundSessions,
        evaluationPrompts,
        extractionPrompts,
        settings
      ] = await Promise.all([
        db.prompts.count(),
        db.datasets.count(),
        db.conversations.count(),
        db.evaluations.count(),
        db.eval_results.count(),
        db.playground_sessions.count(),
        db.evaluation_prompts.count(),
        db.extraction_prompts.count(),
        db.settings.count()
      ]);

      const total = prompts + datasets + conversations + evaluations + evalResults + 
                   playgroundSessions + evaluationPrompts + extractionPrompts + settings;

      setStorageUsage({
        prompts,
        datasets,
        conversations,
        evaluations,
        evalResults,
        playgroundSessions,
        evaluationPrompts,
        extractionPrompts,
        settings,
        total
      });
    } catch (error) {
      console.error("Failed to calculate storage usage:", error);
      toast({
        title: "Error",
        description: "Failed to calculate storage usage",
        variant: "destructive",
      });
    }
  };

  const saveSettings = async () => {
    if (settings) {
      await db.settings.put(settings);
      toast({
        title: "Settings saved",
        description: "Your settings have been saved successfully.",
      });
    }
  };

  const updateApiKey = (provider: 'openai' | 'anthropic' | 'google', value: string) => {
    setSettings({
      ...settings,
      api_keys: {
        ...settings?.api_keys,
        [provider]: value
      }
    });
  };

  const exportAllData = async () => {
    setIsExporting(true);
    try {
      const [
        prompts,
        datasets,
        conversations,
        evaluations,
        evalResults,
        playgroundSessions,
        evaluationPrompts,
        extractionPrompts,
        settings
      ] = await Promise.all([
        db.prompts.toArray(),
        db.datasets.toArray(),
        db.conversations.toArray(),
        db.evaluations.toArray(),
        db.eval_results.toArray(),
        db.playground_sessions.toArray(),
        db.evaluation_prompts.toArray(),
        db.extraction_prompts.toArray(),
        db.settings.toArray()
      ]);

      const exportData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        data: {
          prompts,
          datasets,
          conversations,
          evaluations,
          evalResults,
          playgroundSessions,
          evaluationPrompts,
          extractionPrompts,
          settings
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompteval-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "All data has been exported successfully",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.data || !importData.version) {
        throw new Error("Invalid export file format");
      }

      // Clear existing data
      await db.prompts.clear();
      await db.datasets.clear();
      await db.conversations.clear();
      await db.evaluations.clear();
      await db.eval_results.clear();
      await db.playground_sessions.clear();
      await db.evaluation_prompts.clear();
      await db.extraction_prompts.clear();
      await db.settings.clear();

      // Import new data
      if (importData.data.prompts?.length) await db.prompts.bulkAdd(importData.data.prompts);
      if (importData.data.datasets?.length) await db.datasets.bulkAdd(importData.data.datasets);
      if (importData.data.conversations?.length) await db.conversations.bulkAdd(importData.data.conversations);
      if (importData.data.evaluations?.length) await db.evaluations.bulkAdd(importData.data.evaluations);
      if (importData.data.evalResults?.length) await db.eval_results.bulkAdd(importData.data.evalResults);
      if (importData.data.playgroundSessions?.length) await db.playground_sessions.bulkAdd(importData.data.playgroundSessions);
      if (importData.data.evaluationPrompts?.length) await db.evaluation_prompts.bulkAdd(importData.data.evaluationPrompts);
      if (importData.data.extractionPrompts?.length) await db.extraction_prompts.bulkAdd(importData.data.extractionPrompts);
      if (importData.data.settings?.length) await db.settings.bulkAdd(importData.data.settings);

      // Reload settings and storage usage
      await loadSettings();
      await calculateStorageUsage();

      toast({
        title: "Import Successful",
        description: "Data has been imported successfully",
      });
    } catch (error) {
      console.error("Import failed:", error);
      toast({
        title: "Import Failed",
        description: "Failed to import data. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearAllData = async () => {
    try {
      await db.prompts.clear();
      await db.datasets.clear();
      await db.conversations.clear();
      await db.evaluations.clear();
      await db.eval_results.clear();
      await db.playground_sessions.clear();
      await db.evaluation_prompts.clear();
      await db.extraction_prompts.clear();
      await db.settings.clear();

      // Reinitialize settings
      await db.settings.add({
        id: 'default',
        dataset_generator_config: {
          model: 'gpt-4o-mini',
          temperature: 0.5,
          max_tokens: 100,
          top_p: 0.9,
          prompt: "You are analyzing a user–assistant conversation. Extract the following information:\n1. User's communication style (tone, verbosity, emotion)\n2. Conversational goal (task or intent)\n3. Criteria for success (how to know assistant did a good job)\n4. Example dialogue summary\nReturn JSON:"
        },
        default_model: {
          model: 'gpt-4o-mini',
          temperature: 0.5,
          max_tokens: 100,
          top_p: 0.9
        },
        default_evaluation_prompt: "You are an expert evaluator. Please evaluate the following conversation between a user and an AI assistant. Rate the assistant's performance on a scale of 1-5 for each criterion:\n\n1. Task Completion (1-5): How well did the assistant complete the requested task?\n2. Tone and Empathy (1-5): How appropriate and empathetic was the assistant's tone?\n3. Clarity (1-5): How clear and understandable were the assistant's responses?\n4. Overall Quality (1-5): Overall assessment of the assistant's performance\n\nPlease provide your evaluation in JSON format with scores and a brief reason for each criterion:\n\n{\n  \"task_completion\": {\n    \"score\": X,\n    \"reason\": \"...\"\n  },\n  \"tone_empathy\": {\n    \"score\": X,\n    \"reason\": \"...\"\n  },\n  \"clarity\": {\n    \"score\": X,\n    \"reason\": \"...\"\n  },\n  \"overall_quality\": {\n    \"score\": X,\n    \"reason\": \"...\"\n  }\n}",
        global_extraction_prompt: "You are analyzing a multi-turn conversation between a user and an AI assistant. Extract the following information to create a dataset entry:\n\n1. User's input/query\n2. Assistant's response\n3. Conversation context\n4. Key topics discussed\n5. User's communication style\n6. Expected behavior or outcome\n\nPlease format your response as JSON with the following structure:\n\n{\n  \"user_input\": \"...\",\n  \"assistant_response\": \"...\",\n  \"context\": \"...\",\n  \"topics\": [\"...\"],\n  \"user_style\": \"...\",\n  \"expected_behavior\": \"...\"\n}"
      });

      await loadSettings();
      await calculateStorageUsage();

      toast({
        title: "Data Cleared",
        description: "All data has been cleared and settings reset to defaults",
      });
    } catch (error) {
      console.error("Clear data failed:", error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowClearDialog(false);
    }
  };

  if (!settings) return null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>Settings</h1>
        <p className="text-muted-foreground">Configure your PromptEval workspace</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="dataset">Dataset Generator</TabsTrigger>
          <TabsTrigger value="evaluator">Evaluator</TabsTrigger>
          <TabsTrigger value="extraction">Extraction Prompts</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Configure API keys for LLM providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>OpenAI API Key</Label>
                <div className="flex gap-2">
                  <Input 
                    type={showOpenAI ? "text" : "password"}
                    placeholder="sk-..."
                    value={settings.api_keys?.openai || ''}
                    onChange={(e) => updateApiKey('openai', e.target.value)}
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowOpenAI(!showOpenAI)}
                  >
                    {showOpenAI ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Anthropic API Key</Label>
                <div className="flex gap-2">
                  <Input 
                    type={showAnthropic ? "text" : "password"}
                    placeholder="sk-ant-..."
                    value={settings.api_keys?.anthropic || ''}
                    onChange={(e) => updateApiKey('anthropic', e.target.value)}
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowAnthropic(!showAnthropic)}
                  >
                    {showAnthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Google API Key</Label>
                <div className="flex gap-2">
                  <Input 
                    type={showGoogle ? "text" : "password"}
                    placeholder="AIza..."
                    value={settings.api_keys?.google || ''}
                    onChange={(e) => updateApiKey('google', e.target.value)}
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowGoogle(!showGoogle)}
                  >
                    {showGoogle ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button onClick={saveSettings}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dataset" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dataset Generator Config</CardTitle>
              <CardDescription>Configure model for behavior extraction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input 
                    value={settings.dataset_generator_config?.model || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      dataset_generator_config: {
                        ...settings.dataset_generator_config,
                        model: e.target.value
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperature</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={settings.dataset_generator_config?.temperature || 0.5}
                    onChange={(e) => setSettings({
                      ...settings,
                      dataset_generator_config: {
                        ...settings.dataset_generator_config,
                        temperature: parseFloat(e.target.value)
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input 
                    type="number"
                    value={settings.dataset_generator_config?.max_tokens || 100}
                    onChange={(e) => setSettings({
                      ...settings,
                      dataset_generator_config: {
                        ...settings.dataset_generator_config,
                        max_tokens: parseInt(e.target.value)
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Top P</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={settings.dataset_generator_config?.top_p || 0.9}
                    onChange={(e) => setSettings({
                      ...settings,
                      dataset_generator_config: {
                        ...settings.dataset_generator_config,
                        top_p: parseFloat(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>
              <Button onClick={saveSettings}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evaluator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evaluator Settings</CardTitle>
              <CardDescription>Default evaluation models and prompts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Evaluation Model</Label>
                  <Input 
                    value={settings.default_model?.model || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      default_model: {
                        ...settings.default_model,
                        model: e.target.value
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperature</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={settings.default_model?.temperature || 0.5}
                    onChange={(e) => setSettings({
                      ...settings,
                      default_model: {
                        ...settings.default_model,
                        temperature: parseFloat(e.target.value)
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input 
                    type="number"
                    value={settings.default_model?.max_tokens || 100}
                    onChange={(e) => setSettings({
                      ...settings,
                      default_model: {
                        ...settings.default_model,
                        max_tokens: parseInt(e.target.value)
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Top P</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={settings.default_model?.top_p || 0.9}
                    onChange={(e) => setSettings({
                      ...settings,
                      default_model: {
                        ...settings.default_model,
                        top_p: parseFloat(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>
              <Button onClick={saveSettings}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="extraction" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Extraction Prompt</CardTitle>
              <CardDescription>
                Configure the default prompt used to extract dataset entries from multi-turn conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="global-extraction-prompt">Extraction Prompt</Label>
                <textarea
                  id="global-extraction-prompt"
                  value={settings.global_extraction_prompt || ""}
                  onChange={(e) => setSettings({
                    ...settings,
                    global_extraction_prompt: e.target.value
                  })}
                  className="w-full min-h-[200px] p-3 border border-input rounded-md resize-none"
                  placeholder="Enter the prompt used to extract dataset entries from conversations..."
                />
                <p className="text-xs text-muted-foreground">
                  This prompt will be used to analyze multi-turn conversations and extract structured data for dataset entries.
                </p>
              </div>
              <Button onClick={saveSettings}>
                <Save className="h-4 w-4 mr-2" />
                Save Extraction Prompt
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default Evaluation Prompt</CardTitle>
              <CardDescription>
                Configure the default prompt used for evaluating conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default-evaluation-prompt">Evaluation Prompt</Label>
                <textarea
                  id="default-evaluation-prompt"
                  value={settings.default_evaluation_prompt || ""}
                  onChange={(e) => setSettings({
                    ...settings,
                    default_evaluation_prompt: e.target.value
                  })}
                  className="w-full min-h-[200px] p-3 border border-input rounded-md resize-none"
                  placeholder="Enter the default evaluation prompt..."
                />
                <p className="text-xs text-muted-foreground">
                  This prompt will be used as the default for evaluating conversation quality and performance.
                </p>
              </div>
              <Button onClick={saveSettings}>
                <Save className="h-4 w-4 mr-2" />
                Save Evaluation Prompt
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Management</CardTitle>
              <CardDescription>Manage local storage and backups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Storage Usage */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Storage Usage</Label>
                {storageUsage ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm font-medium">Prompts</div>
                      <div className="text-2xl font-bold">{storageUsage.prompts}</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm font-medium">Datasets</div>
                      <div className="text-2xl font-bold">{storageUsage.datasets}</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm font-medium">Conversations</div>
                      <div className="text-2xl font-bold">{storageUsage.conversations}</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm font-medium">Evaluations</div>
                      <div className="text-2xl font-bold">{storageUsage.evaluations}</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm font-medium">Results</div>
                      <div className="text-2xl font-bold">{storageUsage.evalResults}</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm font-medium">Total Records</div>
                      <div className="text-2xl font-bold">{storageUsage.total}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Calculating storage usage...</p>
                )}
              </div>

              {/* Export/Import Actions */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Data Management</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">Export Data</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Download all your data as a JSON file for backup or migration.
                      </p>
                      <Button 
                        onClick={exportAllData} 
                        disabled={isExporting}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {isExporting ? "Exporting..." : "Export All Data"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">Import Data</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Import data from a previously exported JSON file.
                      </p>
                      <div className="space-y-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".json"
                          onChange={importData}
                          className="hidden"
                        />
                        <Button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isImporting}
                          variant="outline"
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isImporting ? "Importing..." : "Import Data"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clear Data */}
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2 text-destructive">Danger Zone</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Permanently delete all data and reset to defaults. This action cannot be undone.
                  </p>
                  <Button 
                    onClick={() => setShowClearDialog(true)}
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Clear Data Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear All Data
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete all your data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All prompts and versions</li>
                <li>All datasets and entries</li>
                <li>All conversations and evaluations</li>
                <li>All custom evaluation and extraction prompts</li>
                <li>All settings (will be reset to defaults)</li>
              </ul>
              <br />
              <strong>This action cannot be undone.</strong> Make sure you have exported your data if you want to keep it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearAllData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Clear All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;

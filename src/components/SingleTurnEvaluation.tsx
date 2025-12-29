
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, FileText, Check, ChevronsUpDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { db, Dataset, Prompt, EvaluationPrompt, Settings as AppSettings } from "@/lib/db";
import EvaluationPromptManager from "@/components/EvaluationPromptManager";
import ModelConfig, { ModelConfiguration } from "@/components/ModelConfig";

interface SingleTurnEvaluationProps {
  // Configuration props
  selectedDatasets: string[];
  onSelectedDatasetsChange: (datasets: string[]) => void;
  selectedPrompt: string;
  onSelectedPromptChange: (prompt: string) => void;
  selectedVersion: string;
  onSelectedVersionChange: (version: string) => void;

  // Model Configuration
  assistantConfig: ModelConfiguration;
  onAssistantConfigChange: (config: ModelConfiguration) => void;

  // Evaluator Logic
  evaluatorPrompt: string;
  onEvaluatorPromptChange: (prompt: string) => void;
  selectedCustomPrompt: string;
  onSelectedCustomPromptChange: (prompt: string) => void;

  // Run state props
  isRunning: boolean;
  progress: number;
  currentEntry: string;
  error: string;
  onRunEvaluation: () => void;

  prompts: Prompt[];
}

const SingleTurnEvaluation = ({
  selectedDatasets,
  onSelectedDatasetsChange,
  selectedPrompt,
  onSelectedPromptChange,
  selectedVersion,
  onSelectedVersionChange,
  assistantConfig,
  onAssistantConfigChange,
  evaluatorPrompt,
  onEvaluatorPromptChange,
  selectedCustomPrompt,
  onSelectedCustomPromptChange,
  isRunning,
  progress,
  currentEntry,
  error,
  onRunEvaluation,
  prompts
}: SingleTurnEvaluationProps) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [customEvalPrompts, setCustomEvalPrompts] = useState<EvaluationPrompt[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showPromptManager, setShowPromptManager] = useState(false);
  const [openDatasetCombo, setOpenDatasetCombo] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const datasetsData = await db.datasets.toArray();
    const customPromptsData = await db.evaluation_prompts.toArray();
    const settingsData = await db.settings.get('default');

    setDatasets(datasetsData);
    setCustomEvalPrompts(customPromptsData);
    setSettings(settingsData);

    // Set default evaluation prompt from settings
    if (settingsData?.default_evaluation_prompt) {
      onEvaluatorPromptChange(settingsData.default_evaluation_prompt);
    }
  };

  const getSelectedPrompt = () => {
    return prompts.find(p => p.id === selectedPrompt);
  };

  const toggleDataset = (datasetId: string) => {
    if (selectedDatasets.includes(datasetId)) {
      onSelectedDatasetsChange(selectedDatasets.filter(id => id !== datasetId));
    } else {
      onSelectedDatasetsChange([...selectedDatasets, datasetId]);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Single Turn Evaluation</CardTitle>
          <CardDescription>Configure and run single-turn prompt evaluations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="space-y-2 flex flex-col">
              <Label>Datasets</Label>
              <Popover open={openDatasetCombo} onOpenChange={setOpenDatasetCombo}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openDatasetCombo} className="justify-between">
                    {selectedDatasets.length > 0
                      ? `${selectedDatasets.length} dataset(s) selected`
                      : "Select datasets..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search dataset..." />
                    <CommandList>
                      <CommandEmpty>No dataset found.</CommandEmpty>
                      <CommandGroup>
                        {datasets.map((dataset) => (
                          <CommandItem
                            key={dataset.id}
                            value={dataset.name}
                            onSelect={() => toggleDataset(dataset.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedDatasets.includes(dataset.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {dataset.name} ({dataset.entries.length} entries)
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

            </div>

            <div className="space-y-2">
              <Label>Prompt</Label>
              <div className="flex gap-2">
                <Select value={selectedPrompt} onValueChange={(val) => {
                  onSelectedPromptChange(val);
                  const prompt = prompts.find(p => p.id === val);
                  if (prompt) {
                    const versions = Object.keys(prompt.versions);
                    onSelectedVersionChange(versions[versions.length - 1]);
                  }
                }}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select prompt" />
                  </SelectTrigger>
                  <SelectContent>
                    {prompts.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedVersion} onValueChange={onSelectedVersionChange}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Version" />
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
          </div>

          {/* Evaluation Prompt Config */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label>Evaluation Logic (Criteria)</Label>
              <Button variant="outline" size="sm" onClick={() => setShowPromptManager(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Manage Criteria
              </Button>
            </div>

            <Select
              value={selectedCustomPrompt || "default"}
              onValueChange={(value) => {
                if (value === "default") {
                  onSelectedCustomPromptChange("");
                  onEvaluatorPromptChange(settings?.default_evaluation_prompt || "");
                } else {
                  const prompt = customEvalPrompts.find(p => p.id === value);
                  if (prompt) {
                    onSelectedCustomPromptChange(prompt.id);
                    onEvaluatorPromptChange(prompt.prompt);
                  }
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select evaluation criteria" />
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
            {evaluatorPrompt && (
              <div className="p-3 bg-muted/50 rounded-md max-h-32 overflow-y-auto text-xs font-mono text-muted-foreground">
                {evaluatorPrompt}
              </div>
            )}
          </div>



        </CardContent>
      </Card>

      {/* Model Configuration Section */}
      <ModelConfig
        config={assistantConfig}
        onConfigChange={onAssistantConfigChange}
        title="System Model Configuration"
        description="Configure the model that will generate the responses to be evaluated."
        className="border-primary/20"
      />

      {/* Run Button Area */}
      <div className="flex flex-col gap-4">
        {isRunning && (
          <div className="space-y-2 p-4 border rounded-lg bg-background">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
            {currentEntry && (
              <p className="text-xs text-muted-foreground truncate">{currentEntry}</p>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Button onClick={onRunEvaluation} disabled={isRunning} size="lg" className="w-full md:w-auto md:self-end">
          <Play className="h-4 w-4 mr-2" />
          {isRunning ? 'Running Evaluation...' : 'Run Evaluation'}
        </Button>
      </div>

      <EvaluationPromptManager
        isOpen={showPromptManager}
        onClose={() => setShowPromptManager(false)}
        onSelectPrompt={(prompt) => {
          onSelectedCustomPromptChange(prompt.id);
          onEvaluatorPromptChange(prompt.prompt);
        }}
      />
    </div>
  );
};

export default SingleTurnEvaluation;

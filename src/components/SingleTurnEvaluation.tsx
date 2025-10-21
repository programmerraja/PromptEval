import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, FileText } from "lucide-react";
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

interface SingleTurnEvaluationProps {
  // Configuration props
  selectedDatasets: string[];
  onSelectedDatasetsChange: (datasets: string[]) => void;
  selectedPrompt: string;
  onSelectedPromptChange: (prompt: string) => void;
  selectedVersion: string;
  onSelectedVersionChange: (version: string) => void;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  useCustomEvaluator: boolean;
  onUseCustomEvaluatorChange: (use: boolean) => void;
  evaluatorModel: string;
  onEvaluatorModelChange: (model: string) => void;
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
  
  // Results props
  evalResults: EvalResult[];
  prompts: Prompt[];
}

const SingleTurnEvaluation = ({
  selectedDatasets,
  onSelectedDatasetsChange,
  selectedPrompt,
  onSelectedPromptChange,
  selectedVersion,
  onSelectedVersionChange,
  model,
  temperature,
  maxTokens,
  topP,
  useCustomEvaluator,
  onUseCustomEvaluatorChange,
  evaluatorModel,
  onEvaluatorModelChange,
  evaluatorPrompt,
  onEvaluatorPromptChange,
  selectedCustomPrompt,
  onSelectedCustomPromptChange,
  isRunning,
  progress,
  currentEntry,
  error,
  onRunEvaluation,
  evalResults,
  prompts
}: SingleTurnEvaluationProps) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [customEvalPrompts, setCustomEvalPrompts] = useState<EvaluationPrompt[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showPromptManager, setShowPromptManager] = useState(false);

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

  const getSelectedDatasets = () => {
    return datasets.filter(d => selectedDatasets.includes(d.id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Single Turn Evaluation</CardTitle>
        <CardDescription>Configure and run single-turn prompt evaluations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Datasets</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
              {datasets.filter(d => d.type === 'single-turn').map(d => (
                <div key={d.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`dataset-${d.id}`}
                    checked={selectedDatasets.includes(d.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectedDatasetsChange([...selectedDatasets, d.id]);
                      } else {
                        onSelectedDatasetsChange(selectedDatasets.filter(id => id !== d.id));
                      }
                    }}
                    className="rounded"
                  />
                  <Label htmlFor={`dataset-${d.id}`} className="text-sm">
                    {d.name} ({d.entries.length} entries)
                  </Label>
                </div>
              ))}
            </div>
            {selectedDatasets.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedDatasets.length} dataset(s) selected
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Prompt</Label>
            <Select value={selectedPrompt} onValueChange={(val) => {
              onSelectedPromptChange(val);
              const prompt = prompts.find(p => p.id === val);
              if (prompt) {
                const versions = Object.keys(prompt.versions);
                onSelectedVersionChange(versions[versions.length - 1]);
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
            <Select value={selectedVersion} onValueChange={onSelectedVersionChange}>
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
              onChange={(e) => onUseCustomEvaluatorChange(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="customEval">Use different evaluator model</Label>
          </div>

          {useCustomEvaluator && (
            <div className="space-y-4 pl-6">
              <div className="space-y-2">
                <Label>Evaluator Model</Label>
                <Input value={evaluatorModel} onChange={(e) => onEvaluatorModelChange(e.target.value)} />
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
                <Label htmlFor="prompt-source">Select Evaluation Prompt</Label>
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
                    <SelectValue placeholder="Select evaluation prompt" />
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
              
              {evaluatorPrompt && (
                <div className="space-y-2">
                  <Label>Selected Prompt Preview</Label>
                  <div className="p-3 bg-muted rounded-md max-h-40 overflow-y-auto">
                    <pre className="text-sm font-mono whitespace-pre-wrap">{evaluatorPrompt}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onRunEvaluation} disabled={isRunning}>
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? 'Running...' : 'Run Evaluation'}
          </Button>
        </div>

        {isRunning && (
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
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {evalResults.length > 0 && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Evaluation Results</h3>
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
          </div>
        )}
      </CardContent>

      <EvaluationPromptManager
        isOpen={showPromptManager}
        onClose={() => setShowPromptManager(false)}
        onSelectPrompt={(prompt) => {
          onSelectedCustomPromptChange(prompt.id);
          onEvaluatorPromptChange(prompt.prompt);
        }}
      />
    </Card>
  );
};

export default SingleTurnEvaluation;

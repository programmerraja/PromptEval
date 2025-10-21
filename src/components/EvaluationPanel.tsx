import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, AlertCircle } from "lucide-react";
import { useEvaluation } from "@/hooks/useEvaluation";
import { EvaluationConfig } from "@/services/evaluationService";
import { Prompt, Dataset, EvalResult } from "@/lib/db";
import SingleTurnEvaluation from "./SingleTurnEvaluation";

interface EvaluationPanelProps {
  selectedPrompt: Prompt | null;
  selectedVersion: string;
  datasets: Dataset[];
  onVersionChange: (versionId: string) => void;
}

const EvaluationPanel = ({
  selectedPrompt,
  selectedVersion,
  datasets,
  onVersionChange
}: EvaluationPanelProps) => {
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [evaluatorPrompt, setEvaluatorPrompt] = useState("");
  const [provider, setProvider] = useState<"openai" | "anthropic" | "google">("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(500);
  const [topP, setTopP] = useState(0.9);
  const [useCustomEvaluator, setUseCustomEvaluator] = useState(false);
  const [evaluatorModel, setEvaluatorModel] = useState("gpt-4o-mini");
  const [selectedCustomPrompt, setSelectedCustomPrompt] = useState("");

  const {
    isRunning,
    progress,
    currentEntry,
    error,
    results,
    runEvaluation,
    clearResults,
    loadResults
  } = useEvaluation();

  useEffect(() => {
    if (selectedPrompt) {
      onVersionChange(Object.keys(selectedPrompt.versions)[0] || "v1");
      loadResults(selectedPrompt.id);
    }
  }, [selectedPrompt, loadResults, onVersionChange]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { db } = await import("@/lib/db");
      const settingsData = await db.settings.get("default");
      if (settingsData?.default_evaluation_prompt) {
        setEvaluatorPrompt(settingsData.default_evaluation_prompt);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const handleRunEvaluation = async () => {
    if (!selectedPrompt) return;

    const config: EvaluationConfig = {
      provider,
      model,
      temperature,
      maxTokens,
      topP,
      evaluatorModel: useCustomEvaluator ? evaluatorModel : undefined,
      evaluatorPrompt
    };

    await runEvaluation(selectedDatasets, selectedPrompt.id, selectedVersion, config);
  };

  if (!selectedPrompt) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p>Select a prompt to run evaluation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {selectedPrompt.type === 'single-turn' ? (
        <SingleTurnEvaluation
          selectedDatasets={selectedDatasets}
          onSelectedDatasetsChange={setSelectedDatasets}
          selectedPrompt={selectedPrompt.id}
          onSelectedPromptChange={() => {}}
          selectedVersion={selectedVersion}
          onSelectedVersionChange={onVersionChange}
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
          onRunEvaluation={handleRunEvaluation}
          evalResults={results}
          prompts={[selectedPrompt]}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Multi-Turn Evaluation</CardTitle>
            <CardDescription>Multi-turn evaluation functionality will be implemented here</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Multi-turn evaluation is not yet implemented.</p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Results</CardTitle>
            <CardDescription>Past evaluation scores for this prompt</CardDescription>
          </CardHeader>
          <CardContent>
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
                {results.slice().reverse().map((result) => (
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EvaluationPanel;

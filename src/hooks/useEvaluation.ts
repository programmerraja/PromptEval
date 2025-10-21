import { useState, useCallback } from 'react';
import { evaluationService, EvaluationConfig, EvaluationProgress, EvaluationResult } from '@/services/evaluationService';
import { db, Dataset, Prompt, EvalResult } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

export interface UseEvaluationState {
  isRunning: boolean;
  progress: number;
  currentEntry: string;
  error: string;
  results: EvalResult[];
}

export interface UseEvaluationActions {
  runEvaluation: (
    selectedDatasets: string[],
    promptId: string,
    promptVersion: string,
    config: EvaluationConfig
  ) => Promise<void>;
  clearResults: () => void;
  loadResults: (promptId: string) => Promise<void>;
}

export function useEvaluation(): UseEvaluationState & UseEvaluationActions {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentEntry, setCurrentEntry] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState<EvalResult[]>([]);
  const { toast } = useToast();

  const runEvaluation = useCallback(async (
    selectedDatasets: string[],
    promptId: string,
    promptVersion: string,
    config: EvaluationConfig
  ) => {
    if (selectedDatasets.length === 0) {
      toast({
        title: "Configuration incomplete",
        description: "Please select at least one dataset.",
        variant: "destructive"
      });
      return;
    }

    if (!promptId || !promptVersion) {
      toast({
        title: "Configuration incomplete",
        description: "Please select a prompt and version.",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setError('');
    setCurrentEntry('');

    try {
      // Load datasets and prompt
      const [datasets, prompt] = await Promise.all([
        db.datasets.where('id').anyOf(selectedDatasets).toArray(),
        db.prompts.get(promptId)
      ]);

      if (!prompt) {
        throw new Error('Prompt not found');
      }

      if (datasets.length === 0) {
        throw new Error('No datasets found');
      }

      // Run evaluation
      const result = await evaluationService.runEvaluation(
        datasets,
        prompt,
        promptVersion,
        config,
        (progressData: EvaluationProgress) => {
          setProgress(progressData.progress);
          setCurrentEntry(progressData.currentEntry);
        }
      );

      if (result.success) {
        setResults(result.results);
        toast({
          title: "Evaluation complete",
          description: `Evaluated ${result.results.length} entries successfully.`
        });
      } else {
        throw new Error(result.error || 'Evaluation failed');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Evaluation failed';
      setError(errorMessage);
      toast({
        title: "Evaluation failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
      setProgress(0);
      setCurrentEntry('');
    }
  }, [toast]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError('');
    setProgress(0);
    setCurrentEntry('');
  }, []);

  const loadResults = useCallback(async (promptId: string) => {
    try {
      const results = await db.eval_results.where('prompt_id').equals(promptId).toArray();
      setResults(results);
    } catch (error) {
      console.error('Failed to load evaluation results:', error);
      toast({
        title: "Error",
        description: "Failed to load evaluation results",
        variant: "destructive"
      });
    }
  }, [toast]);

  return {
    isRunning,
    progress,
    currentEntry,
    error,
    results,
    runEvaluation,
    clearResults,
    loadResults
  };
}

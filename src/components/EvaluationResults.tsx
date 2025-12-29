
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { EvalResult, Prompt, EvaluationPrompt } from "@/lib/db";
import { aggregationService } from "@/services/AggregationService";
import { evaluationService } from "@/services/EvaluationService";
import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";

import { ResultInspector } from "@/components/ResultInspector";

interface EvaluationResultsProps {
    results: EvalResult[];
    prompts: Prompt[];
    evalPrompts: EvaluationPrompt[];
    onDelete: () => void;
}

export const EvaluationResults = ({ results, prompts, evalPrompts, onDelete }: EvaluationResultsProps) => {
    const [selectedEvalPromptId, setSelectedEvalPromptId] = useState<string>("all");
    const [filterPromptId, setFilterPromptId] = useState<string>("all");
    const [filterMinScore, setFilterMinScore] = useState<string>("");
    const [filterMetric, setFilterMetric] = useState<string>("all");

    const [selectedResult, setSelectedResult] = useState<EvalResult | null>(null);

    // Group Unique Evaluation Prompts found in results
    const availableEvalPromptIds = useMemo(() => {
        const ids = new Set(results.map(r => r.evaluation_prompt_id).filter(Boolean));
        return Array.from(ids) as string[];
    }, [results]);

    // Derived State: Current Result Set
    const filteredResults = useMemo(() => {
        let filtered = results.slice().reverse();

        // 1. Filter by Evaluation Type
        if (selectedEvalPromptId !== "all") {
            filtered = filtered.filter(r => r.evaluation_prompt_id === selectedEvalPromptId);
        }

        // 2. Filter by System Prompt
        if (filterPromptId !== "all") {
            filtered = filtered.filter(r => r.prompt_id === filterPromptId);
        }

        // 3. Filter by Metric Score
        if (filterMetric !== "all" && filterMinScore !== "") {
            const minScore = parseFloat(filterMinScore);
            if (!isNaN(minScore)) {
                filtered = filtered.filter(r => {
                    const val = r.metrics[filterMetric];
                    return typeof val === 'number' && val >= minScore;
                });
            }
        }

        return filtered;
    }, [results, selectedEvalPromptId, filterPromptId, filterMetric, filterMinScore]);

    // Derived State: Metrics Schema (Columns)
    const metricKeys = useMemo(() => {
        if (filteredResults.length === 0) return [];
        // If we filtered by specific eval prompt, all schemas should be same.
        // If "all" is selected, we take the superset (or just the first one, but superset is safer for view)
        // However, user requested consistent columns. 
        // If "all" is selected, we might have mixed columns. 
        // Let's rely on the first result for simplicity, or aggregation.
        const keys = new Set<string>();
        // Sample first 10 to get keys? Or just first one?
        // If we are in "Specific Eval Prompt", first one is enough.
        // If "All", we might show mixed bags. 
        filteredResults.forEach(r => Object.keys(r.metrics).forEach(k => keys.add(k)));
        return Array.from(keys);
    }, [filteredResults]);

    // Aggregation
    const aggregation = useMemo(() => {
        return aggregationService.aggregate(filteredResults);
    }, [filteredResults]);

    const handleDeleteResult = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click
        if (window.confirm("Are you sure you want to delete this evaluation result?")) {
            try {
                await evaluationService.deleteEvaluationResult(id);
                toast({
                    title: "Deleted",
                    description: "Evaluation result deleted successfully.",
                });
                onDelete();
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

    const getEvalPromptName = (id?: string) => {
        if (!id) return "Unknown / Legacy";
        const found = evalPrompts.find(ep => ep.id === id);
        return found ? found.name : "Deleted Prompt";
    };

    return (
        <div className="space-y-6">
            {/* Top Controls: Evaluation Type Selector */}
            <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">View Settings</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Evaluation Criteria (Schema)</Label>
                        <Select value={selectedEvalPromptId} onValueChange={setSelectedEvalPromptId}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Evaluation Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Evaluation Types (Mixed View)</SelectItem>
                                {availableEvalPromptIds.map(id => (
                                    <SelectItem key={id} value={id}>
                                        {getEvalPromptName(id)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Select an evaluation type to see consistent columns and detailed stats.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Filter by Prompt (System)</Label>
                        <Select value={filterPromptId} onValueChange={setFilterPromptId}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Prompts" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Prompts</SelectItem>
                                {prompts.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Aggregation (Only show interesting stats) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Runs</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{aggregation.totalRuns}</div></CardContent>
                </Card>

                {/* Render Numeric Averages */}
                {Object.entries(aggregation.metrics).map(([key, metric]) => (
                    metric.type === 'number' && metric.stats ? (
                        <Card key={key}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium capitalize truncate" title={key.replace(/_/g, ' ')}>
                                    {key.replace(/_/g, ' ')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metric.stats.avg?.toFixed(1)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Min: {metric.stats.min} | Max: {metric.stats.max}
                                </p>
                            </CardContent>
                        </Card>
                    ) : null
                ))}

                {/* Render Boolean Distributions */}
                {Object.entries(aggregation.metrics).map(([key, metric]) => (
                    metric.type === 'boolean' && metric.distribution ? (
                        <Card key={key}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium capitalize truncate">{key.replace(/_/g, ' ')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {Object.entries(metric.distribution).map(([val, count]) => (
                                    <div key={val} className="flex justify-between text-sm">
                                        <span className="capitalize">{val}</span>
                                        <span className="font-bold">{String(count)}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ) : null
                ))}
            </div>


            {/* Additional Filter Row */}
            <div className="flex gap-4 items-end">
                <div className="space-y-2 w-[200px]">
                    <Label>Filter by Metric</Label>
                    <Select value={filterMetric} onValueChange={setFilterMetric}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Metric" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Any Metric</SelectItem>
                            {metricKeys.map(k => (
                                <SelectItem key={k} value={k} className="capitalize">{k.replace(/_/g, ' ')}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 w-[150px]">
                    <Label>Min Score</Label>
                    <Input
                        type="number"
                        placeholder="e.g. 3"
                        value={filterMinScore}
                        onChange={(e) => setFilterMinScore(e.target.value)}
                        disabled={filterMetric === "all"}
                    />
                </div>
                <Button variant="ghost" onClick={() => {
                    setFilterPromptId("all");
                    setFilterMetric("all");
                    setFilterMinScore("");
                    setSelectedEvalPromptId("all");
                }}>
                    Reset All
                </Button>
            </div>

            {/* Main Results Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Detailed Results</CardTitle>
                    <CardDescription>
                        Click on a row to view full details (Snapshot, Trace, Reasoning).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">System Prompt</TableHead>
                                    <TableHead className="w-[150px]">Model</TableHead>
                                    <TableHead className="w-[200px]">Dataset Entry</TableHead>
                                    {metricKeys.map(key => (
                                        <TableHead key={key} className="capitalize whitespace-nowrap">{key.replace(/_/g, ' ')}</TableHead>
                                    ))}
                                    <TableHead className="w-[100px]">Date</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredResults.map((result) => (
                                    <TableRow
                                        key={result.id}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => setSelectedResult(result)}
                                    >
                                        <TableCell className="font-medium">
                                            {prompts.find((p) => p.id === result.prompt_id)?.name || "Unknown"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium truncate w-[140px]" title={result.model}>{result.model || "Unknown"}</span>
                                                <span className="text-xs text-muted-foreground">{result.provider || "Unknown"}</span>
                                            </div>
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
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {new Date(result.timestamp).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => handleDeleteResult(result.id, e)}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredResults.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={metricKeys.length + 5} className="text-center h-24 text-muted-foreground">
                                            No results found matching your filters.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Details Slider */}
            <ResultInspector
                open={!!selectedResult}
                result={selectedResult}
                onClose={() => setSelectedResult(null)}
                prompt={prompts.find((p) => p.id === selectedResult?.prompt_id)}
            />
        </div>
    );
};

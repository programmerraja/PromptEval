
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { EvalResult, Prompt } from "@/lib/db";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ResultInspectorProps {
    result: EvalResult | null;
    open: boolean;
    onClose: () => void;
    prompt?: Prompt;
}

const ScoreBadge = ({ score, max = 5 }: { score: number; max?: number }) => {
    let color = "bg-yellow-500";
    const ratio = score / max;
    if (ratio >= 0.8) color = "bg-green-500";
    else if (ratio < 0.5) color = "bg-red-500";

    return (
        <Badge className={cn("text-lg px-3 py-1", color)}>
            {score}/{max}
        </Badge>
    );
};

export const ResultInspector = ({
    result,
    open,
    onClose,
    prompt,
}: ResultInspectorProps) => {
    if (!result) return null;

    // Helper to try and extract a main score for hero section
    // We look for 'overall_quality', 'score', or just the first number found
    const getOverallScore = () => {
        if (result.metrics.overall_quality?.score) return result.metrics.overall_quality.score;
        if (result.metrics.score) return result.metrics.score;
        const firstNumKey = Object.keys(result.metrics).find(
            (k) => typeof result.metrics[k] === "number"
        );
        return firstNumKey ? result.metrics[firstNumKey] : null;
    };

    const overallScore = getOverallScore();
    const systemPrompt = result.snapshot?.system_prompt;
    const userInput = result.snapshot?.user_input;
    const assistantResp = result.snapshot?.assistant_response;
    const messages = result.snapshot?.messages;

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-[850px] sm:max-w-[850px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="font-mono text-xs">
                            {result.id}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            {new Date(result.timestamp).toLocaleString()}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <SheetTitle className="text-2xl font-bold">Evaluation Result</SheetTitle>
                            <Badge variant="secondary">{result.eval_type}</Badge>
                        </div>
                        {overallScore !== null && (
                            <ScoreBadge score={overallScore} />
                        )}
                    </div>
                    <SheetDescription>
                        {prompt?.name || "Unknown Prompt"} • {result.model}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    {/* 1. Critique / Reasoning Section (Hero) */}
                    <Card className="bg-muted/10 border-l-4 border-l-primary">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center">
                                <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
                                Judge's Critique
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm space-y-2">
                                {/* If metrics have 'reason' field, show it. Or show generic reason */}
                                {result.reason && <p className="italic">"{result.reason}"</p>}

                                {/* Detailed metric breakdown */}
                                <div className="grid grid-cols-1 gap-2 mt-4">
                                    {Object.entries(result.metrics).map(([key, val]) => {
                                        if (typeof val === 'object' && val !== null && 'score' in val && 'reason' in val) {
                                            return (
                                                <div key={key} className="text-sm border-b pb-2 last:border-0 border-border/50">
                                                    <div className="flex justify-between font-semibold">
                                                        <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                                                        <span>{val.score}</span>
                                                    </div>
                                                    <p className="text-muted-foreground text-xs mt-1">{val.reason}</p>
                                                </div>
                                            )
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Trace / Context Inspector */}
                    <Tabs defaultValue="trace" className="w-full">
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="trace">Trace & Output</TabsTrigger>
                            <TabsTrigger value="context">System Context</TabsTrigger>
                        </TabsList>

                        {/* Tab: System Context (Inputs) */}
                        <TabsContent value="context" className="space-y-4 mt-4">
                            <div className="space-y-4">
                                <div>
                                    <Label className="mb-2 block">System Prompt (Snapshot)</Label>
                                    <div className="relative group">
                                        <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/30 font-mono text-xs whitespace-pre-wrap transition-all duration-300 group-hover:h-[500px]">
                                            {systemPrompt || "No snapshot available"}
                                        </ScrollArea>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-2 right-2 h-6 w-6"
                                            onClick={() => systemPrompt && navigator.clipboard.writeText(systemPrompt)}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>

                                {userInput && (
                                    <div>
                                        <Label className="mb-2 block">User Input</Label>
                                        <div className="p-3 bg-muted rounded-md text-sm">
                                            {userInput}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* Tab: Trace (Output) */}
                        <TabsContent value="trace" className="mt-4">
                            {result.eval_type === 'single-turn' ? (
                                <div className="space-y-4">
                                    <div>
                                        <Label className="mb-2 block">User Input</Label>
                                        <div className="p-3 bg-secondary/20 border border-secondary/30 rounded-md text-sm">
                                            {userInput || "N/A"}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="mb-2 block">Assistant Response</Label>
                                        <Card>
                                            <CardContent className="p-4 bg-background pt-4">
                                                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                                    {assistantResp || "No response captured"}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <Label className="mb-2 block">Conversation History</Label>
                                    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                                        <div className="space-y-4">
                                            {messages?.map((msg, idx) => (
                                                <div
                                                    key={idx}
                                                    className={cn(
                                                        "flex flex-col gap-1 max-w-[85%]",
                                                        msg.role === 'assistant' ? "ml-auto items-end" : "mr-auto items-start"
                                                    )}
                                                >
                                                    <span className="text-xs text-muted-foreground uppercase">{msg.role}</span>
                                                    <div
                                                        className={cn(
                                                            "p-3 rounded-lg text-sm whitespace-pre-wrap",
                                                            msg.role === 'assistant'
                                                                ? "bg-primary text-primary-foreground"
                                                                : "bg-muted"
                                                        )}
                                                    >
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            ))}
                                            {!messages && <p className="text-muted-foreground text-center">No trace available</p>}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    {/* Metadata Footer */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground pt-4 border-t">
                        <div>
                            <span className="font-semibold block text-foreground">Model</span>
                            {result.model}
                        </div>
                        <div>
                            <span className="font-semibold block text-foreground">Provider</span>
                            {result.provider}
                        </div>
                        <div>
                            <span className="font-semibold block text-foreground">Dataset ID</span>
                            <span className="truncate block" title={result.dataset_entry_id}>{result.dataset_entry_id}</span>
                        </div>
                        <div>
                            <span className="font-semibold block text-foreground">Tokens</span>
                            {/* Placeholder if we don't have exact token counts in snapshot yet */}
                            -
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

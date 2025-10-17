import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Zap, Clock, MessageSquare } from "lucide-react";

interface UsageStats {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  requestCount: number;
  averageLatency: number;
}

interface UsageStatsProps {
  stats: UsageStats;
  className?: string;
}

const UsageStats = ({ stats, className }: UsageStatsProps) => {
  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const formatLatency = (latency: number) => {
    return `${latency.toFixed(0)}ms`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Usage Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Requests</span>
            </div>
            <div className="text-lg font-semibold">{stats.requestCount}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Cost</span>
            </div>
            <div className="text-lg font-semibold">{formatCost(stats.totalCost)}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Token Usage</span>
              <Badge variant="secondary" className="text-xs font-mono">
                {stats.totalTokens.toLocaleString()}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Prompt:</span>
                <span className="font-mono font-medium">{stats.promptTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Completion:</span>
                <span className="font-mono font-medium">{stats.completionTokens.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Average Latency</span>
            </div>
            <div className="text-sm font-mono font-medium">{formatLatency(stats.averageLatency)}</div>
          </div>
        </div>

        {stats.requestCount > 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cost per request:</span>
                <span className="font-mono font-medium">{formatCost(stats.totalCost / stats.requestCount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tokens per request:</span>
                <span className="font-mono font-medium">{Math.round(stats.totalTokens / stats.requestCount)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UsageStats;

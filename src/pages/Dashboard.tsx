import { useEffect, useState } from "react";
import { db, Prompt } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Play, Package, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    const allPrompts = await db.prompts.toArray();
    setPrompts(allPrompts);
  };

  const getVersionCount = (prompt: Prompt) => {
    return Object.keys(prompt.versions || {}).length;
  };

  const getAvgScore = (prompt: Prompt) => {
    const versions = Object.values(prompt.versions || {});
    if (versions.length === 0) return "0";
    const scores = versions.map(v => v.scores?.avg_score || 0);
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

  const getLastEval = (prompt: Prompt) => {
    const versions = Object.values(prompt.versions || {});
    if (versions.length === 0) return "Never";
    const latest = versions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    const days = Math.floor((Date.now() - new Date(latest.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return days === 0 ? "Today" : `${days}d ago`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted-foreground">Overview of your prompt evaluation workspace</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/prompts")} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Prompt
          </Button>
          <Button onClick={() => navigate("/evaluations")} size="sm" variant="outline">
            <Play className="h-4 w-4 mr-2" />
            Run Eval
          </Button>
          <Button size="sm" variant="outline">
            <Package className="h-4 w-4 mr-2" />
            Import Dataset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Prompts</CardDescription>
            <CardTitle className="text-3xl">{prompts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Versions</CardDescription>
            <CardTitle className="text-3xl">
              {prompts.reduce((acc, p) => acc + getVersionCount(p), 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Score</CardDescription>
            <CardTitle className="text-3xl">
              {prompts.length > 0 
                ? ((prompts.reduce((acc, p) => acc + parseFloat(getAvgScore(p)), 0) / prompts.length).toFixed(1))
                : "0.0"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Evaluations</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prompt Summary</CardTitle>
          <CardDescription>Recent prompts and their performance</CardDescription>
        </CardHeader>
        <CardContent>
          {prompts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No prompts yet. Create your first prompt to get started.</p>
              <Button onClick={() => navigate("/prompts")} className="mt-4" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Prompt
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Versions</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead>Best Model</TableHead>
                  <TableHead>Last Eval</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prompts.map((prompt) => (
                  <TableRow key={prompt.id}>
                    <TableCell className="font-medium">{prompt.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getVersionCount(prompt)}</Badge>
                    </TableCell>
                    <TableCell>{getAvgScore(prompt)}</TableCell>
                    <TableCell>gpt-4o-mini</TableCell>
                    <TableCell className="text-muted-foreground">{getLastEval(prompt)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/prompts?id=${prompt.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

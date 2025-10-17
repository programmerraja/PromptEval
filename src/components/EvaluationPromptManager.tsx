import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EvaluationPrompt, db } from "@/lib/db";

interface EvaluationPromptManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt?: (prompt: EvaluationPrompt) => void;
}

const EvaluationPromptManager = ({
  isOpen,
  onClose,
  onSelectPrompt
}: EvaluationPromptManagerProps) => {
  const [prompts, setPrompts] = useState<EvaluationPrompt[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<EvaluationPrompt | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [promptName, setPromptName] = useState("");
  const [promptText, setPromptText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadPrompts();
    }
  }, [isOpen]);

  const loadPrompts = async () => {
    try {
      const allPrompts = await db.evaluation_prompts.toArray();
      setPrompts(allPrompts);
    } catch (error) {
      console.error("Failed to load evaluation prompts:", error);
      toast({
        title: "Error",
        description: "Failed to load evaluation prompts",
        variant: "destructive",
      });
    }
  };

  const handleCreateNew = () => {
    setEditingPrompt(null);
    setPromptName("");
    setPromptText("");
    setShowEditDialog(true);
  };

  const handleEdit = (prompt: EvaluationPrompt) => {
    setEditingPrompt(prompt);
    setPromptName(prompt.name);
    setPromptText(prompt.prompt);
    setShowEditDialog(true);
  };

  const handleSavePrompt = async () => {
    if (!promptName.trim() || !promptText.trim()) {
      toast({
        title: "Error",
        description: "Name and prompt text are required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (editingPrompt) {
        // Update existing prompt
        const updatedPrompt = {
          ...editingPrompt,
          name: promptName.trim(),
          prompt: promptText.trim(),
        };
        await db.evaluation_prompts.update(editingPrompt.id, updatedPrompt);
        setPrompts(prev => prev.map(p => p.id === editingPrompt.id ? updatedPrompt : p));
        
        toast({
          title: "Success",
          description: "Evaluation prompt updated successfully",
        });
      } else {
        // Create new prompt
        const newPrompt: EvaluationPrompt = {
          id: `eval_prompt_${Date.now()}`,
          name: promptName.trim(),
          prompt: promptText.trim(),
          created_at: new Date().toISOString(),
        };
        await db.evaluation_prompts.add(newPrompt);
        setPrompts(prev => [...prev, newPrompt]);
        
        toast({
          title: "Success",
          description: "Evaluation prompt created successfully",
        });
      }

      setShowEditDialog(false);
      setEditingPrompt(null);
      setPromptName("");
      setPromptText("");
    } catch (error) {
      console.error("Failed to save evaluation prompt:", error);
      toast({
        title: "Error",
        description: "Failed to save evaluation prompt",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (prompt: EvaluationPrompt) => {
    try {
      await db.evaluation_prompts.delete(prompt.id);
      setPrompts(prev => prev.filter(p => p.id !== prompt.id));
      
      toast({
        title: "Success",
        description: "Evaluation prompt deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete evaluation prompt:", error);
      toast({
        title: "Error",
        description: "Failed to delete evaluation prompt",
        variant: "destructive",
      });
    }
  };

  const handleSelect = (prompt: EvaluationPrompt) => {
    if (onSelectPrompt) {
      onSelectPrompt(prompt);
    }
    onClose();
  };

  const handleClose = () => {
    setEditingPrompt(null);
    setPromptName("");
    setPromptText("");
    setShowEditDialog(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Evaluation Prompts
            </DialogTitle>
            <DialogDescription>
              Manage custom evaluation prompts for assessing conversation quality
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Custom Evaluation Prompts</h3>
              <Button onClick={handleCreateNew} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Prompt
              </Button>
            </div>

            {prompts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No custom evaluation prompts yet</p>
                <p className="text-sm">Create your first evaluation prompt to get started</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {prompts.map((prompt) => (
                  <Card key={prompt.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{prompt.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Created {new Date(prompt.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {onSelectPrompt && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelect(prompt)}
                            >
                              Select
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(prompt)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(prompt)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Prompt Text</Label>
                        <div className="p-3 bg-muted rounded-md">
                          <p className="text-sm whitespace-pre-wrap">
                            {prompt.prompt.length > 200 
                              ? `${prompt.prompt.substring(0, 200)}...` 
                              : prompt.prompt
                            }
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? "Edit Evaluation Prompt" : "Create Evaluation Prompt"}
            </DialogTitle>
            <DialogDescription>
              {editingPrompt 
                ? "Update the evaluation prompt details"
                : "Create a new custom evaluation prompt"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="prompt-name">Name</Label>
              <Input
                id="prompt-name"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                placeholder="Enter prompt name"
              />
            </div>

            <div>
              <Label htmlFor="prompt-text">Evaluation Prompt</Label>
              <Textarea
                id="prompt-text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Enter the evaluation prompt that will be used to assess conversations..."
                className="min-h-[200px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This prompt should instruct the AI on how to evaluate conversations. 
                It should specify the criteria and output format for evaluation results.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePrompt} disabled={isLoading}>
              {isLoading ? "Saving..." : editingPrompt ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EvaluationPromptManager;

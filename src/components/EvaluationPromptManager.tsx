import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EvaluationPrompt, db } from "@/lib/db";

interface EvaluationPromptManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt?: (prompt: EvaluationPrompt) => void;
}

interface SchemaField {
  key: string;
  type: "string" | "number" | "boolean" | "enum";
  enumOptions: string; // Comma separated string for UI
}

const EvaluationPromptManager = ({
  isOpen,
  onClose,
  onSelectPrompt,
}: EvaluationPromptManagerProps) => {
  const [prompts, setPrompts] = useState<EvaluationPrompt[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<EvaluationPrompt | null>(
    null
  );
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [promptName, setPromptName] = useState("");
  const [promptText, setPromptText] = useState("");
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([]);
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
    setSchemaFields([]);
    setShowEditDialog(true);
  };

  const handleEdit = (prompt: EvaluationPrompt) => {
    setEditingPrompt(prompt);
    setPromptName(prompt.name);
    setPromptText(prompt.prompt);

    // Convert schema object back to array
    const fields: SchemaField[] = [];
    if (prompt.schema) {
      Object.entries(prompt.schema).forEach(([key, value]) => {
        const typeStr = value as string;
        if (typeStr.startsWith("enum:")) {
          const options = typeStr.replace("enum:", "");
          fields.push({ key, type: "enum", enumOptions: options });
        } else {
          fields.push({ key, type: typeStr as any, enumOptions: "" });
        }
      });
    }
    setSchemaFields(fields);
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

    // Convert array back to schema object
    const schemaObj: Record<string, string> = {};
    schemaFields.forEach((field) => {
      if (field.key.trim()) {
        if (field.type === 'enum') {
          // Store enum as "enum:val1,val2" (trimmed)
          const cleanedOptions = field.enumOptions.split(',').map(s => s.trim()).filter(s => s).join(',');
          schemaObj[field.key.trim()] = `enum:${cleanedOptions}`;
        } else {
          schemaObj[field.key.trim()] = field.type;
        }
      }
    });

    try {
      if (editingPrompt) {
        // Update existing prompt
        const updatedPrompt = {
          ...editingPrompt,
          name: promptName.trim(),
          prompt: promptText.trim(),
          schema: schemaObj,
        };
        await db.evaluation_prompts.update(editingPrompt.id, updatedPrompt);
        setPrompts((prev) =>
          prev.map((p) => (p.id === editingPrompt.id ? updatedPrompt : p))
        );

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
          schema: schemaObj,
          created_at: new Date().toISOString(),
        };
        await db.evaluation_prompts.add(newPrompt);
        setPrompts((prev) => [...prev, newPrompt]);

        toast({
          title: "Success",
          description: "Evaluation prompt created successfully",
        });
      }

      setShowEditDialog(false);
      setEditingPrompt(null);
      setPromptName("");
      setPromptText("");
      setSchemaFields([]);
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
      setPrompts((prev) => prev.filter((p) => p.id !== prompt.id));

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
    setSchemaFields([]);
    setShowEditDialog(false);
    onClose();
  };

  // Schema Builder Handlers
  const addField = () => {
    setSchemaFields([...schemaFields, { key: "", type: "string", enumOptions: "" }]);
  };

  const removeField = (index: number) => {
    const newFields = [...schemaFields];
    newFields.splice(index, 1);
    setSchemaFields(newFields);
  };

  const updateField = (
    index: number,
    field: Partial<SchemaField>
  ) => {
    const newFields = [...schemaFields];
    newFields[index] = { ...newFields[index], ...field };
    setSchemaFields(newFields);
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
                <p className="text-sm">
                  Create your first evaluation prompt to get started
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {prompts.map((prompt) => (
                  <Card key={prompt.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {prompt.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            Created{" "}
                            {new Date(prompt.created_at).toLocaleDateString()}
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
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Prompt</Label>
                          <div className="p-3 bg-muted rounded-md border min-h-[60px] max-h-[100px] overflow-y-auto">
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {prompt.prompt.length > 200
                                ? `${prompt.prompt.substring(0, 200)}...`
                                : prompt.prompt}
                            </p>
                          </div>
                        </div>

                        {prompt.schema &&
                          Object.keys(prompt.schema).length > 0 && (
                            <div>
                              <Label className="text-sm font-medium">
                                Schema
                              </Label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {Object.entries(prompt.schema).map(
                                  ([key, type]) => (
                                    <div
                                      key={key}
                                      className="text-xs border px-2 py-1 rounded-md bg-background flex items-center gap-1"
                                    >
                                      <span className="font-semibold">
                                        {key}
                                      </span>
                                      <span className="text-muted-foreground opacity-60">
                                        : {typeof type === 'string' && type.startsWith('enum:') ? 'enum' : type as string}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt
                ? "Edit Evaluation Prompt"
                : "Create Evaluation Prompt"}
            </DialogTitle>
            <DialogDescription>
              {editingPrompt
                ? "Update the evaluation prompt details"
                : "Create a new custom evaluation prompt"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="prompt-name">Name</Label>
              <Input
                id="prompt-name"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                placeholder="Ex: Customer Service Quality"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt-text">Evaluation Instructions</Label>
              <Textarea
                id="prompt-text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Ex: Evaluate the tone and helpfulness of the assistant..."
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Explain <strong>how</strong> the model should judge the
                conversation.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Output Schema Definition</Label>
                <Button variant="ghost" size="sm" onClick={addField}>
                  <Plus className="h-4 w-4 mr-2" /> Add Field
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Define the JSON keys you want the evaluator to extract (e.g.,
                score, reasoning).
              </p>

              <div className="space-y-2 border rounded-md p-2 bg-muted/20">
                {schemaFields.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No fields defined. Click "Add Field" to start.
                  </div>
                )}
                {schemaFields.map((field, index) => (
                  <div key={index} className="flex flex-col gap-2 p-2 border-b last:border-0">
                    <div className="flex gap-2 items-start">
                      <Input
                        placeholder="Key (e.g. score)"
                        value={field.key}
                        onChange={(e) =>
                          updateField(index, { key: e.target.value })
                        }
                        className="flex-1"
                      />
                      <Select
                        value={field.type}
                        onValueChange={(val: any) =>
                          updateField(index, { type: val })
                        }
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="enum">Enum</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {field.type === 'enum' && (
                      <div className="pl-1">
                        <Input
                          placeholder="Options (comma separated, e.g. Positive, Negative)"
                          value={field.enumOptions}
                          onChange={(e) => updateField(index, { enumOptions: e.target.value })}
                          className="text-sm h-8"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
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

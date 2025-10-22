import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Prompt, PromptVersion } from "@/lib/db";
import VariableEditor from "./VariableEditor";

interface PromptEditorProps {
  prompt: Prompt | null;
  selectedVersion: string;
  onSave: (updatedPrompt: Prompt) => void;
  onCreateVersion: (newVersion: PromptVersion) => void;
  onVersionChange: (versionId: string) => void;
}

interface EditingPrompt {
  name: string;
  description: string;
  type: "single-turn" | "multi-turn";
  text: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  model: string;
}

const PromptEditor = ({
  prompt,
  selectedVersion,
  onSave,
  onCreateVersion,
  onVersionChange
}: PromptEditorProps) => {
  const [editingPrompt, setEditingPrompt] = useState<EditingPrompt>({
    name: "",
    description: "",
    type: "single-turn",
    text: "",
    system_prompt: "",
    temperature: 0.7,
    max_tokens: 500,
    top_p: 0.9,
    model: "gpt-4o-mini"
  });

  const { toast } = useToast();

  useEffect(() => {
    if (prompt && selectedVersion) {
      const version = prompt.versions[selectedVersion];
      if (version) {
        setEditingPrompt({
          name: prompt.name,
          description: prompt.description || "",
          type: prompt.type || "single-turn",
          text: version.text,
          system_prompt: version.config.system_prompt,
          temperature: version.config.temperature,
          max_tokens: version.config.max_tokens,
          top_p: version.config.top_p,
          model: version.config.model || "gpt-4o-mini"
        });
      }
    }
  }, [prompt, selectedVersion]);

  const handleSave = () => {
    if (!prompt) return;

    const version = prompt.versions[selectedVersion];
    const updatedPrompt = {
      ...prompt,
      name: editingPrompt.name,
      type: editingPrompt.type,
      description: editingPrompt.description,
      updated_at: new Date().toISOString(),
      versions: {
        ...prompt.versions,
        [selectedVersion]: {
          ...version,
          text: editingPrompt.text,
          variables: version.variables || {},
          config: {
            temperature: editingPrompt.temperature,
            max_tokens: editingPrompt.max_tokens,
            top_p: editingPrompt.top_p,
            system_prompt: editingPrompt.system_prompt,
            model: editingPrompt.model
          }
        }
      }
    };

    onSave(updatedPrompt);
    toast({
      title: "Saved",
      description: "Prompt has been saved successfully"
    });
  };

  const handleCreateVersion = () => {
    if (!prompt) return;

    const versionNumbers = Object.keys(prompt.versions)
      .map(v => parseInt(v.replace('v', '')))
      .filter(n => !isNaN(n));
    const nextVersionNumber = versionNumbers.length > 0 ? Math.max(...versionNumbers) + 1 : 1;
    const newVersionId = `v${nextVersionNumber}`;

    const newVersion: PromptVersion = {
      version_id: newVersionId,
      text: editingPrompt.text,
      variables: {},
      config: {
        temperature: editingPrompt.temperature,
        max_tokens: editingPrompt.max_tokens,
        top_p: editingPrompt.top_p,
        system_prompt: editingPrompt.system_prompt,
        model: editingPrompt.model
      },
      created_at: new Date().toISOString()
    };

    onCreateVersion(newVersion);
    onVersionChange(newVersionId);
    
    toast({
      title: "Version created",
      description: `New version ${newVersionId} has been created successfully`
    });
  };

  if (!prompt) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p>Select a prompt to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Input
            value={editingPrompt.name}
            onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
            className="text-2xl font-bold border-none p-0 h-auto"
            placeholder="Prompt name"
          />
          <Input
            value={editingPrompt.description}
            onChange={(e) => setEditingPrompt({ ...editingPrompt, description: e.target.value })}
            className="text-sm text-muted-foreground border-none p-0 h-auto"
            placeholder="Description"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Prompt Type</Label>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="single-turn"
                name="prompt-type"
                value="single-turn"
                checked={editingPrompt.type === "single-turn"}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, type: e.target.value as "single-turn" | "multi-turn" })}
                className="h-4 w-4"
              />
              <Label htmlFor="single-turn" className="text-sm font-normal cursor-pointer">
                Single Turn
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="multi-turn"
                name="prompt-type"
                value="multi-turn"
                checked={editingPrompt.type === "multi-turn"}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, type: e.target.value as "single-turn" | "multi-turn" })}
                className="h-4 w-4"
              />
              <Label htmlFor="multi-turn" className="text-sm font-normal cursor-pointer">
                Multi Turn
              </Label>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {editingPrompt.type === "single-turn" 
              ? "Single turn prompts generate one response per user input"
              : "Multi turn prompts support ongoing conversations"
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleSave} size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          <Button onClick={handleCreateVersion} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Version
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="space-y-2">
          <Label>System Prompt</Label>
          <Textarea
            value={editingPrompt.system_prompt}
            onChange={(e) => setEditingPrompt({ ...editingPrompt, system_prompt: e.target.value })}
            placeholder="You are a helpful assistant..."
            className="min-h-[500px]"
          />
        </div>

        <div className="space-y-2">
          <Label>User Prompt</Label>
          <Textarea
            value={editingPrompt.text}
            onChange={(e) => setEditingPrompt({ ...editingPrompt, text: e.target.value })}
            placeholder="Enter your prompt here..."
            className="min-h-[100px]"
          />
        </div>

        <VariableEditor
          promptText={editingPrompt.text}
          systemPrompt={editingPrompt.system_prompt}
          variables={prompt.versions[selectedVersion]?.variables || {}}
          onPromptChange={(text) => setEditingPrompt({ ...editingPrompt, text })}
          onSystemPromptChange={(system_prompt) => setEditingPrompt({ ...editingPrompt, system_prompt })}
          onVariablesChange={(variables) => {
            // Handle variables change if needed
          }}
        />
      </div>
    </div>
  );
};

export default PromptEditor;

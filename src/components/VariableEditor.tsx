import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Variable {
  key: string;
  value: string;
}

interface VariableEditorProps {
  promptText: string;
  systemPrompt: string;
  variables: Record<string, string>;
  onPromptChange: (text: string) => void;
  onSystemPromptChange: (text: string) => void;
  onVariablesChange: (variables: Record<string, string>) => void;
}

const VariableEditor = ({
  promptText,
  systemPrompt,
  variables: propVariables,
  onPromptChange,
  onSystemPromptChange,
  onVariablesChange,
}: VariableEditorProps) => {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [previewText, setPreviewText] = useState(promptText);
  const { toast } = useToast();

  // Extract variables from prompt text
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{([^}]+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(match => match.slice(2, -2).trim()))];
  };

  // Apply variable substitution
  const applySubstitution = (text: string, vars: Variable[]): string => {
    let result = text;
    vars.forEach(variable => {
      const regex = new RegExp(`\\{\\{${variable.key}\\}\\}`, 'g');
      result = result.replace(regex, variable.value);
    });
    return result;
  };

  // Initialize variables from prompt text and prop variables
  useEffect(() => {
    const promptVars = extractVariables(promptText);
    const systemVars = extractVariables(systemPrompt);
    const allVars = [...new Set([...promptVars, ...systemVars])];
    
    const newVariables = allVars.map(key => ({
      key,
      value: propVariables[key] || ""
    }));
    
    setVariables(newVariables);
  }, [promptText, systemPrompt, propVariables]);


  const handleVariableChange = (index: number, key: string, value: string) => {
    const newVariables = [...variables];
    newVariables[index] = { key, value };
    setVariables(newVariables);
    
    // Update parent with new variables
    const newVariablesRecord: Record<string, string> = {};
    newVariables.forEach(v => {
      if (v.key.trim()) {
        newVariablesRecord[v.key] = v.value;
      }
    });
    onVariablesChange(newVariablesRecord);
  };

  // const handleAddVariable = () => {
  //   const newVariables = [...variables, { key: "", value: "" }];
  //   setVariables(newVariables);
  // };

  const handleRemoveVariable = (index: number) => {
    const newVariables = variables.filter((_, i) => i !== index);
    setVariables(newVariables);
    
    // Update parent with new variables
    const newVariablesRecord: Record<string, string> = {};
    newVariables.forEach(v => {
      if (v.key.trim()) {
        newVariablesRecord[v.key] = v.value;
      }
    });
    onVariablesChange(newVariablesRecord);
  };

  const handleApplyVariables = () => {
    onPromptChange(previewText);
    toast({
      title: "Applied",
      description: "Variables have been applied to prompts",
    });
  };

  const handleResetVariables = () => {
    const resetVariables = variables.map(v => ({ ...v, value: "" }));
    setVariables(resetVariables);
    
    // Update parent with reset variables
    const newVariablesRecord: Record<string, string> = {};
    resetVariables.forEach(v => {
      if (v.key.trim()) {
        newVariablesRecord[v.key] = v.value;
      }
    });
    onVariablesChange(newVariablesRecord);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Variable Substitution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {/* <Label className="text-sm font-medium">Variables</Label> */}
          <div className="space-y-3 max-h-40 overflow-y-auto">
            {variables.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                No variables found in prompts
              </div>
            ) : (
              variables.map((variable, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <Input
                    value={variable.key}
                    onChange={(e) => handleVariableChange(index, e.target.value, variable.value)}
                    placeholder="Variable name"
                    className="flex-1 text-sm h-8"
                    disabled
                  />
                  <span className="text-muted-foreground text-sm font-medium">=</span>
                  <Input
                    value={variable.value}
                    onChange={(e) => handleVariableChange(index, variable.key, e.target.value)}
                    placeholder="Value"
                    className="flex-1 text-sm h-8"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveVariable(index)}
                    className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
          {/* <Button
            size="sm"
            variant="outline"
            onClick={handleAddVariable}
            className="w-full"
          >
            <Plus className="h-3 w-3 mr-2" />
            Add Variable
          </Button> */}
        </div>

        <div className="space-y-3">
          {/* <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Preview</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleResetVariables}
                className="h-7 px-3 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleApplyVariables}
                className="h-7 px-3 text-xs"
              >
                Apply
              </Button>
            </div>
          </div> */}
          
          {/* <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">System Prompt</Label>
              <Textarea
                value={previewSystemPrompt}
                readOnly
                className="min-h-[60px] text-xs font-mono"
                placeholder="No system prompt"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">User Prompt</Label>
              <Textarea
                value={previewText}
                readOnly
                className="min-h-[80px] text-xs font-mono"
                placeholder="No prompt template"
              />
            </div>
          </div> */}
        </div>

        {variables.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <p>Variables found: {variables.length}</p>
            <p>Use <code className="bg-muted px-1 rounded">{"{{variable_name}}"}</code> in your prompts</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VariableEditor;

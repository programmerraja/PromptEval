import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LLMConfig {
  provider: "openai" | "anthropic" | "google";
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
}

interface ModelSelectorProps {
  config: LLMConfig;
  onConfigChange: (config: LLMConfig) => void;
  disabled?: boolean;
}

const ModelSelector = ({ config, onConfigChange, disabled = false }: ModelSelectorProps) => {
  const getDefaultModel = (provider: "openai" | "anthropic" | "google"): string => {
    switch (provider) {
      case "openai":
        return "gpt-4o-mini";
      case "anthropic":
        return "claude-3-5-sonnet-20241022";
      case "google":
        return "gemini-2.5-flash";
      default:
        return "gpt-4o-mini";
    }
  };

  const handleProviderChange = (provider: "openai" | "anthropic" | "google") => {
    onConfigChange({
      ...config,
      provider,
      model: getDefaultModel(provider),
    });
  };

  const handleModelChange = (model: string) => {
    onConfigChange({
      ...config,
      model,
    });
  };

  const handleParameterChange = (param: keyof LLMConfig, value: number) => {
    onConfigChange({
      ...config,
      [param]: value,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Model Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select
            value={config.provider}
            onValueChange={handleProviderChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="google">Google (Gemini)</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Model</Label>
          <Input
            value={config.model}
            onChange={(e) => handleModelChange(e.target.value)}
            placeholder="e.g., gemini-2.5-flash"
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Temperature</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={config.temperature}
              onChange={(e) => handleParameterChange("temperature", parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="text-xs h-8"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Max Tokens</Label>
            <Input
              type="number"
              value={config.maxTokens}
              onChange={(e) => handleParameterChange("maxTokens", parseInt(e.target.value) || 0)}
              disabled={disabled}
              className="text-xs h-8"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Top P</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={config.topP || 0.9}
              onChange={(e) => handleParameterChange("topP", parseFloat(e.target.value) || 0.9)}
              disabled={disabled}
              className="text-xs h-8"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelSelector;

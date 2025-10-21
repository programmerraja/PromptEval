import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface ModelConfigProps {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  onModelChange: (model: string) => void;
  onTemperatureChange: (temperature: number) => void;
  onMaxTokensChange: (maxTokens: number) => void;
  onTopPChange: (topP: number) => void;
  title?: string;
  description?: string;
  showProvider?: boolean;
  provider?: "openai" | "anthropic" | "google";
  onProviderChange?: (provider: "openai" | "anthropic" | "google") => void;
  className?: string;
}

const ModelConfig = ({
  model,
  temperature,
  maxTokens,
  topP,
  onModelChange,
  onTemperatureChange,
  onMaxTokensChange,
  onTopPChange,
  title = "Model Configuration",
  description = "Configure model parameters",
  showProvider = false,
  provider = "openai",
  onProviderChange,
  className = ""
}: ModelConfigProps) => {
  const openaiModels = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo"
  ];

  const anthropicModels = [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307"
  ];

  const googleModels = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-pro",
    "gemini-1.5-flash"
  ];

  const getModelsForProvider = (provider: string) => {
    switch (provider) {
      case "openai":
        return openaiModels;
      case "anthropic":
        return anthropicModels;
      case "google":
        return googleModels;
      default:
        return openaiModels;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showProvider && onProviderChange && (
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={onProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Model</Label>
          <Select value={model} onValueChange={onModelChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {getModelsForProvider(provider).map((modelOption) => (
                <SelectItem key={modelOption} value={modelOption}>
                  {modelOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Temperature: {temperature}</Label>
              <span className="text-sm text-muted-foreground">0.0 - 2.0</span>
            </div>
            <Slider
              value={[temperature]}
              onValueChange={([value]) => onTemperatureChange(value)}
              min={0}
              max={2}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>More focused</span>
              <span>More creative</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Max Tokens: {maxTokens}</Label>
              <span className="text-sm text-muted-foreground">1 - 4096</span>
            </div>
            <Slider
              value={[maxTokens]}
              onValueChange={([value]) => onMaxTokensChange(value)}
              min={1}
              max={4096}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Shorter responses</span>
              <span>Longer responses</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Top P: {topP}</Label>
              <span className="text-sm text-muted-foreground">0.0 - 1.0</span>
            </div>
            <Slider
              value={[topP]}
              onValueChange={([value]) => onTopPChange(value)}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>More focused</span>
              <span>More diverse</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-2">
            <Label>Temperature (Input)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={temperature}
              onChange={(e) => onTemperatureChange(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Tokens (Input)</Label>
            <Input
              type="number"
              min="1"
              max="4096"
              value={maxTokens}
              onChange={(e) => onMaxTokensChange(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelConfig;

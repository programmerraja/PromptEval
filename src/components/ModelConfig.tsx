import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { configService } from "@/services/configService";

export interface ModelConfiguration {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

interface ModelConfigProps {
  config: ModelConfiguration;
  onConfigChange: (config: ModelConfiguration) => void;
  title?: string;
  description?: string;
  className?: string;
  showProvider?: boolean;
}

const ModelConfig = ({
  config,
  onConfigChange,
  title = "Model Configuration",
  description = "Configure model parameters",
  className = "",
  showProvider = true
}: ModelConfigProps) => {
  const getModelsForProvider = (provider: string) => {
    const providerConfig = configService.getProviderConfig(provider);
    return providerConfig?.models.map(m => m.name) || [];
  };

  const handleChange = (key: keyof ModelConfiguration, value: any) => {
    const newConfig = { ...config, [key]: value };
    // Reset model if provider changes
    if (key === 'provider' && value !== config.provider) {
      const models = getModelsForProvider(value);
      if (models.length > 0) {
        newConfig.model = models[0];
      }
    }
    onConfigChange(newConfig);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showProvider && (
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={config.provider}
              onValueChange={(val) => handleChange('provider', val)}
            >
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
          <Select
            value={config.model}
            onValueChange={(val) => handleChange('model', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {getModelsForProvider(config.provider).map((modelOption) => {
                const modelConfig = configService.getModelConfig(config.provider, modelOption);
                return (
                  <SelectItem key={modelOption} value={modelOption}>
                    {modelConfig?.displayName || modelOption}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Temperature: {config.temperature}</Label>
              <span className="text-sm text-muted-foreground">0.0 - 2.0</span>
            </div>
            <Slider
              value={[config.temperature]}
              onValueChange={([value]) => handleChange('temperature', value)}
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
              <Label>Max Tokens: {config.maxTokens}</Label>
              <span className="text-sm text-muted-foreground">1 - 4096</span>
            </div>
            <Slider
              value={[config.maxTokens]}
              onValueChange={([value]) => handleChange('maxTokens', value)}
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
              <Label>Top P: {config.topP}</Label>
              <span className="text-sm text-muted-foreground">0.0 - 1.0</span>
            </div>
            <Slider
              value={[config.topP]}
              onValueChange={([value]) => handleChange('topP', value)}
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
              value={config.temperature}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Tokens (Input)</Label>
            <Input
              type="number"
              min="1"
              max="4096"
              value={config.maxTokens}
              onChange={(e) => handleChange('maxTokens', parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelConfig;

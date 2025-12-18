export interface ModelConfig {
  name: string;
  displayName: string;
  maxTokens: number;
  supportsTopP: boolean;
}

export interface ProviderConfig {
  name: string;
  displayName: string;
  models: ModelConfig[];
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  defaultTopP: number;
}

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  openai: {
    name: "openai",
    displayName: "OpenAI",
    defaultModel: "gpt-4o-mini",
    defaultTemperature: 0.7,
    defaultMaxTokens: 500,
    defaultTopP: 0.9,
    models: [
      { name: "gpt-4o", displayName: "GPT-4o", maxTokens: 4096, supportsTopP: true },
      { name: "gpt-4o-mini", displayName: "GPT-4o Mini", maxTokens: 4096, supportsTopP: true },
      { name: "gpt-4-turbo", displayName: "GPT-4 Turbo", maxTokens: 4096, supportsTopP: true },
      { name: "gpt-4", displayName: "GPT-4", maxTokens: 4096, supportsTopP: true },
      { name: "gpt-3.5-turbo", displayName: "GPT-3.5 Turbo", maxTokens: 4096, supportsTopP: true }
    ]
  },
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic",
    defaultModel: "claude-3-5-sonnet-20241022",
    defaultTemperature: 0.7,
    defaultMaxTokens: 500,
    defaultTopP: 0.9,
    models: [
      { name: "claude-3-5-sonnet-20241022", displayName: "Claude 3.5 Sonnet", maxTokens: 4096, supportsTopP: true },
      { name: "claude-3-5-haiku-20241022", displayName: "Claude 3.5 Haiku", maxTokens: 4096, supportsTopP: true },
      { name: "claude-3-opus-20240229", displayName: "Claude 3 Opus", maxTokens: 4096, supportsTopP: true },
      { name: "claude-3-sonnet-20240229", displayName: "Claude 3 Sonnet", maxTokens: 4096, supportsTopP: true },
      { name: "claude-3-haiku-20240307", displayName: "Claude 3 Haiku", maxTokens: 4096, supportsTopP: true }
    ]
  },
  google: {
    name: "google",
    displayName: "Google",
    defaultModel: "models/gemini-flash-latest",
    defaultTemperature: 0.7,
    defaultMaxTokens: 500,
    defaultTopP: 0.9,
    models: [
      { name: "models/gemini-flash-latest", displayName: "Gemini Flash", maxTokens: 4096, supportsTopP: true },
      { name: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro", maxTokens: 4096, supportsTopP: true },
      { name: "gemini-1.5-pro", displayName: "Gemini 1.5 Pro", maxTokens: 4096, supportsTopP: true },
      { name: "gemini-1.5-flash", displayName: "Gemini 1.5 Flash", maxTokens: 4096, supportsTopP: true }
    ]
  }
};

export const DEFAULT_CONFIG = {
  temperature: 0.7,
  maxTokens: 500,
  topP: 0.9,
  provider: "openai" as const,
  model: "gpt-4o-mini"
};

export const EVALUATION_CONFIG = {
  defaultTemperature: 0.3,
  defaultMaxTokens: 1000,
  defaultTopP: 0.9
};

export const UI_CONFIG = {
  maxTextLength: 200,
  maxConversationLength: 50,
  defaultPageSize: 20,
  animationDuration: 300
};

export class ConfigService {
  getProviderConfig(provider: string): ProviderConfig | null {
    return PROVIDER_CONFIGS[provider] || null;
  }

  getModelConfig(provider: string, model: string): ModelConfig | null {
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig) return null;

    return providerConfig.models.find(m => m.name === model) || null;
  }

  getDefaultConfig(provider: string) {
    const providerConfig = this.getProviderConfig(provider);
    if (!providerConfig) return DEFAULT_CONFIG;

    return {
      provider,
      model: providerConfig.defaultModel,
      temperature: providerConfig.defaultTemperature,
      maxTokens: providerConfig.defaultMaxTokens,
      topP: providerConfig.defaultTopP
    };
  }

  validateConfig(config: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    topP: number;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const providerConfig = this.getProviderConfig(config.provider);
    if (!providerConfig) {
      errors.push(`Invalid provider: ${config.provider}`);
      return { isValid: false, errors };
    }

    const modelConfig = this.getModelConfig(config.provider, config.model);
    if (!modelConfig) {
      errors.push(`Invalid model: ${config.model} for provider: ${config.provider}`);
    }

    if (config.temperature < 0 || config.temperature > 2) {
      errors.push("Temperature must be between 0 and 2");
    }

    if (config.maxTokens < 1 || config.maxTokens > 4096) {
      errors.push("Max tokens must be between 1 and 4096");
    }

    if (config.topP < 0 || config.topP > 1) {
      errors.push("Top P must be between 0 and 1");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const configService = new ConfigService();

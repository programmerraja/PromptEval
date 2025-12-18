import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export interface LLMConfig {
    provider: "openai" | "anthropic" | "google" | string;
    model: string;
    temperature: number;
    maxTokens: number;
    topP?: number;
    apiKey?: string;
}

import { Settings } from "@/lib/db";

export const getAIClient = (config: LLMConfig, settings: Settings | null) => {
    // If apiKey is provided in config (e.g. from run context), use it.
    // Otherwise fall back to settings.

    if (!settings && !config.apiKey) throw new Error("Settings not loaded and no API key provided");

    const providerToCheck = config.provider.toLowerCase();

    switch (providerToCheck) {
        case "openai": {
            const openaiKey = config.apiKey || settings?.api_keys?.openai;
            if (!openaiKey) throw new Error("OpenAI API key not configured");
            return createOpenAI({ apiKey: openaiKey });
        }

        case "anthropic": {
            const anthropicKey = config.apiKey || settings?.api_keys?.anthropic;
            if (!anthropicKey) throw new Error("Anthropic API key not configured");
            return createAnthropic({ apiKey: anthropicKey });
        }

        case "google": {
            const googleKey = config.apiKey || settings?.api_keys?.google;
            if (!googleKey) throw new Error("Google API key not configured");
            return createGoogleGenerativeAI({ apiKey: googleKey });
        }

        default:
            // Fallback or error if using an unknown provider. 
            // For now, let's assume if it is NOT one of the above, we might default to google or error.
            // Given the codebase history, 'google' seems to be the default fallback, but let's be strict.
            throw new Error(`Unknown provider: ${config.provider}`);
    }
};

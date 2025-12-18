import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { db } from "@/lib/db";

export type AIProvider = "openai" | "anthropic" | "google";

export interface AIConfig {
    provider: AIProvider;
    model: string;
    temperature: number;
    maxTokens: number;
    topP?: number;
    apiKey?: string; // Optional override
}

export const getAIClient = async (provider: AIProvider) => {
    const settings = await db.settings.get("default");
    if (!settings) throw new Error("Settings not loaded");

    switch (provider) {
        case "openai":
            if (!settings.api_keys?.openai) throw new Error("OpenAI API key not configured");
            return createOpenAI({ apiKey: settings.api_keys.openai });
        case "anthropic":
            if (!settings.api_keys?.anthropic) throw new Error("Anthropic API key not configured");
            return createAnthropic({ apiKey: settings.api_keys.anthropic });
        case "google":
            if (!settings.api_keys?.google) throw new Error("Google API key not configured");
            return createGoogleGenerativeAI({ apiKey: settings.api_keys.google });
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
};

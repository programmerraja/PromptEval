import { useState, useRef, useCallback } from "react";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { ConversationMessage, db } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

export interface LLMConfig {
    provider: "openai" | "anthropic" | "google";
    model: string;
    temperature: number;
    maxTokens: number;
    topP?: number;
}

export interface SimulationState {
    isActive: boolean;
    currentTurn: number;
    messages: ConversationMessage[];
    currentSpeaker: "assistant" | "user" | null;
    error?: string;
}

interface UseMultiTurnSimulationProps {
    onTurnComplete?: (messages: ConversationMessage[]) => void;
    onSimulationComplete?: (messages: ConversationMessage[], reason: string) => void;
    onError?: (error: string) => void;
}

export const useMultiTurnSimulation = ({
    onTurnComplete,
    onSimulationComplete,
    onError,
}: UseMultiTurnSimulationProps = {}) => {
    const { toast } = useToast();

    // Refs to hold mutable state without triggering re-renders during async operations
    const stateRef = useRef<SimulationState>({
        isActive: false,
        currentTurn: 0,
        messages: [],
        currentSpeaker: null,
    });

    // State for UI to react to
    const [simulationState, setSimulationState] = useState<SimulationState>(stateRef.current);

    const updateState = (updates: Partial<SimulationState>) => {
        stateRef.current = { ...stateRef.current, ...updates };
        setSimulationState(stateRef.current);
    };

    const getAIClient = async (config: LLMConfig) => {
        const settings = await db.settings.get("default");

        if (!settings) throw new Error("Settings not loaded");

        switch (config.provider) {
            case "openai":
                if (!settings.api_keys?.openai)
                    throw new Error("OpenAI API key not configured");
                return createOpenAI({ apiKey: settings.api_keys.openai });
            case "anthropic":
                if (!settings.api_keys?.anthropic)
                    throw new Error("Anthropic API key not configured");
                return createAnthropic({ apiKey: settings.api_keys.anthropic });
            case "google":
                if (!settings.api_keys?.google)
                    throw new Error("Google API key not configured");
                return createGoogleGenerativeAI({ apiKey: settings.api_keys.google });
            default:
                throw new Error("Unknown provider");
        }
    };

    const checkForEnd = (content: string): boolean => {
        const endPatterns = [
            /\[END\]/i,
            /\bEND\b$/i,
            /conversation.*complete/i,
            /nothing.*more.*discuss/i,
        ];
        return endPatterns.some((pattern) => pattern.test(content));
    };

    const generateMessage = async (
        config: LLMConfig,
        systemPrompt: string,
        history: ConversationMessage[],
        agentRole: "assistant" | "user"
    ): Promise<string> => {
        const client = await getAIClient(config);

        // Map history to the perspective of the current agent
        // If we are the "Assistant" (Standard):
        // - History 'user' -> LLM 'user' (Input)
        // - History 'assistant' -> LLM 'assistant' (Past Output)
        //
        // If we are the "User Simulator" (Reverse):
        // - History 'assistant' -> LLM 'user' (Input to react to)
        // - History 'user' -> LLM 'assistant' (My past output)

        const messages = [
            { role: "system", content: systemPrompt },
            ...history.map(msg => ({
                content: msg.content,
                role: agentRole === 'assistant'
                    ? msg.role
                    : (msg.role === 'assistant' ? 'user' : 'assistant')
            }))
        ] as any;

        const result = await generateText({
            model: client(config.model),
            messages,
            temperature: config.temperature,
            // maxOutputTokens: config.maxTokens,
        });

        return result.text;
    };

    const runTurn = async (
        speaker: "assistant" | "user",
        assistantConfig: LLMConfig,
        userConfig: LLMConfig,
        assistantSystemPrompt: string,
        userSystemPrompt: string,
        maxTurns: number
    ) => {
        if (!stateRef.current.isActive) return;

        if (stateRef.current.currentTurn >= maxTurns * 2) { // *2 because turn usually implies a pair, or is it single message?
            // Let's treat maxTurns as "pairs of exchanges" or "total messages". 
            // MultiChat treated it as "assistant turns" I think. 
            // Safe bet: maxTurns * 2 for total individual messages.
            updateState({ isActive: false, currentSpeaker: null });
            onSimulationComplete?.(stateRef.current.messages, "Max turns reached");
            return;
        }

        updateState({ currentSpeaker: speaker });

        try {
            const config = speaker === "assistant" ? assistantConfig : userConfig;
            const systemPrompt = speaker === "assistant" ? assistantSystemPrompt : userSystemPrompt;

            const content = await generateMessage(
                config,
                systemPrompt,
                stateRef.current.messages,
                speaker
            );

            const newMessage: ConversationMessage = {
                role: speaker,
                content,
            };

            const newHistory = [...stateRef.current.messages, newMessage];
            updateState({
                messages: newHistory,
                currentTurn: stateRef.current.currentTurn + 1
            });

            onTurnComplete?.(newHistory);

            if (checkForEnd(content)) {
                updateState({ isActive: false, currentSpeaker: null });
                onSimulationComplete?.(newHistory, `${speaker} indicated completion`);
                return;
            }

            // Schedule next turn
            const nextSpeaker = speaker === "assistant" ? "user" : "assistant";
            setTimeout(() => {
                runTurn(nextSpeaker, assistantConfig, userConfig, assistantSystemPrompt, userSystemPrompt, maxTurns);
            }, 100); // Small delay to prevent stack overflow and allow UI update

        } catch (error: any) {
            console.error("Simulation error:", error);
            const errorMsg = error.message || "Unknown error during simulation";
            updateState({ isActive: false, currentSpeaker: null, error: errorMsg });
            onError?.(errorMsg);
        }
    };

    const startSimulation = async (
        assistantConfig: LLMConfig,
        userConfig: LLMConfig,
        assistantSystemPrompt: string,
        userSystemPrompt: string,
        maxTurns: number = 10,
        initialMessage?: string,
        whoStartsFirst: "assistant" | "user" = "assistant"
    ) => {

        // Reset state
        const initialHistory: ConversationMessage[] = [];

        // If there is an initial message, it's usually from the one who starts first, OR a pre-seed.
        // In MultiChat: "Initial Message" was used if Assistant starts first? Or to seed context?
        // MultiChat logic: if (currentTurn === 0 && initialMessage && whoStartsFirst === "user") -> use initial.

        // Let's handle initial message as a "forced first turn" without generation.
        let startSpeaker = whoStartsFirst;

        if (initialMessage) {
            // If we have an initial message, we add it immediately and let the OTHER person respond.
            initialHistory.push({
                role: whoStartsFirst,
                content: initialMessage
            });
            // Switch starter
            startSpeaker = whoStartsFirst === "assistant" ? "user" : "assistant";
        }

        stateRef.current = {
            isActive: true,
            currentTurn: initialHistory.length,
            messages: initialHistory,
            currentSpeaker: startSpeaker, // Will be set correctly in runTurn
            error: undefined,
        };
        setSimulationState(stateRef.current);

        // Kick off the loop
        runTurn(startSpeaker, assistantConfig, userConfig, assistantSystemPrompt, userSystemPrompt, maxTurns);
    };

    const stopSimulation = () => {
        updateState({ isActive: false, currentSpeaker: null });
    };

    const resetSimulation = () => {
        updateState({
            isActive: false,
            currentTurn: 0,
            messages: [],
            currentSpeaker: null,
            error: undefined
        });
    };

    return {
        simulationState,
        startSimulation,
        stopSimulation,
        resetSimulation
    };
};

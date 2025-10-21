import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Play, Save, RotateCcw, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConversationMessage, db, Prompt } from "@/lib/db";
import PlaygroundChat from "./PlaygroundChat";
import ModelConfig from "./ModelConfig";
import ResizablePanel from "./ResizablePanel";
import ConversationTabs from "./ConversationTabs";
import ABTestingPanel from "./ABTestingPanel";
import VariableEditor from "./VariableEditor";
import UsageStats from "./UsageStats";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

interface LLMConfig {
  provider: "openai" | "anthropic" | "google";
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
}

interface Conversation {
  id: string;
  name: string;
  messages: ConversationMessage[];
  isGenerating: boolean;
}

interface ABTestConfig {
  id: string;
  name: string;
  promptText: string;
  systemPrompt: string;
  provider: "openai" | "anthropic" | "google";
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

interface PlaygroundProps {
  promptText: string;
  systemPrompt: string;
  onSaveConversation?: (messages: ConversationMessage[]) => void;
  prompt?: Prompt; // Optional prompt data for A/B testing
}

const Playground = ({
  promptText,
  systemPrompt,
  onSaveConversation,
  prompt,
}: PlaygroundProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [config, setConfig] = useState<LLMConfig>({
    provider: "google",
    model: "gemini-2.5-flash",
    temperature: 0.7,
    maxTokens: 500,
    topP: 0.9,
  });
  const [settings, setSettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "ab-test">("chat");
  const [abTestConfigs, setAbTestConfigs] = useState<ABTestConfig[]>([]);
  const [abTestConversations, setAbTestConversations] = useState<
    Record<string, ConversationMessage[]>
  >({});
  const [abTestGenerating, setAbTestGenerating] = useState<
    Record<string, boolean>
  >({});
  
  const [processedPromptText, setProcessedPromptText] = useState(promptText);
  
  const [processedSystemPrompt, setProcessedSystemPrompt] =
    useState(systemPrompt);
  const [editableSystemPrompt, setEditableSystemPrompt] =
    useState(systemPrompt);
  const [usageStats, setUsageStats] = useState({
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalCost: 0,
    requestCount: 0,
    averageLatency: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    db.settings.get("default").then((s) => setSettings(s));
  }, []);

  // Update processed prompts when original prompts change
  useEffect(() => {
    setProcessedPromptText(promptText);
    setProcessedSystemPrompt(systemPrompt);
    setEditableSystemPrompt(systemPrompt);
  }, [promptText, systemPrompt]);

  const getAIClient = (config: LLMConfig) => {
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

  const updateUsageStats = (usage: any, latency: number) => {
    setUsageStats((prev) => {
      const newStats = {
        totalTokens: prev.totalTokens + (usage.totalTokens || 0),
        promptTokens: prev.promptTokens + (usage.promptTokens || 0),
        completionTokens: prev.completionTokens + (usage.completionTokens || 0),
        totalCost: prev.totalCost + (usage.totalCost || 0),
        requestCount: prev.requestCount + 1,
        averageLatency:
          prev.requestCount === 0
            ? latency
            : (prev.averageLatency * prev.requestCount + latency) /
              (prev.requestCount + 1),
      };
      return newStats;
    });
  };

  const saveConversationToDatabase = async (conversationId: string, messages: ConversationMessage[]) => {
    try {
      const conversation = conversations.find((c) => c.id === conversationId);
      if (!conversation) return;

      const dbConversation = {
        id: conversationId,
        prompt_id: prompt?.id || 'playground',
        prompt_version: 'v1',
        model: config.model,
        type: 'manual' as const,
        messages: messages,
        metadata: {
          context: 'playground',
          status: 'completed',
          date: new Date().toISOString(),
          turn_count: messages.filter(m => m.role === 'user').length
        }
      };

      // Check if conversation already exists in database
      const existingConversation = await db.conversations.get(conversationId);
      if (existingConversation) {
        await db.conversations.update(conversationId, dbConversation);
      } else {
        await db.conversations.add(dbConversation);
      }
    } catch (error) {
      console.error('Failed to save conversation to database:', error);
      // Don't show error to user as this is background operation
    }
  };

  const generateMessage = async (
    conversationId: string,
    userMessage: string
  ): Promise<string> => {
    const client = getAIClient(config);
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const conversationHistory = [
      ...conversation.messages,
      { role: "user" as const, content: userMessage },
    ];

    const fullSystemPrompt = processedSystemPrompt
      ? `${processedSystemPrompt}\n\n${processedPromptText}`
      : processedPromptText;

    const startTime = Date.now();
    const result = await generateText({
      model: client(config.model),
      messages: [
        { role: "assistant" as const, content: fullSystemPrompt },
        ...conversationHistory,
      ],
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
      topP: config.topP,
    });

    const latency = Date.now() - startTime;

    // Update usage statistics
    if (result.usage) {
      updateUsageStats(result.usage, latency);
    }

    return result.text;
  };

  const handleSendMessage = async (conversationId: string, message: string) => {
    if (!message.trim()) return;

    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation || conversation.isGenerating) return;

    const userMessage: ConversationMessage = {
      role: "user",
      content: message,
    };

    // Update conversation with user message
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, userMessage], isGenerating: true }
          : c
      )
    );

    try {
      const response = await generateMessage(conversationId, message);
      const assistantMessage: ConversationMessage = {
        role: "assistant",
        content: response,
      };

      // Update conversation with assistant message
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: [...c.messages, assistantMessage],
                isGenerating: false,
              }
            : c
        )
      );

      // Auto-save conversation to database
      await saveConversationToDatabase(conversationId, [...conversation.messages, userMessage, assistantMessage]);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate response",
        variant: "destructive",
      });

      // Reset generating state on error
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, isGenerating: false } : c
        )
      );
    }
  };

  const handleRegenerateMessage = async (
    conversationId: string,
    messageIndex: number
  ) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation || conversation.isGenerating) return;

    // Find the user message that this assistant message is responding to
    const userMessageIndex = messageIndex - 1;
    if (
      userMessageIndex < 0 ||
      conversation.messages[userMessageIndex].role !== "user"
    )
      return;

    const userMessage = conversation.messages[userMessageIndex].content;
    const messagesUpToUser = conversation.messages.slice(0, userMessageIndex);

    // Update conversation to remove the assistant message and set generating state
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, messages: messagesUpToUser, isGenerating: true }
          : c
      )
    );

    try {
      const response = await generateMessage(conversationId, userMessage);
      const assistantMessage: ConversationMessage = {
        role: "assistant",
        content: response,
      };

      const updatedMessages = [...messagesUpToUser, assistantMessage];

      // Update conversation with new assistant message
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: updatedMessages,
                isGenerating: false,
              }
            : c
        )
      );

      // Auto-save conversation to database
      await saveConversationToDatabase(conversationId, updatedMessages);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to regenerate response",
        variant: "destructive",
      });

      // Reset generating state on error
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, isGenerating: false } : c
        )
      );
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleNewConversation = () => {
    const newConversation: Conversation = {
      id: `conv_${Date.now()}`,
      name: `Chat ${conversations.length + 1}`,
      messages: [],
      isGenerating: false,
    };

    setConversations((prev) => [...prev, newConversation]);
    setActiveConversationId(newConversation.id);
    
    // Auto-save empty conversation to database
    saveConversationToDatabase(newConversation.id, []);
  };

  const handleCloseConversation = (conversationId: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== conversationId);
      if (activeConversationId === conversationId) {
        setActiveConversationId(filtered.length > 0 ? filtered[0].id : "");
      }
      return filtered;
    });
  };

  const handleSaveConversation = () => {
    const activeConversation = conversations.find(
      (c) => c.id === activeConversationId
    );
    if (
      onSaveConversation &&
      activeConversation &&
      activeConversation.messages.length > 0
    ) {
      onSaveConversation(activeConversation.messages);
      toast({
        title: "Saved",
        description: "Conversation saved successfully",
      });
    }
  };

  // Initialize with first conversation if none exist
  useEffect(() => {
    if (conversations.length === 0) {
      handleNewConversation();
    }
  }, []);

  // Initialize A/B test configs
  useEffect(() => {
    let configs: ABTestConfig[] = [];

    if (prompt && Object.keys(prompt.versions).length > 0) {
      // Use all versions from the prompt for A/B testing
      configs = Object.entries(prompt.versions).map(([versionId, version]) => ({
        id: `${prompt.id}_${versionId}`,
        name: `${prompt.name} - ${versionId}`,
        promptText: version.text,
        systemPrompt: version.config.system_prompt,
        provider: config.provider,
        model: version.config.model || config.model,
        temperature: version.config.temperature,
        maxTokens: version.config.max_tokens,
        topP: version.config.top_p,
      }));
    } else {
      // Fallback to default A/B configurations if no prompt data
      configs = [
        {
          id: "config_a",
          name: "Version A",
          promptText,
          systemPrompt,
          provider: config.provider,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          topP: config.topP || 0.9,
        },
        {
          id: "config_b",
          name: "Version B",
          promptText,
          systemPrompt,
          provider: config.provider,
          model: config.model,
          temperature: config.temperature + 0.2, // Slightly different temperature
          maxTokens: config.maxTokens,
          topP: config.topP || 0.9,
        },
      ];
    }

    setAbTestConfigs(configs);
  }, [promptText, systemPrompt, config, prompt]);

  // A/B Testing functions
  const handleABTestSendMessage = async (configId: string, message: string) => {
    if (!message.trim()) return;

    const config = abTestConfigs.find((c) => c.id === configId);
    if (!config || abTestGenerating[configId]) return;

    const userMessage: ConversationMessage = {
      role: "user",
      content: message,
    };

    // Update conversation with user message
    setAbTestConversations((prev) => ({
      ...prev,
      [configId]: [...(prev[configId] || []), userMessage],
    }));
    setAbTestGenerating((prev) => ({ ...prev, [configId]: true }));

    try {
      const response = await generateABTestMessage(config, message);
      const assistantMessage: ConversationMessage = {
        role: "assistant",
        content: response,
      };

      // Update conversation with assistant message
      setAbTestConversations((prev) => ({
        ...prev,
        [configId]: [...(prev[configId] || []), assistantMessage],
      }));
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate response",
        variant: "destructive",
      });
    } finally {
      setAbTestGenerating((prev) => ({ ...prev, [configId]: false }));
    }
  };

  const generateABTestMessage = async (
    config: ABTestConfig,
    userMessage: string
  ): Promise<string> => {
    const client = getAIClient({
      provider: "google", // Default to Google for A/B testing
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
    });

    const conversationHistory = [
      ...(abTestConversations[config.id] || []),
      { role: "user" as const, content: userMessage },
    ];

    const fullSystemPrompt = config.systemPrompt
      ? `${config.systemPrompt}\n\n${config.promptText}`
      : config.promptText;

    const result = await generateText({
      model: client(config.model),
      messages: [
        { role: "assistant" as const, content: fullSystemPrompt },
        ...conversationHistory,
      ],
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
      topP: config.topP,
    });

    return result.text;
  };

  const handleABTestRegenerateMessage = async (
    configId: string,
    messageIndex: number
  ) => {
    const config = abTestConfigs.find((c) => c.id === configId);
    if (!config || abTestGenerating[configId]) return;

    const messages = abTestConversations[configId] || [];
    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0 || messages[userMessageIndex].role !== "user")
      return;

    const userMessage = messages[userMessageIndex].content;
    const messagesUpToUser = messages.slice(0, userMessageIndex);

    // Update conversation to remove the assistant message
    setAbTestConversations((prev) => ({
      ...prev,
      [configId]: messagesUpToUser,
    }));
    setAbTestGenerating((prev) => ({ ...prev, [configId]: true }));

    try {
      const response = await generateABTestMessage(config, userMessage);
      const assistantMessage: ConversationMessage = {
        role: "assistant",
        content: response,
      };

      // Update conversation with new assistant message
      setAbTestConversations((prev) => ({
        ...prev,
        [configId]: [...(prev[configId] || []), assistantMessage],
      }));
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to regenerate response",
        variant: "destructive",
      });
    } finally {
      setAbTestGenerating((prev) => ({ ...prev, [configId]: false }));
    }
  };

  const handleABTestClearConversation = (configId: string) => {
    setAbTestConversations((prev) => ({
      ...prev,
      [configId]: [],
    }));
  };

  const handleUpdateABTestConfig = (
    configId: string,
    updates: Partial<ABTestConfig>
  ) => {
    setAbTestConfigs((prev) =>
      prev.map((config) =>
        config.id === configId ? { ...config, ...updates } : config
      )
    );
  };

  const leftPanel = (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Configuration</h3>
      </div>
      <div className="flex-1">
        <Tabs defaultValue="prompt" className="h-full flex flex-col">
          <div className="px-4 py-2 border-b">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="model">Model</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="prompt"
            className="flex-1 p-4 space-y-4 overflow-y-auto"
          >
            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                value={editableSystemPrompt}
                onChange={(e) => {
                  setEditableSystemPrompt(e.target.value);
                  setProcessedSystemPrompt(e.target.value);
                }}
                className="min-h-[100px] text-sm"
                placeholder="Enter system prompt..."
              />
            </div>

            <div className="space-y-2">
              <Label>User Prompt Template</Label>
              <Textarea
                value={processedPromptText}
                readOnly
                className="min-h-[150px] text-sm"
                placeholder="No prompt template"
              />
            </div>

            <VariableEditor
              promptText={promptText}
              systemPrompt={systemPrompt}
              variables={{}}
              onPromptChange={setProcessedPromptText}
              onSystemPromptChange={setProcessedSystemPrompt}
              onVariablesChange={() => {}}
            />
          </TabsContent>

          <TabsContent value="model" className="flex-1 p-4 overflow-y-auto">
            <ModelConfig
              model={config.model}
              temperature={config.temperature}
              maxTokens={config.maxTokens}
              topP={config.topP || 0.9}
              onModelChange={(model) => setConfig({ ...config, model })}
              onTemperatureChange={(temperature) => setConfig({ ...config, temperature })}
              onMaxTokensChange={(maxTokens) => setConfig({ ...config, maxTokens })}
              onTopPChange={(topP) => setConfig({ ...config, topP })}
              showProvider={true}
              provider={config.provider}
              onProviderChange={(provider) => setConfig({ ...config, provider })}
              title="Model Configuration"
              description="Configure the AI model and parameters"
            />
          </TabsContent>

          <TabsContent value="stats" className="flex-1 p-4 overflow-y-auto">
            <UsageStats stats={usageStats} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  const rightPanel = (
    <div className="h-full">
      <ConversationTabs
        conversations={conversations}
        activeConversationId={activeConversationId}
        onActiveConversationChange={setActiveConversationId}
        onNewConversation={handleNewConversation}
        onCloseConversation={handleCloseConversation}
        onSendMessage={handleSendMessage}
        onRegenerateMessage={handleRegenerateMessage}
        onCopyMessage={handleCopyMessage}
        promptType={prompt?.type || "multi-turn"}
      />
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Interactive Playground</h2>
            <p className="text-sm text-muted-foreground">
              Test your prompt with live AI responses • {conversations.length}{" "}
              conversation{conversations.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {onSaveConversation && activeTab === "chat" && (
              <Button
                size="sm"
                onClick={handleSaveConversation}
                disabled={
                  !activeConversationId ||
                  conversations.find((c) => c.id === activeConversationId)
                    ?.messages.length === 0
                }
              >
                <Save className="h-4 w-4 mr-2" />
                Save Conversation
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "chat" | "ab-test")}
          className="flex-1 flex flex-col"
        >
          <div className="border-b px-4">
            <TabsList>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="ab-test">A/B Testing</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="flex-1">
            <ResizablePanel
              leftPanel={leftPanel}
              rightPanel={rightPanel}
              defaultLeftWidth={40}
              minWidth={25}
              maxWidth={60}
            />
          </TabsContent>

          <TabsContent value="ab-test" className="flex-1">
            <ABTestingPanel
              testConfigs={abTestConfigs}
              onSendMessage={handleABTestSendMessage}
              onRegenerateMessage={handleABTestRegenerateMessage}
              onCopyMessage={handleCopyMessage}
              conversations={abTestConversations}
              isGenerating={abTestGenerating}
              onClearConversation={handleABTestClearConversation}
              onUpdateConfig={handleUpdateABTestConfig}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Playground;

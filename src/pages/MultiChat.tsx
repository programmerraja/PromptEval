import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Play,
  Pause,
  Square,
  Bot,
  User,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  db,
  ConversationMessage,
  Prompt,
  Dataset,
  DatasetEntry,
} from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
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

interface AssistantState {
  messages: ConversationMessage[];
  isGenerating: boolean;
}

interface UserState {
  messages: ConversationMessage[];
  isGenerating: boolean;
}

interface ConversationState {
  displayMessages: ConversationMessage[];
  currentTurn: number;
  isActive: boolean;
  currentSpeaker: "assistant" | "user" | null;
}

const MultiChat = () => {
  const { toast } = useToast();
  const prompts = useLiveQuery(() => db.prompts.toArray());
  const datasets = useLiveQuery(() => db.datasets.toArray());

  const [selectedPromptId, setSelectedPromptId] = useState<string>("");

  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");

  const [maxTurns, setMaxTurns] = useState(10);

  const [initialMessage, setInitialMessage] = useState("");

  const [whoStartsFirst, setWhoStartsFirst] = useState<"assistant" | "user">(
    "assistant"
  );

  const [assistantConfig, setAssistantConfig] = useState<LLMConfig>({
    provider: "google",
    model: "gemini-2.5-flash",
    temperature: 0.7,
    maxTokens: 500,
    topP: 0.9,
  });

  const [userConfig, setUserConfig] = useState<LLMConfig>({
    provider: "google",
    model: "gemini-2.5-flash",
    temperature: 0.7,
    maxTokens: 500,
    topP: 0.9,
  });

  const getDefaultModel = (
    provider: "openai" | "anthropic" | "google"
  ): string => {
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

  // Use refs for state management
  const assistantStateRef = useRef<AssistantState>({
    messages: [],
    isGenerating: false,
  });

  const userStateRef = useRef<UserState>({
    messages: [],
    isGenerating: false,
  });

  // Dummy state to trigger UI re-renders
  const [renderTrigger, setRenderTrigger] = useState(0);

  // Helper functions to update refs and trigger re-renders
  const updateAssistantState = (newState: AssistantState) => {
    assistantStateRef.current = newState;
    setRenderTrigger(prev => prev + 1);
  };

  const updateUserState = (newState: UserState) => {
    userStateRef.current = newState;
    setRenderTrigger(prev => prev + 1);
  };

  const conversationState = useRef<ConversationState>(
    {
      displayMessages: [],
      currentTurn: 0,
      isActive: false,
      currentSpeaker: null,
    }
  );


  const [activeTab, setActiveTab] = useState("config");

  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    db.settings.get("default").then((s) => setSettings(s));
  }, []);

  const selectedPrompt = prompts?.find((p) => p.id === selectedPromptId);

  const selectedDataset = datasets?.find((d) => d.id === selectedDatasetId);

  const multiTurnDatasets =
    datasets?.filter((d) => d.type === "multi-turn") || [];

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

 

  const generateMessage = async (
    config: LLMConfig,
    systemPrompt: string,
    conversationHistory: ConversationMessage[]
  ) => {
    const client = getAIClient(config);

    const messages = [
      { role: "assistant" as const, content: systemPrompt },
      ...conversationHistory,
    ] as any;

    const result = await generateText({
      model: client(config.model),
      messages,
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
      topP: config.topP,
    });

    return result.text;
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

  const startConversation = async () => {
    if (!selectedPromptId || !selectedDatasetId) {
      toast({
        title: "Error",
        description: "Please select both a prompt and a dataset",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPrompt || !selectedDataset) {
      toast({
        title: "Error",
        description: "Selected prompt or dataset not found",
        variant: "destructive",
      });
      return;
    }

    const promptVersions = Object.keys(selectedPrompt.versions);
    const latestVersion = promptVersions[promptVersions.length - 1];
    const promptVersion = selectedPrompt.versions[latestVersion];

    const datasetEntry = selectedDataset.entries.find(
      (entry) => entry.type === "multi-turn"
    );
    if (!datasetEntry) {
      toast({
        title: "Error",
        description: "Selected dataset has no multi-turn entries",
        variant: "destructive",
      });
      return;
    }

    const assistantSystemPrompt = `${promptVersion.config.system_prompt}\n\n${promptVersion.text}`;

    const userSystemPrompt =`${datasetEntry.prompt || datasetEntry.input}`

    updateAssistantState({ messages: [], isGenerating: false });
    updateUserState({ messages: [], isGenerating: false });
    conversationState.current = {
      displayMessages: [],
      currentTurn: 0,
      isActive: true,
      currentSpeaker: null,
    };

    setActiveTab("conversation");
    try {
      // Start the conversation based on who goes first
      if (whoStartsFirst === "assistant") {
        await runAssistantTurn(assistantSystemPrompt, userSystemPrompt, "");
      } else {
        await runUserTurn(assistantSystemPrompt, userSystemPrompt, "");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to start conversation",
        variant: "destructive",
      });
      updateAssistantState({ messages: [], isGenerating: false });
      updateUserState({ messages: [], isGenerating: false });
      conversationState.current = {
        displayMessages: [],
        currentTurn: 0,
        isActive: false,
        currentSpeaker: null,
      };
    }
  };

  const runAssistantTurn = async (
    assistantSystemPrompt: string,
    userSystemPrompt: string,
    replyMessage: string
  ) => {
    if (conversationState.current.currentTurn >= maxTurns) {
      // conversationState.current = {
      //   ...conversationState.current,
      //   displayMessages: [],
      //   currentTurn: 0,
      //   isActive: false,
      //   currentSpeaker: null,
      // };
      toast({
        title: "Conversation completed",
        description: "Max turns reached",
      });
      return;
    }

    if(!conversationState.current.isActive) return;

    try {
      let content: string;
      let conversationHistory: ConversationMessage[] = [];
      if (conversationState.current.currentTurn === 0 && initialMessage ) {
        content = initialMessage;
      } else {
        if (replyMessage) {
          conversationHistory = [
            ...assistantStateRef.current.messages,
            { role: "user", content: replyMessage },
          ] as ConversationMessage[];
          content = await generateMessage(
            assistantConfig,
            assistantSystemPrompt,
            conversationHistory
          );
        }
      }

      const assistantMessage: ConversationMessage = {
        role: "assistant",
        content,
      };

      conversationHistory.push(assistantMessage);

      updateAssistantState({ messages: conversationHistory, isGenerating: false });
      conversationState.current = {
        ...conversationState.current,
        displayMessages: conversationHistory,
        currentTurn: conversationState.current.currentTurn + 1,
        currentSpeaker: null,
      };

      if (checkForEnd(content)) {
        conversationState.current = {
          ...conversationState.current,
          isActive: false,
          currentSpeaker: null,
        };
        toast({
          title: "Conversation ended",
          description: "Assistant indicated completion",
        });
        return;
      }

      // Continue with user turn
      setTimeout(() => {
        runUserTurn(assistantSystemPrompt, userSystemPrompt, content);
      }, 0);
    } catch (error) {
      conversationState.current = {
        ...conversationState.current,
        isActive: false,
        currentSpeaker: null,
      };
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate assistant message",
        variant: "destructive",
      });
    }
  };

  const runUserTurn = async (
    assistantSystemPrompt: string,
    userSystemPrompt: string,
    replyMessage: string
  ) => {
    if (conversationState.current.currentTurn >= maxTurns) {
      // conversationState.current = {
      //   ...conversationState.current,
      //   isActive: false,
      //   currentSpeaker: null,
      // };
      toast({
        title: "Conversation completed",
        description: "Max turns reached",
      });
      return;
    }

    if (!conversationState.current.isActive) return;

    // updateUserState({ messages: userStateRef.current.messages, isGenerating: true });
    conversationState.current = {
      ...conversationState.current,
      currentSpeaker: "user",
    };

    const conversationHistory = [
      ...userStateRef.current.messages,
      { role: "user", content: replyMessage },
    ] as ConversationMessage[];

    try {
      let content: string;
      if (conversationState.current.currentTurn === 0 && initialMessage &&  whoStartsFirst === "user") {
        content = initialMessage;
      } else {
        content = await generateMessage(
          userConfig,
          userSystemPrompt,
          conversationHistory
        );
      }
      const userMessage: ConversationMessage = { role: "assistant", content };

      conversationHistory.push(userMessage);
      updateUserState({ messages: conversationHistory, isGenerating: false });

      conversationState.current = {
        ...conversationState.current,
        currentTurn: conversationState.current.currentTurn + 1,
        
        currentSpeaker: null,
      };

      if (checkForEnd(content)) {
        conversationState.current = {
          ...conversationState.current,
          isActive: false,
          currentSpeaker: null,
        };
        toast({
          title: "Conversation ended",
          description: "User indicated completion",
        });
        return;
      }

      // Continue with assistant turn
      setTimeout(() => {
        runAssistantTurn(assistantSystemPrompt, userSystemPrompt, content);
      }, 0);
    } catch (error) {
      conversationState.current = {
        ...conversationState.current,
        isActive: false,
        currentSpeaker: null,
      };
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate user message",
        variant: "destructive",
      });
    }
  };

  const stopConversation = () => {
    updateAssistantState({
      messages: assistantStateRef.current.messages,
      isGenerating: false,
    });
    updateUserState({ messages: userStateRef.current.messages, isGenerating: false });
    conversationState.current = {
      ...conversationState.current,
      isActive: false,
      currentSpeaker: null,
    };
    toast({ title: "Stopped", description: "Conversation stopped" });
  };

  const resetConversation = () => {
    updateAssistantState({ messages: [], isGenerating: false });
    updateUserState({ messages: [], isGenerating: false });
    conversationState.current = {
      displayMessages: [],
      currentTurn: 0,
      isActive: false,
      currentSpeaker: null,
    };
    setActiveTab("config");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Multi-Chat Simulator</h1>
          <p className="text-muted-foreground">
            AI Assistant vs AI User conversation testing
          </p>
        </div>
        <div className="flex gap-2">
          {!conversationState.current.isActive && (
            <Button
              size="sm"
              onClick={startConversation}
              disabled={
                !selectedPromptId ||
                !selectedDatasetId ||
                assistantStateRef.current.isGenerating ||
                userStateRef.current.isGenerating
              }
            >
              <Play className="h-4 w-4 mr-2" />
              Start Conversation
            </Button>
          )}
          {conversationState.current.isActive && (
            <Button size="sm" variant="destructive" onClick={stopConversation}>
              <Square className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          {conversationState.current.displayMessages.length > 0 && (
            <Button size="sm" variant="outline" onClick={resetConversation}>
              Reset
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="conversation">Conversation</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Setup</CardTitle>
              <CardDescription>
                Configure the conversation parameters and select
                prompts/datasets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prompt</Label>
                  <Select
                    value={selectedPromptId}
                    onValueChange={setSelectedPromptId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a prompt" />
                    </SelectTrigger>
                    <SelectContent>
                      {prompts?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dataset (Multi-turn only)</Label>
                  <Select
                    value={selectedDatasetId}
                    onValueChange={setSelectedDatasetId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {multiTurnDatasets.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Turns</Label>
                  <Input
                    type="number"
                    value={maxTurns}
                    onChange={(e) =>
                      setMaxTurns(parseInt(e.target.value) || 10)
                    }
                    min={1}
                    max={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Who starts first?</Label>
                  <RadioGroup
                    value={whoStartsFirst}
                    onValueChange={(value: "assistant" | "user") =>
                      setWhoStartsFirst(value)
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="assistant" id="assistant" />
                      <Label htmlFor="assistant">Assistant</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="user" id="user" />
                      <Label htmlFor="user">User</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Initial Message (optional)</Label>
                <Textarea
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  placeholder="Optional: Provide the first message if assistant starts first"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assistant Model</CardTitle>
                <CardDescription>The AI assistant being tested</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={assistantConfig.provider}
                    onValueChange={(v: any) =>
                      setAssistantConfig({
                        ...assistantConfig,
                        provider: v,
                        model: getDefaultModel(v),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google (Gemini)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    value={assistantConfig.model}
                    onChange={(e) =>
                      setAssistantConfig({
                        ...assistantConfig,
                        model: e.target.value,
                      })
                    }
                    placeholder="e.g., gpt-4o-mini"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>Temperature</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={assistantConfig.temperature}
                      onChange={(e) =>
                        setAssistantConfig({
                          ...assistantConfig,
                          temperature: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Tokens</Label>
                    <Input
                      type="number"
                      value={assistantConfig.maxTokens}
                      onChange={(e) =>
                        setAssistantConfig({
                          ...assistantConfig,
                          maxTokens: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Top P</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={assistantConfig.topP || 0.9}
                      onChange={(e) =>
                        setAssistantConfig({
                          ...assistantConfig,
                          topP: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">User Model</CardTitle>
                <CardDescription>
                  Simulates user behavior from dataset
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={userConfig.provider}
                    onValueChange={(v: any) =>
                      setUserConfig({
                        ...userConfig,
                        provider: v,
                        model: getDefaultModel(v),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google (Gemini)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    value={userConfig.model}
                    onChange={(e) =>
                      setUserConfig({ ...userConfig, model: e.target.value })
                    }
                    placeholder="e.g., gpt-4o-mini"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>Temperature</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={userConfig.temperature}
                      onChange={(e) =>
                        setUserConfig({
                          ...userConfig,
                          temperature: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Tokens</Label>
                    <Input
                      type="number"
                      value={userConfig.maxTokens}
                      onChange={(e) =>
                        setUserConfig({
                          ...userConfig,
                          maxTokens: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Top P</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={userConfig.topP || 0.9}
                      onChange={(e) =>
                        setUserConfig({
                          ...userConfig,
                          topP: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversation">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Conversation</CardTitle>
                  <CardDescription>
                    Turn {conversationState.current.currentTurn} / {maxTurns} · Status:{" "}
                    {conversationState.current.isActive ? "Active" : "Stopped"} ·
                    {(assistantStateRef.current.isGenerating || userStateRef.current.isGenerating) &&
                      `Generating ${conversationState.current.currentSpeaker} message...`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              {conversationState.current.displayMessages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Configure settings and start a conversation
                </div>
              ) : (
                <div className="space-y-4">
                  {conversationState.current.displayMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${
                        msg.role === "assistant" ? "justify-end" : ""
                      }`}
                    >
                      <div
                        className={`flex gap-3 max-w-[80%] ${
                          msg.role === "assistant" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            msg.role === "user"
                              ? "bg-primary/10"
                              : "bg-secondary"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="text-xs text-muted-foreground font-medium">
                            {msg.role === "user" ? "AI User" : "AI Assistant"}
                          </div>
                          <div
                            className={`rounded-lg p-3 ${
                              msg.role === "user"
                                ? "bg-muted"
                                : "bg-primary text-primary-foreground"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(assistantStateRef.current.isGenerating || userStateRef.current.isGenerating) &&
                    conversationState.current.currentSpeaker && (
                      <div
                        className={`flex gap-3 ${
                          conversationState.current.currentSpeaker === "assistant"
                            ? "justify-end"
                            : ""
                        }`}
                      >
                        <div
                          className={`flex gap-3 max-w-[80%] ${
                              conversationState.current.currentSpeaker === "assistant"
                              ? "flex-row-reverse"
                              : ""
                          }`}
                        >
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              conversationState.current.currentSpeaker === "user"
                                ? "bg-primary/10"
                                : "bg-secondary"
                            }`}
                          >
                            {conversationState.current.currentSpeaker === "user" ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground font-medium">
                              {conversationState.current.currentSpeaker === "user"
                                ? "AI User"
                                : "AI Assistant"}{" "}
                              is typing...
                            </div>
                            <div
                              className={`rounded-lg p-3 ${
                                conversationState.current.currentSpeaker === "user"
                                  ? "bg-muted"
                                  : "bg-primary text-primary-foreground"
                              }`}
                            >
                              <div className="flex gap-1">
                                <div
                                  className="w-2 h-2 rounded-full bg-current animate-bounce"
                                  style={{ animationDelay: "0ms" }}
                                />
                                <div
                                  className="w-2 h-2 rounded-full bg-current animate-bounce"
                                  style={{ animationDelay: "150ms" }}
                                />
                                <div
                                  className="w-2 h-2 rounded-full bg-current animate-bounce"
                                  style={{ animationDelay: "300ms" }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MultiChat;

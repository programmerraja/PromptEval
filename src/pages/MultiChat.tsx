import { useState, useEffect } from "react";
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
  Square,
  Bot,
  User,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  db,
  ConversationMessage,
} from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useMultiTurnSimulation, LLMConfig } from "@/hooks/useMultiTurnSimulation";

const MultiChat = () => {
  const { toast } = useToast();
  const prompts = useLiveQuery(() => db.prompts.toArray());
  const datasets = useLiveQuery(() => db.datasets.toArray());

  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [maxTurns, setMaxTurns] = useState(10);
  const [initialMessage, setInitialMessage] = useState("");
  const [whoStartsFirst, setWhoStartsFirst] = useState<"assistant" | "user">("assistant");

  const [activeTab, setActiveTab] = useState("config");
  const [settings, setSettings] = useState<any>(null);

  const [assistantConfig, setAssistantConfig] = useState<LLMConfig>({
    provider: "google",
    model: "gemini-2.5-flash",
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9,
  });

  const [userConfig, setUserConfig] = useState<LLMConfig>({
    provider: "google",
    model: "gemini-2.5-flash",
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9,
  });

  // Use the new hook
  const { simulationState, startSimulation, stopSimulation, resetSimulation } = useMultiTurnSimulation({
    onSimulationComplete: (messages, reason) => {
      toast({
        title: "Simulation Completed",
        description: reason,
      });
    },
    onError: (error) => {
      toast({
        title: "Simulation Error",
        description: error,
        variant: "destructive"
      })
    }
  });

  useEffect(() => {
    db.settings.get("default").then((s) => setSettings(s));
  }, []);

  const selectedPrompt = prompts?.find((p) => p.id === selectedPromptId);
  const selectedDataset = datasets?.find((d) => d.id === selectedDatasetId);
  const multiTurnDatasets = datasets?.filter((d) => d.type === "multi-turn") || [];

  const getDefaultModel = (provider: "openai" | "anthropic" | "google"): string => {
    switch (provider) {
      case "openai": return "gpt-4o-mini";
      case "anthropic": return "claude-3-5-sonnet-20241022";
      case "google": return "gemini-2.5-flash";
      default: return "gpt-4o-mini";
    }
  };

  const handleStartConversation = async () => {
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
    // Use the extractedPrompt if available, otherwise fallback to entry prompt/input
    const userSystemPrompt = datasetEntry.extractedPrompt || datasetEntry.prompt || datasetEntry.input || "You are a user simulating a conversation.";

    setActiveTab("conversation");

    startSimulation(
      assistantConfig,
      userConfig,
      assistantSystemPrompt,
      userSystemPrompt,
      maxTurns,
      initialMessage,
      whoStartsFirst
    );
  };

  const handleReset = () => {
    resetSimulation();
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
          {!simulationState.isActive && (
            <Button
              size="sm"
              onClick={handleStartConversation}
              disabled={!selectedPromptId || !selectedDatasetId}
            >
              <Play className="h-4 w-4 mr-2" />
              Start Conversation
            </Button>
          )}
          {simulationState.isActive && (
            <Button size="sm" variant="destructive" onClick={stopSimulation}>
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          )}
          {simulationState.messages.length > 0 && !simulationState.isActive && (
            <Button size="sm" variant="outline" onClick={handleReset}>
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
                Configure the conversation parameters and select prompts/datasets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prompt</Label>
                  <Select value={selectedPromptId} onValueChange={setSelectedPromptId}>
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
                  <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
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
                    onChange={(e) => setMaxTurns(parseInt(e.target.value) || 10)}
                    min={1}
                    max={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Who starts first?</Label>
                  <RadioGroup
                    value={whoStartsFirst}
                    onValueChange={(value: "assistant" | "user") => setWhoStartsFirst(value)}
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
                  placeholder="Optional: Provide the first message if assistant starts first, or the user's first query."
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    onChange={(e) => setAssistantConfig({ ...assistantConfig, model: e.target.value })}
                  />
                </div>
                {/* Temp & MaxTokens inputs omitted for brevity, reusing User Model style or similar if needed. 
                    Assuming basic config is fine for now, or copy full UI if needed. 
                    (Re-adding full UI below to match original fidelity) 
                */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>Temperature</Label>
                    <Input type="number" step="0.1" value={assistantConfig.temperature} onChange={(e) => setAssistantConfig({ ...assistantConfig, temperature: parseFloat(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Tokens</Label>
                    <Input type="number" value={assistantConfig.maxTokens} onChange={(e) => setAssistantConfig({ ...assistantConfig, maxTokens: parseInt(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Top P</Label>
                    <Input type="number" step="0.1" value={assistantConfig.topP} onChange={(e) => setAssistantConfig({ ...assistantConfig, topP: parseFloat(e.target.value) })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">User Model</CardTitle>
                <CardDescription>Simulates user behavior from dataset</CardDescription>
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    onChange={(e) => setUserConfig({ ...userConfig, model: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>Temperature</Label>
                    <Input type="number" step="0.1" value={userConfig.temperature} onChange={(e) => setUserConfig({ ...userConfig, temperature: parseFloat(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Tokens</Label>
                    <Input type="number" value={userConfig.maxTokens} onChange={(e) => setUserConfig({ ...userConfig, maxTokens: parseInt(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Top P</Label>
                    <Input type="number" step="0.1" value={userConfig.topP} onChange={(e) => setUserConfig({ ...userConfig, topP: parseFloat(e.target.value) })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversation" className="space-y-4">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b py-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Conversation Live View</CardTitle>
                  <CardDescription>Turn {simulationState.currentTurn} / {maxTurns}</CardDescription>
                </div>
                {simulationState.isActive && (
                  <div className="flex items-center gap-2 text-primary animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">
                      {simulationState.currentSpeaker === 'assistant' ? 'Assistant Generating...' : 'User Simulation Generating...'}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {simulationState.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === "assistant" ? "justify-start" : "justify-end"
                    }`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${msg.role === "assistant"
                        ? "bg-muted"
                        : "bg-primary text-primary-foreground"
                      }`}
                  >
                    <p className="text-xs font-semibold mb-1 opacity-70 mb-1">
                      {msg.role === "assistant" ? "Assistant" : "Simulated User"}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role !== "assistant" && (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0 text-primary-foreground">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {simulationState.messages.length === 0 && !simulationState.isActive && (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center opacity-50">
                  <Bot className="h-12 w-12 mb-4" />
                  <p>Start the conversation to see the simulation in action</p>
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

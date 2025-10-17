import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, RotateCcw, Copy, Bot, User, Loader2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConversationMessage } from "@/lib/db";

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

interface ABTestingPanelProps {
  testConfigs: ABTestConfig[];
  onSendMessage: (configId: string, message: string) => void;
  onRegenerateMessage: (configId: string, messageIndex: number) => void;
  onCopyMessage: (content: string) => void;
  conversations: Record<string, ConversationMessage[]>;
  isGenerating: Record<string, boolean>;
  onClearConversation: (configId: string) => void;
  onUpdateConfig?: (configId: string, updates: Partial<ABTestConfig>) => void;
}

const ABTestingPanel = ({
  testConfigs,
  onSendMessage,
  onRegenerateMessage,
  onCopyMessage,
  conversations,
  isGenerating,
  onClearConversation,
  onUpdateConfig,
}: ABTestingPanelProps) => {
  const [activeConfigId, setActiveConfigId] = useState<string>(testConfigs[0]?.id || "");
  const [inputMessage, setInputMessage] = useState("");
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<Partial<ABTestConfig>>({});
  const { toast } = useToast();

  const handleSendMessage = () => {
    if (inputMessage.trim() && activeConfigId) {
      onSendMessage(activeConfigId, inputMessage.trim());
      setInputMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    onCopyMessage(content);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  const handleEditConfig = (config: ABTestConfig) => {
    setEditingConfigId(config.id);
    setEditingConfig({
      provider: config.provider,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
    });
  };

  const handleSaveConfig = () => {
    if (editingConfigId && onUpdateConfig) {
      onUpdateConfig(editingConfigId, editingConfig);
      setEditingConfigId(null);
      setEditingConfig({});
      toast({
        title: "Configuration updated",
        description: "Model configuration has been updated",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingConfigId(null);
    setEditingConfig({});
  };

  const activeConfig = testConfigs.find(c => c.id === activeConfigId);
  const activeMessages = conversations[activeConfigId] || [];
  const activeIsGenerating = isGenerating[activeConfigId] || false;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">A/B Testing</h3>
            <p className="text-sm text-muted-foreground">
              Compare different prompt versions side by side
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onClearConversation(activeConfigId)}
              disabled={activeMessages.length === 0 || activeIsGenerating}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-row">
        {/* Left Panel - Test Configs */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b">
            <h4 className="font-medium">Test Configurations</h4>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {testConfigs.map((config) => (
                <Card
                  key={config.id}
                  className={`transition-colors ${
                    activeConfigId === config.id
                      ? "ring-2 ring-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 
                          className="font-medium text-sm cursor-pointer flex-1"
                          onClick={() => setActiveConfigId(config.id)}
                        >
                          {config.name}
                        </h5>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {conversations[config.id]?.length || 0}
                          </Badge>
                          {onUpdateConfig && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditConfig(config);
                              }}
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {editingConfigId === config.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Provider</Label>
                              <Select
                                value={editingConfig.provider || config.provider}
                                onValueChange={(value) => setEditingConfig({...editingConfig, provider: value as "openai" | "anthropic" | "google"})}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="openai">OpenAI</SelectItem>
                                  <SelectItem value="anthropic">Anthropic</SelectItem>
                                  <SelectItem value="google">Google</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Model</Label>
                              <Input
                                value={editingConfig.model || config.model}
                                onChange={(e) => setEditingConfig({...editingConfig, model: e.target.value})}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Temp</Label>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="2"
                                value={editingConfig.temperature || config.temperature}
                                onChange={(e) => setEditingConfig({...editingConfig, temperature: parseFloat(e.target.value)})}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Max Tokens</Label>
                              <Input
                                type="number"
                                value={editingConfig.maxTokens || config.maxTokens}
                                onChange={(e) => setEditingConfig({...editingConfig, maxTokens: parseInt(e.target.value)})}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Top P</Label>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="1"
                                value={editingConfig.topP || config.topP}
                                onChange={(e) => setEditingConfig({...editingConfig, topP: parseFloat(e.target.value)})}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" onClick={handleSaveConfig} className="h-6 text-xs">
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-6 text-xs">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-xs text-muted-foreground">
                            <div>Provider: {config.provider}</div>
                            <div>Model: {config.model}</div>
                            <div>Temp: {config.temperature}</div>
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {config.promptText.substring(0, 100)}...
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Chat Interface */}
        <div className="flex-1 flex flex-col">
          {activeConfig ? (
            <>
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{activeConfig.name}</h4>
                    <div className="text-sm text-muted-foreground">
                      {activeConfig.model} • Temp: {activeConfig.temperature} • Max: {activeConfig.maxTokens}
                    </div>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {activeMessages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Start a conversation to test this configuration</p>
                    </div>
                  ) : (
                    activeMessages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${
                          message.role === "assistant" ? "justify-end" : ""
                        }`}
                      >
                        <div
                          className={`flex gap-3 max-w-[80%] ${
                            message.role === "assistant" ? "flex-row-reverse" : ""
                          }`}
                        >
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              message.role === "user"
                                ? "bg-primary/10"
                                : "bg-secondary"
                            }`}
                          >
                            {message.role === "user" ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="text-xs text-muted-foreground font-medium">
                              {message.role === "user" ? "You" : "Assistant"}
                            </div>
                            <div
                              className={`rounded-lg p-3 ${
                                message.role === "user"
                                  ? "bg-muted"
                                  : "bg-primary text-primary-foreground"
                              }`}
                            >
                              <div className="whitespace-pre-wrap">{message.content}</div>
                              {message.role === "assistant" && (
                                <div className="flex gap-1 mt-2 opacity-70">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => handleCopy(message.content)}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => onRegenerateMessage(activeConfigId, index)}
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Regenerate
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {activeIsGenerating && (
                    <div className="flex gap-3 justify-end">
                      <div className="flex gap-3 max-w-[80%] flex-row-reverse">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 bg-secondary">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground font-medium">
                            Assistant is typing...
                          </div>
                          <div className="rounded-lg p-3 bg-primary text-primary-foreground">
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
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message here..."
                    className="flex-1 px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    disabled={activeIsGenerating}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || activeIsGenerating}
                    size="sm"
                  >
                    {activeIsGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Select a configuration to start testing</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ABTestingPanel;

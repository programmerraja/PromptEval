import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Loader2, Copy, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConversationMessage } from "@/lib/db";

interface PlaygroundChatProps {
  messages: ConversationMessage[];
  isGenerating: boolean;
  onSendMessage: (message: string) => void;
  onRegenerateMessage: (messageIndex: number) => void;
  onCopyMessage: (content: string) => void;
}

const PlaygroundChat = ({
  messages,
  isGenerating,
  onSendMessage,
  onRegenerateMessage,
  onCopyMessage,
}: PlaygroundChatProps) => {
  const [inputMessage, setInputMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (inputMessage.trim() && !isGenerating) {
      onSendMessage(inputMessage.trim());
      setInputMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Playground Chat</CardTitle>
        <p className="text-sm text-muted-foreground">
          Test your prompt with live AI responses
        </p>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Start a conversation to test your prompt</p>
              </div>
            ) : (
              messages.map((message, index) => (
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
                          <div className="flex gap-2 mt-3 opacity-70">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-3 text-xs"
                              onClick={() => handleCopy(message.content)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-3 text-xs"
                              onClick={() => onRegenerateMessage(index)}
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
            
            {isGenerating && (
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
        
        <div className="p-4 border-t bg-muted/30">
          <div className="flex gap-3">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message here..."
              className="flex-1 min-h-[60px] max-h-[120px] resize-none"
              disabled={isGenerating}
            />
            <Button
              onClick={handleSend}
              disabled={!inputMessage.trim() || isGenerating}
              size="sm"
              className="self-end h-10 px-4"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </div>
  );
};

export default PlaygroundChat;

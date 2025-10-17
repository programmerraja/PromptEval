import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, MessageSquare } from "lucide-react";
import { ConversationMessage } from "@/lib/db";
import PlaygroundChat from "./PlaygroundChat";

interface Conversation {
  id: string;
  name: string;
  messages: ConversationMessage[];
  isGenerating: boolean;
}

interface ConversationTabsProps {
  conversations: Conversation[];
  activeConversationId: string;
  onActiveConversationChange: (id: string) => void;
  onNewConversation: () => void;
  onCloseConversation: (id: string) => void;
  onSendMessage: (conversationId: string, message: string) => void;
  onRegenerateMessage: (conversationId: string, messageIndex: number) => void;
  onCopyMessage: (content: string) => void;
  promptType?: "single-turn" | "multi-turn";
}

const ConversationTabs = ({
  conversations,
  activeConversationId,
  onActiveConversationChange,
  onNewConversation,
  onCloseConversation,
  onSendMessage,
  onRegenerateMessage,
  onCopyMessage,
  promptType = "multi-turn",
}: ConversationTabsProps) => {
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleSendMessage = (message: string) => {
    if (activeConversationId) {
      onSendMessage(activeConversationId, message);
    }
  };

  const handleRegenerateMessage = (messageIndex: number) => {
    if (activeConversationId) {
      onRegenerateMessage(activeConversationId, messageIndex);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b">
        <Tabs value={activeConversationId} onValueChange={onActiveConversationChange}>
          <div className="flex items-center justify-between px-4 py-3">
            <TabsList className="h-9">
              {conversations.map((conversation) => (
                <TabsTrigger
                  key={conversation.id}
                  value={conversation.id}
                  className="flex items-center gap-2 px-3 py-1 h-7 text-xs"
                >
                  <MessageSquare className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">
                    {conversation.name}
                  </span>
                  {conversation.messages.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-xs font-mono">
                      {conversation.messages.length}
                    </Badge>
                  )}
                  {conversations.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseConversation(conversation.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button
              size="sm"
              variant="outline"
              onClick={onNewConversation}
              className="h-8 px-3"
            >
              <Plus className="h-3 w-3 mr-1" />
              New Chat
            </Button>
          </div>
        </Tabs>
      </div>

      <div className="flex-1">
        {activeConversation ? (
          <PlaygroundChat
            messages={activeConversation.messages}
            isGenerating={activeConversation.isGenerating}
            onSendMessage={handleSendMessage}
            onRegenerateMessage={handleRegenerateMessage}
            onCopyMessage={onCopyMessage}
            promptType={promptType}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No conversations yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={onNewConversation}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Start a conversation
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationTabs;

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatasetEntry, ConversationMessage } from "@/lib/db";
import { Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DatasetEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: DatasetEntry;
  datasetType: "single-turn" | "multi-turn";
  onSave: (entry: Omit<DatasetEntry, "id" | "created_at">) => void;
}

export const DatasetEntryDialog = ({ open, onOpenChange, entry, datasetType, onSave }: DatasetEntryDialogProps) => {
  const [type, setType] = useState<"single-turn" | "multi-turn">(datasetType);
  const [title, setTitle] = useState("");
  const [input, setInput] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [systemContext, setSystemContext] = useState("");
  const [userStyle, setUserStyle] = useState("");
  const [userFormality, setUserFormality] = useState("semi-formal");
  const [userGoal, setUserGoal] = useState("");
  const [conversation, setConversation] = useState<ConversationMessage[]>([{ role: "user", content: "" }]);

  useEffect(() => {
    if (entry) {
      setType(entry.type);
      setTitle(entry.title || "");
      setInput(entry.input || "");
      setExpectedBehavior(entry.expected_behavior || "");
      setSystemContext(entry.system_context || "");
      setUserStyle(entry.user_behavior?.style || "");
      setUserFormality(entry.user_behavior?.formality || "semi-formal");
      setUserGoal(entry.user_behavior?.goal || "");
      setConversation(entry.conversation || [{ role: "user", content: "" }]);
    } else {
      setType(datasetType);
      setTitle("");
      setInput("");
      setExpectedBehavior("");
      setSystemContext("");
      setUserStyle("");
      setUserFormality("semi-formal");
      setUserGoal("");
      setConversation([{ role: "user", content: "" }]);
    }
  }, [entry, datasetType, open]);

  const handleSave = () => {
    const baseEntry = {
      type,
      title: title || undefined,
      expected_behavior: expectedBehavior || undefined,
    };

    if (type === "single-turn") {
      onSave({
        ...baseEntry,
        type: "single-turn",
        input,
      });
    } else {
      onSave({
        ...baseEntry,
        type: "multi-turn",
        system_context: systemContext || undefined,
        user_behavior: {
          style: userStyle || undefined,
          formality: userFormality,
          goal: userGoal || undefined,
        },
        conversation: conversation.filter(msg => msg.content.trim()),
      });
    }
    onOpenChange(false);
  };

  const addMessage = () => {
    const lastRole = conversation[conversation.length - 1]?.role || "user";
    const nextRole = lastRole === "user" ? "assistant" : "user";
    setConversation([...conversation, { role: nextRole, content: "" }]);
  };

  const updateMessage = (index: number, content: string) => {
    const updated = [...conversation];
    updated[index].content = content;
    setConversation(updated);
  };

  const deleteMessage = (index: number) => {
    setConversation(conversation.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit Entry" : "New Dataset Entry"}</DialogTitle>
          <DialogDescription>
            {type === "single-turn" ? "Create a single-turn test case" : "Create a multi-turn conversation scenario"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Password Reset Scenario"
            />
          </div>

          {type === "single-turn" ? (
            <>
              <div>
                <Label htmlFor="input">Input *</Label>
                <Textarea
                  id="input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter the user input..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="expected">Expected Behavior (optional)</Label>
                <Textarea
                  id="expected"
                  value={expectedBehavior}
                  onChange={(e) => setExpectedBehavior(e.target.value)}
                  placeholder="Describe what the assistant should do..."
                  rows={3}
                />
              </div>
            </>
          ) : (
            <Tabs defaultValue="conversation" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="conversation">Conversation</TabsTrigger>
                <TabsTrigger value="context">Context & Behavior</TabsTrigger>
              </TabsList>
              
              <TabsContent value="conversation" className="space-y-4">
                <div className="space-y-2">
                  {conversation.map((msg, idx) => (
                    <div key={idx} className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <Label>{msg.role === "user" ? "User" : "Assistant"}</Label>
                        <Textarea
                          value={msg.content}
                          onChange={(e) => updateMessage(idx, e.target.value)}
                          placeholder={`${msg.role} message...`}
                          rows={2}
                        />
                      </div>
                      {conversation.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMessage(idx)}
                          className="mt-7"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button onClick={addMessage} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Message
                </Button>
              </TabsContent>
              
              <TabsContent value="context" className="space-y-4">
                <div>
                  <Label htmlFor="system-context">System Context</Label>
                  <Textarea
                    id="system-context"
                    value={systemContext}
                    onChange={(e) => setSystemContext(e.target.value)}
                    placeholder="e.g., The assistant is a helpful tech support agent..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="user-style">User Communication Style</Label>
                  <Input
                    id="user-style"
                    value={userStyle}
                    onChange={(e) => setUserStyle(e.target.value)}
                    placeholder="e.g., Conversational, frustrated but polite"
                  />
                </div>
                
                <div>
                  <Label htmlFor="formality">Formality Level</Label>
                  <Select value={userFormality} onValueChange={setUserFormality}>
                    <SelectTrigger id="formality">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="semi-formal">Semi-formal</SelectItem>
                      <SelectItem value="informal">Informal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="user-goal">User Goal</Label>
                  <Textarea
                    id="user-goal"
                    value={userGoal}
                    onChange={(e) => setUserGoal(e.target.value)}
                    placeholder="What is the user trying to achieve?"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="expected-behavior">Expected Behavior</Label>
                  <Textarea
                    id="expected-behavior"
                    value={expectedBehavior}
                    onChange={(e) => setExpectedBehavior(e.target.value)}
                    placeholder="How should the assistant respond?"
                    rows={3}
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {entry ? "Save Changes" : "Create Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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
        prompt:input,
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

            <>
              <div>
                <Label htmlFor="input">{type === "single-turn" ? "Input *": "Prompt *"} </Label>
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

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatasetEntry, ConversationMessage } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

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

  // Single Turn Fields
  const [input, setInput] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");

  // Multi Turn Fields
  const [extractedPrompt, setExtractedPrompt] = useState("");
  const [conversationJson, setConversationJson] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    if (entry) {
      setType(entry.type);
      setTitle(entry.title || "");
      if (entry.type === "single-turn") {
        setInput(entry.input || "");
        setExpectedBehavior(entry.expected_behavior || "");
      } else {
        setExtractedPrompt(entry.extractedPrompt || entry.prompt || "");
        setConversationJson(JSON.stringify(entry.conversation || [], null, 2));
      }
    } else {
      setType(datasetType);
      setTitle("");
      setInput("");
      setExpectedBehavior("");
      setExtractedPrompt("");
      setConversationJson("");
    }
  }, [entry, datasetType, open]);

  const handleSave = () => {
    let entryData: Omit<DatasetEntry, "id" | "created_at">;

    if (type === "single-turn") {
      entryData = {
        type: "single-turn",
        title,
        input,
        expected_behavior: expectedBehavior,
      };
    } else {
      let parsedConversation: ConversationMessage[] = [];
      try {
        if (conversationJson.trim()) {
          parsedConversation = JSON.parse(conversationJson);
          if (!Array.isArray(parsedConversation)) {
            throw new Error("Conversation must be an array");
          }
        }
      } catch (e) {
        toast({
          title: "Invalid JSON",
          description: "Please check your conversation JSON format",
          variant: "destructive"
        });
        return;
      }

      entryData = {
        type: "multi-turn",
        title,
        extractedPrompt: extractedPrompt,
        conversation: parsedConversation,
        // Map extractedPrompt to prompt as well if needed for compatibility, 
        // but schema has extractedPrompt separate. 
        // Logic in Evaluations uses prompt or extractedPrompt?
        // Let's stick to extractedPrompt field being the primary source for this new data entry.
        // But some legacy code might look at 'prompt' for single turn or multi-turn context.
        // Currently DB interface has `prompt?: string` and `extractedPrompt?: string`.
        prompt: extractedPrompt // Duplicate it to be safe or just use extractedPrompt
      };
    }

    onSave(entryData);
    onOpenChange(false);
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
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entry Title"
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
                  rows={5}
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
            <>
              <div>
                <Label htmlFor="extractedPrompt">Extracted Prompt (System Prompt / Context)</Label>
                <Textarea
                  id="extractedPrompt"
                  value={extractedPrompt}
                  onChange={(e) => setExtractedPrompt(e.target.value)}
                  placeholder="Paste the extracted prompt or system context here..."
                  rows={5}
                />
              </div>
              <div>
                <Label htmlFor="conversation">Conversation (JSON)</Label>
                <Textarea
                  id="conversation"
                  value={conversationJson}
                  onChange={(e) => setConversationJson(e.target.value)}
                  placeholder='[{"role": "user", "content": "..."}]'
                  className="font-mono text-sm"
                  rows={10}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste the conversation history in JSON format.
                </p>
              </div>
            </>
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

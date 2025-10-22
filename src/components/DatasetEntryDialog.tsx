import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatasetEntry, ConversationMessage, db } from "@/lib/db";
import { Plus, Trash2, Wand2, MessageSquare, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

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
  
  // Extraction state
  const [activeTab, setActiveTab] = useState<"manual" | "extract">("manual");
  const [extractionPrompt, setExtractionPrompt] = useState("");
  const [extractedData, setExtractedData] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (entry) {
      setType(entry.type);
      setTitle(entry.title || "");
      setInput(entry.input || entry.prompt || "");
   
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

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      const settingsData = await db.settings.get("default");
      setSettings(settingsData);
      if (settingsData?.global_extraction_prompt) {
        setExtractionPrompt(settingsData.global_extraction_prompt);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const extractConversationData = async () => {
    if (!extractionPrompt || !settings) return;

    setIsExtracting(true);
    try {
      // Format conversation for extraction
      const conversationText = conversation
        .filter(msg => msg.content.trim())
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n');

      const client = createGoogleGenerativeAI({
        apiKey: settings.api_keys?.google || process.env.GOOGLE_API_KEY,
      });

      const { text } = await generateText({
        model: client('gemini-2.5-flash'),
        prompt: `${extractionPrompt}\n\nConversation:\n${conversationText}`,
        temperature: 0.1,
      });

      setExtractedData(text);
      setInput(text);
    } catch (error) {
      console.error("Extraction failed:", error);
      toast({
        title: "Extraction Failed",
        description: "Failed to extract data from conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

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
      // For multi-turn, use extracted data if available, otherwise use manual input
      const promptText = extractedData || input;
      onSave({
        ...baseEntry,
        type: "multi-turn",
        prompt: promptText,
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
                  rows={20}
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
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "manual" | "extract")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="extract" className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Extract from Conversation
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Manual Entry
                </TabsTrigger>
              </TabsList>

              <TabsContent value="extract" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="extraction-prompt">Extraction Prompt</Label>
                    <Textarea
                      id="extraction-prompt"
                      value={extractionPrompt}
                      onChange={(e) => setExtractionPrompt(e.target.value)}
                      placeholder="Enter extraction prompt..."
                      className="text-sm"
                      rows={20}

                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This prompt will be used to extract structured data from the conversation.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={extractConversationData}
                      disabled={isExtracting || !extractionPrompt.trim()}
                      size="sm"
                    >
                      {isExtracting ? "Extracting..." : "Extract Data"}
                    </Button>
                    <Button
                      onClick={() => setExtractionPrompt(settings?.global_extraction_prompt || "")}
                      variant="outline"
                      size="sm"
                    >
                      Reset to Global
                    </Button>
                  </div>

                  {extractedData && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Extracted Data</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          {/* <Label className="text-xs font-medium">Extracted Text</Label> */}
                          <Textarea
                            value={extractedData}
                            onChange={(e) => {
                              setExtractedData(e.target.value);
                              setInput(e.target.value);
                            }}
                            className="min-h-[120px] text-sm"
                            placeholder="Extracted text will appear here..."
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            You can edit the extracted text before saving.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Conversation ({conversation.filter(msg => msg.content.trim()).length} messages)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {conversation
                          .filter(msg => msg.content.trim())
                          .map((message, index) => (
                            <div key={index} className="text-xs">
                              <Badge variant={message.role === "user" ? "default" : "secondary"} className="text-xs">
                                {message.role}
                              </Badge>
                              <span className="ml-2 text-muted-foreground">
                                {message.content.substring(0, 100)}
                                {message.content.length > 100 && "..."}
                              </span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <div>
                  <Label htmlFor="input">Prompt *</Label>
                  <Textarea
                    id="input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter the prompt text..."
                    rows={20}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the prompt text that will be used for evaluation.
                  </p>
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

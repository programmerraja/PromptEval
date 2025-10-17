import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Database, MessageSquare, FileText, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dataset, DatasetEntry, ConversationMessage, db } from "@/lib/db";

interface AddToDatasetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ConversationMessage[];
  promptType?: "single-turn" | "multi-turn";
}

const AddToDatasetDialog = ({
  isOpen,
  onClose,
  messages,
  promptType = "multi-turn"
}: AddToDatasetDialogProps) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [newDatasetName, setNewDatasetName] = useState("");
  const [newDatasetDescription, setNewDatasetDescription] = useState("");
  const [createNewDataset, setCreateNewDataset] = useState(false);
  const [entryTitle, setEntryTitle] = useState("");
  const [entryInput, setEntryInput] = useState("");
  const [entryExpectedBehavior, setEntryExpectedBehavior] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Extraction prompt state
  const [extractionPrompt, setExtractionPrompt] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [extractedData, setExtractedData] = useState<{
    user_input: string;
    assistant_response: string;
    context: string;
    topics: string[];
    user_style: string;
    expected_behavior: string;
  } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState<"extract" | "manual">("extract");
  
  const { toast } = useToast();

  // Load datasets on mount
  useEffect(() => {
    if (isOpen) {
      loadDatasets();
      loadSettings();
      // Auto-populate entry data based on conversation
      populateEntryData();
    }
  }, [isOpen, messages]);

  const loadDatasets = async () => {
    try {
      const allDatasets = await db.datasets.toArray();
      setDatasets(allDatasets);
    } catch (error) {
      console.error("Failed to load datasets:", error);
      toast({
        title: "Error",
        description: "Failed to load datasets",
        variant: "destructive",
      });
    }
  };

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

  const populateEntryData = () => {
    if (messages.length === 0) return;

    // Set entry title
    setEntryTitle(`Conversation - ${new Date().toLocaleString()}`);

    if (promptType === "single-turn") {
      // For single-turn, use the first user message as input and first assistant message as expected behavior
      const userMessage = messages.find(m => m.role === "user");
      const assistantMessage = messages.find(m => m.role === "assistant");
      
      setEntryInput(userMessage?.content || "");
      setEntryExpectedBehavior(assistantMessage?.content || "");
    } else {
      // For multi-turn, leave input empty as it will be the full conversation
      setEntryInput("");
      setEntryExpectedBehavior("");
      // Auto-extract data if we have an extraction prompt
      if (extractionPrompt) {
        extractConversationData();
      }
    }
  };

  const extractConversationData = async () => {
    if (!extractionPrompt || !settings) return;

    setIsExtracting(true);
    try {
      // Format conversation for extraction
      const conversationText = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n');

      // Use the AI SDK to call the extraction
      const { generateText } = await import('ai');
      const { openai } = await import('@ai-sdk/openai');
      
      const client = openai({
        apiKey: settings.api_keys?.openai || process.env.OPENAI_API_KEY,
      });

      const { text } = await generateText({
        model: client('gpt-4o-mini'),
        prompt: `${extractionPrompt}\n\nConversation:\n${conversationText}`,
        temperature: 0.1,
      });

      // Parse the extracted data
      try {
        const extracted = JSON.parse(text);
        setExtractedData(extracted);
        
        // Auto-populate the form fields
        setEntryInput(extracted.user_input || "");
        setEntryExpectedBehavior(extracted.expected_behavior || "");
      } catch (parseError) {
        console.error("Failed to parse extracted data:", parseError);
        toast({
          title: "Extraction Warning",
          description: "Failed to parse extracted data, but extraction completed. Please review manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Extraction failed:", error);
      toast({
        title: "Extraction Failed",
        description: "Failed to extract data from conversation. Please fill manually.",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCreateDataset = async () => {
    if (!newDatasetName.trim()) {
      toast({
        title: "Error",
        description: "Dataset name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const newDataset: Dataset = {
        id: `dataset_${Date.now()}`,
        name: newDatasetName.trim(),
        type: promptType,
        description: newDatasetDescription.trim(),
        created_at: new Date().toISOString(),
        entries: [],
      };

      await db.datasets.add(newDataset);
      setDatasets(prev => [...prev, newDataset]);
      setSelectedDatasetId(newDataset.id);
      setCreateNewDataset(false);
      setNewDatasetName("");
      setNewDatasetDescription("");

      toast({
        title: "Success",
        description: "Dataset created successfully",
      });
    } catch (error) {
      console.error("Failed to create dataset:", error);
      toast({
        title: "Error",
        description: "Failed to create dataset",
        variant: "destructive",
      });
    }
  };

  const handleAddToDataset = async () => {
    if (!selectedDatasetId && !createNewDataset) {
      toast({
        title: "Error",
        description: "Please select a dataset or create a new one",
        variant: "destructive",
      });
      return;
    }

    if (createNewDataset && !newDatasetName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a dataset name",
        variant: "destructive",
      });
      return;
    }

    if (!entryTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter an entry title",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let datasetId = selectedDatasetId;

      // Create new dataset if needed
      if (createNewDataset) {
        const newDataset: Dataset = {
          id: `dataset_${Date.now()}`,
          name: newDatasetName.trim(),
          type: promptType,
          description: newDatasetDescription.trim(),
          created_at: new Date().toISOString(),
          entries: [],
        };

        await db.datasets.add(newDataset);
        datasetId = newDataset.id;
        setDatasets(prev => [...prev, newDataset]);
      }

      // Create dataset entry
      const datasetEntry: DatasetEntry = {
        id: `entry_${Date.now()}`,
        type: promptType,
        title: entryTitle.trim(),
        input: promptType === "single-turn" ? entryInput.trim() : (extractedData?.user_input || entryInput.trim()),
        expected_behavior: promptType === "single-turn" ? entryExpectedBehavior.trim() : (extractedData?.expected_behavior || entryExpectedBehavior.trim()),
        conversation: promptType === "multi-turn" ? messages : undefined,
        created_at: new Date().toISOString(),
      };

      // Add entry to dataset
      const dataset = await db.datasets.get(datasetId);
      if (dataset) {
        const updatedDataset = {
          ...dataset,
          entries: [...dataset.entries, datasetEntry],
        };
        await db.datasets.update(datasetId, updatedDataset);
      }

      toast({
        title: "Success",
        description: `Conversation added to dataset successfully`,
      });

      onClose();
    } catch (error) {
      console.error("Failed to add to dataset:", error);
      toast({
        title: "Error",
        description: "Failed to add conversation to dataset",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedDatasetId("");
    setNewDatasetName("");
    setNewDatasetDescription("");
    setCreateNewDataset(false);
    setEntryTitle("");
    setEntryInput("");
    setEntryExpectedBehavior("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Add to Dataset
          </DialogTitle>
          <DialogDescription>
            Save this conversation as a dataset entry for evaluation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dataset Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Dataset</Label>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="existing-dataset"
                  name="dataset-type"
                  checked={!createNewDataset}
                  onChange={() => setCreateNewDataset(false)}
                  className="h-4 w-4"
                />
                <Label htmlFor="existing-dataset" className="text-sm font-normal cursor-pointer">
                  Use existing dataset
                </Label>
              </div>
              
              {!createNewDataset && (
                <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets
                      .filter(d => d.type === promptType)
                      .map((dataset) => (
                        <SelectItem key={dataset.id} value={dataset.id}>
                          <div className="flex items-center gap-2">
                            <span>{dataset.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {dataset.entries.length} entries
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="new-dataset"
                  name="dataset-type"
                  checked={createNewDataset}
                  onChange={() => setCreateNewDataset(true)}
                  className="h-4 w-4"
                />
                <Label htmlFor="new-dataset" className="text-sm font-normal cursor-pointer">
                  Create new dataset
                </Label>
              </div>
              
              {createNewDataset && (
                <div className="space-y-3 pl-6">
                  <div>
                    <Label htmlFor="dataset-name">Dataset Name</Label>
                    <Input
                      id="dataset-name"
                      value={newDatasetName}
                      onChange={(e) => setNewDatasetName(e.target.value)}
                      placeholder="Enter dataset name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dataset-description">Description (Optional)</Label>
                    <Textarea
                      id="dataset-description"
                      value={newDatasetDescription}
                      onChange={(e) => setNewDatasetDescription(e.target.value)}
                      placeholder="Enter dataset description"
                      className="min-h-[60px]"
                    />
                  </div>
                  <Button onClick={handleCreateDataset} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Dataset
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Entry Details */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Entry Details</Label>
            
            <div>
              <Label htmlFor="entry-title">Title</Label>
              <Input
                id="entry-title"
                value={entryTitle}
                onChange={(e) => setEntryTitle(e.target.value)}
                placeholder="Enter entry title"
              />
            </div>

            {promptType === "single-turn" && (
              <>
                <div>
                  <Label htmlFor="entry-input">User Input</Label>
                  <Textarea
                    id="entry-input"
                    value={entryInput}
                    onChange={(e) => setEntryInput(e.target.value)}
                    placeholder="User input"
                    className="min-h-[80px]"
                  />
                </div>
                <div>
                  <Label htmlFor="entry-expected">Expected Behavior</Label>
                  <Textarea
                    id="entry-expected"
                    value={entryExpectedBehavior}
                    onChange={(e) => setEntryExpectedBehavior(e.target.value)}
                    placeholder="Expected assistant response"
                    className="min-h-[80px]"
                  />
                </div>
              </>
            )}

            {promptType === "multi-turn" && (
              <div className="space-y-4">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "extract" | "manual")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="extract" className="flex items-center gap-2">
                      <Wand2 className="h-4 w-4" />
                      Auto Extract
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
                          className="min-h-[120px] text-sm"
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
                              <Label className="text-xs font-medium">User Input</Label>
                              <Textarea
                                value={extractedData.user_input || ""}
                                onChange={(e) => setExtractedData({...extractedData, user_input: e.target.value})}
                                className="min-h-[60px] text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium">Expected Behavior</Label>
                              <Textarea
                                value={extractedData.expected_behavior || ""}
                                onChange={(e) => setExtractedData({...extractedData, expected_behavior: e.target.value})}
                                className="min-h-[60px] text-sm"
                              />
                            </div>
                            {extractedData.context && (
                              <div>
                                <Label className="text-xs font-medium">Context</Label>
                                <p className="text-sm text-muted-foreground">{extractedData.context}</p>
                              </div>
                            )}
                            {extractedData.topics && extractedData.topics.length > 0 && (
                              <div>
                                <Label className="text-xs font-medium">Topics</Label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {extractedData.topics.map((topic, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {topic}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="manual" className="space-y-4">
                    <div>
                      <Label htmlFor="entry-input">User Input</Label>
                      <Textarea
                        id="entry-input"
                        value={entryInput}
                        onChange={(e) => setEntryInput(e.target.value)}
                        placeholder="User input"
                        className="min-h-[80px]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="entry-expected">Expected Behavior</Label>
                      <Textarea
                        id="entry-expected"
                        value={entryExpectedBehavior}
                        onChange={(e) => setEntryExpectedBehavior(e.target.value)}
                        placeholder="Expected assistant response"
                        className="min-h-[80px]"
                      />
                    </div>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Full Conversation ({messages.length} messages)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {messages.map((message, index) => (
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
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleAddToDataset} disabled={isLoading}>
            {isLoading ? "Adding..." : "Add to Dataset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddToDatasetDialog;

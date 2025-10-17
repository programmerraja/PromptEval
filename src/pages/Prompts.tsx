import { useState, useEffect } from "react";
import { db, Prompt, PromptVersion } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Save, Copy, Trash2, MoreVertical, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Playground from "@/components/Playground";

const Prompts = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("v1");
  const [editingPrompt, setEditingPrompt] = useState({
    name: "",
    description: "",
    text: "",
    system_prompt: "",
    temperature: 0.7,
    max_tokens: 500,
    top_p: 0.9,
    model: "gpt-4o-mini"
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<Prompt | null>(null);
  const [showVersionDeleteDialog, setShowVersionDeleteDialog] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<{ promptId: string; versionId: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    const allPrompts = await db.prompts.toArray();
    setPrompts(allPrompts);
  };

  const createNewPrompt = async () => {
    const newPrompt: Prompt = {
      id: `prompt_${Date.now()}`,
      name: "New Prompt",
      description: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      versions: {
        v1: {
          version_id: "v1",
          text: "",
          config: {
            temperature: 0.7,
            max_tokens: 500,
            top_p: 0.9,
            system_prompt: "",
            model: "gpt-4o-mini"
          },
          created_at: new Date().toISOString()
        }
      }
    };
    await db.prompts.add(newPrompt);
    await loadPrompts();
    setSelectedPrompt(newPrompt);
    setSelectedVersion("v1");
    toast({
      title: "Prompt created",
      description: "New prompt has been created successfully"
    });
  };

  const savePrompt = async () => {
    if (!selectedPrompt) return;

    const version = selectedPrompt.versions[selectedVersion];
    const updatedPrompt = {
      ...selectedPrompt,
      name: editingPrompt.name,
      description: editingPrompt.description,
      updated_at: new Date().toISOString(),
      versions: {
        ...selectedPrompt.versions,
        [selectedVersion]: {
          ...version,
          text: editingPrompt.text,
          config: {
            temperature: editingPrompt.temperature,
            max_tokens: editingPrompt.max_tokens,
            top_p: editingPrompt.top_p,
            system_prompt: editingPrompt.system_prompt,
            model: editingPrompt.model
          }
        }
      }
    };

    await db.prompts.update(selectedPrompt.id, updatedPrompt);
    await loadPrompts();
    toast({
      title: "Saved",
      description: "Prompt has been saved successfully"
    });
  };

  const selectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setSelectedVersion("v1");
    const version = prompt.versions.v1;
    setEditingPrompt({
      name: prompt.name,
      description: prompt.description || "",
      text: version.text,
      system_prompt: version.config.system_prompt,
      temperature: version.config.temperature,
      max_tokens: version.config.max_tokens,
      top_p: version.config.top_p,
      model: version.config.model || "gpt-4o-mini"
    });
  };

  const createNewVersion = async () => {
    if (!selectedPrompt) return;

    const versionNumbers = Object.keys(selectedPrompt.versions)
      .map(v => parseInt(v.replace('v', '')))
      .filter(n => !isNaN(n));
    const nextVersionNumber = versionNumbers.length > 0 ? Math.max(...versionNumbers) + 1 : 1;
    const newVersionId = `v${nextVersionNumber}`;

    const newVersion: PromptVersion = {
      version_id: newVersionId,
      text: editingPrompt.text,
      config: {
        temperature: editingPrompt.temperature,
        max_tokens: editingPrompt.max_tokens,
        top_p: editingPrompt.top_p,
        system_prompt: editingPrompt.system_prompt,
        model: editingPrompt.model
      },
      created_at: new Date().toISOString()
    };

    const updatedPrompt = {
      ...selectedPrompt,
      versions: {
        ...selectedPrompt.versions,
        [newVersionId]: newVersion
      },
      updated_at: new Date().toISOString()
    };

    await db.prompts.update(selectedPrompt.id, updatedPrompt);
    await loadPrompts();
    setSelectedPrompt(updatedPrompt);
    setSelectedVersion(newVersionId);
    
    toast({
      title: "Version created",
      description: `New version ${newVersionId} has been created successfully`
    });
  };

  const deletePrompt = async () => {
    if (!promptToDelete) return;

    await db.prompts.delete(promptToDelete.id);
    await loadPrompts();
    setSelectedPrompt(null);
    setPromptToDelete(null);
    setShowDeleteDialog(false);
    
    toast({
      title: "Prompt deleted",
      description: "Prompt has been deleted successfully"
    });
  };

  const deleteVersion = async () => {
    if (!versionToDelete || !selectedPrompt) return;

    const { promptId, versionId } = versionToDelete;
    const prompt = await db.prompts.get(promptId);
    if (!prompt) return;

    // Don't allow deleting the last version
    if (Object.keys(prompt.versions).length <= 1) {
      toast({
        title: "Cannot delete version",
        description: "Cannot delete the last remaining version",
        variant: "destructive"
      });
      return;
    }

    const updatedVersions = { ...prompt.versions };
    delete updatedVersions[versionId];

    const updatedPrompt = {
      ...prompt,
      versions: updatedVersions,
      updated_at: new Date().toISOString()
    };

    await db.prompts.update(promptId, updatedPrompt);
    await loadPrompts();
    
    // If we deleted the currently selected version, switch to v1
    if (selectedPrompt.id === promptId && selectedVersion === versionId) {
      setSelectedVersion("v1");
      const v1Version = updatedVersions.v1;
      if (v1Version) {
        setEditingPrompt({
          name: updatedPrompt.name,
          description: updatedPrompt.description || "",
          text: v1Version.text,
          system_prompt: v1Version.config.system_prompt,
          temperature: v1Version.config.temperature,
          max_tokens: v1Version.config.max_tokens,
          top_p: v1Version.config.top_p,
          model: v1Version.config.model || "gpt-4o-mini"
        });
      }
      setSelectedPrompt(updatedPrompt);
    }

    setVersionToDelete(null);
    setShowVersionDeleteDialog(false);
    
    toast({
      title: "Version deleted",
      description: `Version ${versionId} has been deleted successfully`
    });
  };

  const switchVersion = (versionId: string) => {
    if (!selectedPrompt) return;
    
    const version = selectedPrompt.versions[versionId];
    if (!version) return;

    setSelectedVersion(versionId);
    setEditingPrompt({
      name: selectedPrompt.name,
      description: selectedPrompt.description || "",
      text: version.text,
      system_prompt: version.config.system_prompt,
      temperature: version.config.temperature,
      max_tokens: version.config.max_tokens,
      top_p: version.config.top_p,
      model: version.config.model || "gpt-4o-mini"
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      <div className="w-64 border-r border-border">
        <div className="p-4 border-b border-border">
          <Button onClick={createNewPrompt} className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Prompt
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="p-2 space-y-1">
            {prompts.map((prompt) => (
              <div key={prompt.id} className="flex items-center group">
                <Button
                  variant={selectedPrompt?.id === prompt.id ? "secondary" : "ghost"}
                  className="flex-1 justify-start"
                  onClick={() => selectPrompt(prompt)}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{prompt.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {Object.keys(prompt.versions).length} versions
                    </span>
                  </div>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setPromptToDelete(prompt);
                        setShowDeleteDialog(true);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Prompt
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1">
        {!selectedPrompt ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Plus className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Select a prompt or create a new one</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="editor" className="h-full">
            <div className="border-b border-border px-6 py-3">
              <TabsList>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="playground">Playground</TabsTrigger>
                <TabsTrigger value="auto-chat">Auto Chat</TabsTrigger>
                <TabsTrigger value="results">Eval Results</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="editor" className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Input
                    value={editingPrompt.name}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                    className="text-2xl font-bold border-none p-0 h-auto"
                    placeholder="Prompt name"
                  />
                  <Input
                    value={editingPrompt.description}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, description: e.target.value })}
                    className="text-sm text-muted-foreground border-none p-0 h-auto"
                    placeholder="Description"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={savePrompt} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button onClick={createNewVersion} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Version
                  </Button>
                </div>
              </div>

              {/* Version Management */}
              {selectedPrompt && Object.keys(selectedPrompt.versions).length > 0 && (
                <div className="space-y-2">
                  <Label>Versions</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(selectedPrompt.versions).map((versionId) => (
                      <div key={versionId} className="flex items-center gap-1">
                        <Button
                          variant={selectedVersion === versionId ? "default" : "outline"}
                          size="sm"
                          onClick={() => switchVersion(versionId)}
                        >
                          {versionId}
                        </Button>
                        {Object.keys(selectedPrompt.versions).length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setVersionToDelete({ promptId: selectedPrompt.id, versionId });
                              setShowVersionDeleteDialog(true);
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label>System Prompt</Label>
                  <Textarea
                    value={editingPrompt.system_prompt}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, system_prompt: e.target.value })}
                    placeholder="You are a helpful assistant..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>User Prompt</Label>
                  <Textarea
                    value={editingPrompt.text}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, text: e.target.value })}
                    placeholder="Enter your prompt here..."
                    className="min-h-[200px]"
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Configuration</CardTitle>
                    <CardDescription>Model parameters for this prompt</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Model</Label>
                        <Input
                          value={editingPrompt.model}
                          onChange={(e) => setEditingPrompt({ ...editingPrompt, model: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Temperature: {editingPrompt.temperature}</Label>
                        <Input
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={editingPrompt.temperature}
                          onChange={(e) => setEditingPrompt({ ...editingPrompt, temperature: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Tokens: {editingPrompt.max_tokens}</Label>
                        <Input
                          type="number"
                          value={editingPrompt.max_tokens}
                          onChange={(e) => setEditingPrompt({ ...editingPrompt, max_tokens: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Top P: {editingPrompt.top_p}</Label>
                        <Input
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={editingPrompt.top_p}
                          onChange={(e) => setEditingPrompt({ ...editingPrompt, top_p: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="playground" className="h-full">
              <Playground
                promptText={editingPrompt.text}
                systemPrompt={editingPrompt.system_prompt}
                prompt={selectedPrompt}
                onSaveConversation={async (messages) => {
                  try {
                    // Create a new dataset entry from the conversation
                    const datasetEntry = {
                      id: `entry_${Date.now()}`,
                      type: "multi-turn" as const,
                      title: `Playground Conversation - ${new Date().toLocaleString()}`,
                      conversation: messages,
                      created_at: new Date().toISOString(),
                    };

                    // Find or create a playground dataset
                    let playgroundDataset = await db.datasets.where("name").equals("Playground Conversations").first();
                    
                    if (!playgroundDataset) {
                      playgroundDataset = {
                        id: `dataset_${Date.now()}`,
                        name: "Playground Conversations",
                        type: "multi-turn" as const,
                        description: "Conversations exported from the playground",
                        created_at: new Date().toISOString(),
                        entries: [],
                      };
                      await db.datasets.add(playgroundDataset);
                    }

                    // Add the entry to the dataset
                    playgroundDataset.entries.push(datasetEntry);
                    await db.datasets.update(playgroundDataset.id, {
                      entries: playgroundDataset.entries
                    });

                    toast({
                      title: "Saved",
                      description: "Conversation saved as dataset entry",
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to save conversation",
                      variant: "destructive",
                    });
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="auto-chat" className="p-6">
              <Card>
                <CardHeader>
                  <CardTitle>Auto Chat (LLM-vs-LLM)</CardTitle>
                  <CardDescription>Simulate conversations between two models</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    Coming soon - Automated conversation testing
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results" className="p-6">
              <Card>
                <CardHeader>
                  <CardTitle>Evaluation Results</CardTitle>
                  <CardDescription>Past evaluation scores for this prompt</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    No evaluations yet
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Delete Prompt Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{promptToDelete?.name}"? This action cannot be undone.
              All versions and associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deletePrompt} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Version Confirmation Dialog */}
      <AlertDialog open={showVersionDeleteDialog} onOpenChange={setShowVersionDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete version "{versionToDelete?.versionId}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteVersion} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Prompts;

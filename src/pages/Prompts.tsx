import { useState, useEffect } from "react";
import { db, Prompt, PromptVersion, Dataset } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Playground from "@/components/Playground";
import ModelConfig from "@/components/ModelConfig";
import PromptEditor from "@/components/PromptEditor";
import VersionManager from "@/components/VersionManager";

const Prompts = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("v1");
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<Prompt | null>(null);
  const [showVersionDeleteDialog, setShowVersionDeleteDialog] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<{ promptId: string; versionId: string } | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadPrompts();
    loadDatasets();
  }, []);

  useEffect(() => {
    if (selectedPrompt) {
      setSelectedVersion(Object.keys(selectedPrompt.versions)[0] || "v1");
    }
  }, [selectedPrompt]);

  const loadPrompts = async () => {
    try {
      const allPrompts = await db.prompts.toArray();
      setPrompts(allPrompts);
    } catch (error) {
      console.error("Failed to load prompts:", error);
      toast({
        title: "Error",
        description: "Failed to load prompts",
        variant: "destructive"
      });
    }
  };

  const loadDatasets = async () => {
    try {
      const datasetsData = await db.datasets.toArray();
      setDatasets(datasetsData);
    } catch (error) {
      console.error("Failed to load datasets:", error);
      toast({
        title: "Error",
        description: "Failed to load datasets",
        variant: "destructive"
      });
    }
  };

  const createNewPrompt = async () => {
    try {
      const newPrompt: Prompt = {
        id: `prompt_${Date.now()}`,
        name: "New Prompt",
        type: "single-turn",
        description: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        versions: {
          v1: {
            version_id: "v1",
            text: "",
            variables: {},
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
    } catch (error) {
      console.error("Failed to create prompt:", error);
      toast({
        title: "Error",
        description: "Failed to create prompt",
        variant: "destructive"
      });
    }
  };

  const handleSavePrompt = async (updatedPrompt: Prompt) => {
    try {
      await db.prompts.update(updatedPrompt.id, {
        name: updatedPrompt.name,
        type: updatedPrompt.type,
        description: updatedPrompt.description,
        updated_at: updatedPrompt.updated_at,
        versions: updatedPrompt.versions
      });
      await loadPrompts();
      setSelectedPrompt(updatedPrompt);
    } catch (error) {
      console.error("Failed to save prompt:", error);
      toast({
        title: "Error",
        description: "Failed to save prompt",
        variant: "destructive"
      });
    }
  };

  const selectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setSelectedVersion(Object.keys(prompt.versions)[0] || "v1");
  };

  const createNewVersion = async () => {
    if (!selectedPrompt) return;

    const versionNumbers = Object.keys(selectedPrompt.versions)
      .map(v => parseInt(v.replace('v', '')))
      .filter(n => !isNaN(n));
    const nextVersionNumber = versionNumbers.length > 0 ? Math.max(...versionNumbers) + 1 : 1;
    const newVersionId = `v${nextVersionNumber}`;

    const currentVersion = selectedPrompt.versions[selectedVersion];
    const newVersion: PromptVersion = {
      version_id: newVersionId,
      text: currentVersion?.text || "",
      variables: currentVersion?.variables || {},
      config: {
        temperature: currentVersion?.config.temperature || 0.7,
        max_tokens: currentVersion?.config.max_tokens || 500,
        top_p: currentVersion?.config.top_p || 0.9,
        system_prompt: currentVersion?.config.system_prompt || "",
        model: currentVersion?.config.model || "gpt-4o-mini"
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

    try {
      await db.prompts.delete(promptToDelete.id);
      await loadPrompts();
      setSelectedPrompt(null);
      setPromptToDelete(null);
      setShowDeleteDialog(false);

      toast({
        title: "Prompt deleted",
        description: "Prompt has been deleted successfully"
      });
    } catch (error) {
      console.error("Failed to delete prompt:", error);
      toast({
        title: "Error",
        description: "Failed to delete prompt",
        variant: "destructive"
      });
    }
  };

  const deleteVersion = async (versionId: string) => {
    if (!selectedPrompt) return;

    try {
      // Don't allow deleting the last version
      if (Object.keys(selectedPrompt.versions).length <= 1) {
        toast({
          title: "Cannot delete version",
          description: "Cannot delete the last remaining version",
          variant: "destructive"
        });
        return;
      }

      const updatedVersions = { ...selectedPrompt.versions };
      delete updatedVersions[versionId];

      const updatedPrompt = {
        ...selectedPrompt,
        versions: updatedVersions,
        updated_at: new Date().toISOString()
      };

      await db.prompts.update(selectedPrompt.id, updatedPrompt);
      await loadPrompts();

      // If we deleted the currently selected version, switch to v1
      if (selectedVersion === versionId) {
        setSelectedVersion("v1");
      }

      setSelectedPrompt(updatedPrompt);

      toast({
        title: "Version deleted",
        description: `Version ${versionId} has been deleted successfully`
      });
    } catch (error) {
      console.error("Failed to delete version:", error);
      toast({
        title: "Error",
        description: "Failed to delete version",
        variant: "destructive"
      });
    }
  };

  const switchVersion = (versionId: string) => {
    setSelectedVersion(versionId);
  };

  const handleCreateVersion = async (newVersion: PromptVersion) => {
    if (!selectedPrompt) return;

    try {
      const updatedPrompt = {
        ...selectedPrompt,
        versions: {
          ...selectedPrompt.versions,
          [newVersion.version_id]: newVersion
        },
        updated_at: new Date().toISOString()
      };

      await db.prompts.update(selectedPrompt.id, updatedPrompt);
      await loadPrompts();
      setSelectedPrompt(updatedPrompt);
      setSelectedVersion(newVersion.version_id);
    } catch (error) {
      console.error("Failed to create version:", error);
      toast({
        title: "Error",
        description: "Failed to create version",
        variant: "destructive"
      });
    }
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
                <TabsTrigger value="model-config">Model Config</TabsTrigger>
                <TabsTrigger value="playground">Playground</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="editor" className="p-6 space-y-6">
              <PromptEditor
                prompt={selectedPrompt}
                selectedVersion={selectedVersion}
                onSave={handleSavePrompt}
                onCreateVersion={handleCreateVersion}
                onVersionChange={switchVersion}
              />

              <VersionManager
                prompt={selectedPrompt}
                selectedVersion={selectedVersion}
                onVersionChange={switchVersion}
                onDeleteVersion={deleteVersion}
              />
            </TabsContent>

            <TabsContent value="model-config" className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Model Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure model parameters for this prompt version
                  </p>
                </div>

                <ModelConfig
                  model={selectedPrompt?.versions[selectedVersion]?.config.model || "models/gemini-flash-latest"}
                  temperature={selectedPrompt?.versions[selectedVersion]?.config.temperature || 0.7}
                  maxTokens={selectedPrompt?.versions[selectedVersion]?.config.max_tokens || 500}
                  topP={selectedPrompt?.versions[selectedVersion]?.config.top_p || 0.9}
                  onModelChange={(model) => {
                    if (selectedPrompt) {
                      const updatedPrompt = {
                        ...selectedPrompt,
                        versions: {
                          ...selectedPrompt.versions,
                          [selectedVersion]: {
                            ...selectedPrompt.versions[selectedVersion],
                            config: {
                              ...selectedPrompt.versions[selectedVersion].config,
                              model
                            }
                          }
                        }
                      };
                      setSelectedPrompt(updatedPrompt);
                    }
                  }}
                  onTemperatureChange={(temperature) => {
                    if (selectedPrompt) {
                      const updatedPrompt = {
                        ...selectedPrompt,
                        versions: {
                          ...selectedPrompt.versions,
                          [selectedVersion]: {
                            ...selectedPrompt.versions[selectedVersion],
                            config: {
                              ...selectedPrompt.versions[selectedVersion].config,
                              temperature
                            }
                          }
                        }
                      };
                      setSelectedPrompt(updatedPrompt);
                    }
                  }}
                  onMaxTokensChange={(max_tokens) => {
                    if (selectedPrompt) {
                      const updatedPrompt = {
                        ...selectedPrompt,
                        versions: {
                          ...selectedPrompt.versions,
                          [selectedVersion]: {
                            ...selectedPrompt.versions[selectedVersion],
                            config: {
                              ...selectedPrompt.versions[selectedVersion].config,
                              max_tokens
                            }
                          }
                        }
                      };
                      setSelectedPrompt(updatedPrompt);
                    }
                  }}
                  onTopPChange={(top_p) => {
                    if (selectedPrompt) {
                      const updatedPrompt = {
                        ...selectedPrompt,
                        versions: {
                          ...selectedPrompt.versions,
                          [selectedVersion]: {
                            ...selectedPrompt.versions[selectedVersion],
                            config: {
                              ...selectedPrompt.versions[selectedVersion].config,
                              top_p
                            }
                          }
                        }
                      };
                      setSelectedPrompt(updatedPrompt);
                    }
                  }}
                  showProvider={true}
                  provider="google"
                  onProviderChange={() => { }}
                  title="Model Parameters"
                  description="Configure the model settings for this prompt version"
                />
              </div>
            </TabsContent>

            <TabsContent value="playground" className="h-full">
              <Playground
                promptText={selectedPrompt?.versions[selectedVersion]?.text || ""}
                systemPrompt={selectedPrompt?.versions[selectedVersion]?.config.system_prompt || ""}
                prompt={selectedPrompt}
                onSaveConversation={async (messages) => {
                  try {
                    const datasetEntry = {
                      id: `entry_${Date.now()}`,
                      type: "multi-turn" as const,
                      title: `Playground Conversation - ${new Date().toLocaleString()}`,
                      conversation: messages,
                      created_at: new Date().toISOString(),
                    };

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
            <AlertDialogAction onClick={() => versionToDelete && deleteVersion(versionToDelete.versionId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Prompts;

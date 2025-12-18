import { useState, useEffect } from "react";
import { db, Dataset, DatasetEntry } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, TestTube, Search, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { DatasetEntryDialog } from "@/components/DatasetEntryDialog";
import { DatasetMetadataDialog } from "@/components/DatasetMetadataDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const Datasets = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [filterType, setFilterType] = useState<"all" | "single" | "multi">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DatasetEntry | undefined>();
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [deleteDatasetId, setDeleteDatasetId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    const allDatasets = await db.datasets.toArray();
    setDatasets(allDatasets);
  };

  const handleSaveMetadata = async (metadata: { name: string; type: "single-turn" | "multi-turn"; description?: string; tags?: string[]; extraction_prompt?: string }) => {
    if (selectedDataset) {
      const updated = { ...selectedDataset, ...metadata };
      await db.datasets.update(selectedDataset.id, updated);
      setSelectedDataset(updated);
    } else {
      const newDataset: Dataset = {
        id: `ds_${Date.now()}`,
        ...metadata,
        created_at: new Date().toISOString(),
        entries: []
      };
      await db.datasets.add(newDataset);
      setSelectedDataset(newDataset);
    }
    await loadDatasets();
    toast({
      title: selectedDataset ? "Dataset updated" : "Dataset created",
      description: selectedDataset ? "Dataset has been updated successfully" : "New dataset has been created successfully"
    });
  };

  const handleSaveEntry = async (entryData: Omit<DatasetEntry, "id" | "created_at">) => {
    if (!selectedDataset) return;

    const entry: DatasetEntry = {
      ...entryData,
      id: editingEntry?.id || `entry_${Date.now()}`,
      created_at: editingEntry?.created_at || new Date().toISOString(),
    };

    let updatedEntries: DatasetEntry[];
    if (editingEntry) {
      updatedEntries = selectedDataset.entries.map(e => e.id === entry.id ? entry : e);
    } else {
      updatedEntries = [...selectedDataset.entries, entry];
    }

    const updated = { ...selectedDataset, entries: updatedEntries };
    await db.datasets.update(selectedDataset.id, updated);
    setSelectedDataset(updated);
    await loadDatasets();

    setEditingEntry(undefined);
    toast({
      title: editingEntry ? "Entry updated" : "Entry added",
      description: editingEntry ? "Entry has been updated successfully" : "New entry has been added successfully"
    });
  };

  const handleDeleteEntry = async () => {
    if (!selectedDataset || !deleteEntryId) return;

    const updatedEntries = selectedDataset.entries.filter(e => e.id !== deleteEntryId);
    const updated = { ...selectedDataset, entries: updatedEntries };
    await db.datasets.update(selectedDataset.id, updated);
    setSelectedDataset(updated);
    await loadDatasets();
    setDeleteEntryId(null);

    toast({
      title: "Entry deleted",
      description: "Entry has been deleted successfully"
    });
  };

  const handleDeleteDataset = async () => {
    if (!deleteDatasetId) return;

    await db.datasets.delete(deleteDatasetId);
    if (selectedDataset?.id === deleteDatasetId) {
      setSelectedDataset(null);
    }
    await loadDatasets();
    setDeleteDatasetId(null);

    toast({
      title: "Dataset deleted",
      description: "Dataset has been deleted successfully"
    });
  };

  const filteredDatasets = datasets.filter(ds => {
    const matchesType = filterType === "all" ||
      (filterType === "single" && ds.type === "single-turn") ||
      (filterType === "multi" && ds.type === "multi-turn");
    const matchesSearch = searchQuery === "" ||
      ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ds.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <>
      <div className="flex h-[calc(100vh-4rem)] w-full">
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border space-y-4">
            <Button onClick={() => setMetadataDialogOpen(true)} className="w-full" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Dataset
            </Button>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>

          <div className="px-4 py-3 border-b border-border">
            <Tabs value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)} className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="single">Single</TabsTrigger>
                <TabsTrigger value="multi">Multi</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {filteredDatasets.map((dataset) => (
                <div key={dataset.id} className="relative group">
                  <Card
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${selectedDataset?.id === dataset.id
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:bg-muted/50"
                      }`}
                    onClick={() => setSelectedDataset(dataset)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold text-sm leading-tight">{dataset.name}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteDatasetId(dataset.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={dataset.type === "single-turn" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {dataset.type === "single-turn" ? "Single Turn" : "Multi Turn"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {dataset.entries.length} entries
                            </Badge>
                          </div>

                          {dataset.tags && dataset.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {dataset.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {dataset.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{dataset.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {dataset.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {dataset.description}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}

              {filteredDatasets.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No datasets found</p>
                  {searchQuery && (
                    <p className="text-xs mt-1">Try adjusting your search terms</p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 p-6">
          {!selectedDataset ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Plus className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg">Select a dataset or create a new one</p>
                <p className="text-sm mt-2">Choose from the sidebar to view and manage your datasets</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{selectedDataset.name}</h2>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMetadataDialogOpen(true)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {selectedDataset.description && (
                    <p className="text-muted-foreground text-base">{selectedDataset.description}</p>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={selectedDataset.type === "single-turn" ? "default" : "secondary"}
                        className="text-sm"
                      >
                        {selectedDataset.type === "single-turn" ? "Single Turn" : "Multi Turn"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {selectedDataset.entries.length} entries
                      </span>
                    </div>

                    {selectedDataset.tags && selectedDataset.tags.length > 0 && (
                      <div className="flex gap-2">
                        {selectedDataset.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-sm">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => {
                    setEditingEntry(undefined);
                    setEntryDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                  </Button>
                  <Button variant="outline">
                    <TestTube className="h-4 w-4 mr-2" />
                    Send to Eval
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Dataset Entries</CardTitle>
                      <CardDescription className="mt-1">
                        {selectedDataset.entries.length} {selectedDataset.entries.length === 1 ? "entry" : "entries"} in this dataset
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {selectedDataset.entries.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <Plus className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <h3 className="text-lg font-medium mb-2">No entries yet</h3>
                      <p className="text-sm mb-4">Add your first entry to get started with this dataset</p>
                      <Button onClick={() => {
                        setEditingEntry(undefined);
                        setEntryDialogOpen(true);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Entry
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {selectedDataset.entries.map((entry) => (
                        <Card key={entry.id} className="overflow-hidden">
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <CardTitle className="text-lg">{entry.title || "Untitled Entry"}</CardTitle>
                                <Badge
                                  variant={entry.type === "single-turn" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {entry.type === "single-turn" ? "Single Turn" : "Multi Turn"}
                                </Badge>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingEntry(entry);
                                    setEntryDialogOpen(true);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteEntryId(entry.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {entry.type === "single-turn" ? (
                              <div className="space-y-4">
                                <div>
                                  <p className="text-sm font-medium mb-2 text-foreground">Input:</p>
                                  <div className="bg-muted/30 p-4 rounded-lg border">
                                    <p className="text-sm text-foreground">{entry.input}</p>
                                  </div>
                                </div>
                                {entry.expected_behavior && (
                                  <div>
                                    <p className="text-sm font-medium mb-2 text-foreground">Expected Behavior:</p>
                                    <div className="bg-muted/30 p-4 rounded-lg border">
                                      <p className="text-sm text-foreground">{entry.expected_behavior}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {entry.system_context && (
                                  <div>
                                    <p className="text-sm font-medium mb-2 text-foreground">System Context:</p>
                                    <div className="bg-muted/30 p-4 rounded-lg border">
                                      <p className="text-sm text-foreground">{entry.system_context}</p>
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium mb-3 text-foreground">Conversation:</p>
                                  <div className="space-y-3">
                                    {entry.conversation?.map((msg, idx) => (
                                      <div
                                        key={idx}
                                        className={`p-4 rounded-lg border ${msg.role === "user"
                                          ? "bg-primary/5 border-primary/20 ml-6"
                                          : "bg-muted/30 border-border mr-6"
                                          }`}
                                      >
                                        <p className="text-xs font-medium mb-2 capitalize text-muted-foreground">{msg.role}</p>
                                        <p className="text-sm text-foreground">{msg.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {entry.user_behavior && (
                                  <div>
                                    <p className="text-sm font-medium mb-2 text-foreground">User Behavior:</p>
                                    <div className="bg-muted/30 p-4 rounded-lg border space-y-2">
                                      {entry.user_behavior.style && (
                                        <p className="text-sm">
                                          <span className="font-medium text-foreground">Style:</span>
                                          <span className="text-muted-foreground ml-2">{entry.user_behavior.style}</span>
                                        </p>
                                      )}
                                      {entry.user_behavior.formality && (
                                        <p className="text-sm">
                                          <span className="font-medium text-foreground">Formality:</span>
                                          <span className="text-muted-foreground ml-2">{entry.user_behavior.formality}</span>
                                        </p>
                                      )}
                                      {entry.user_behavior.goal && (
                                        <p className="text-sm">
                                          <span className="font-medium text-foreground">Goal:</span>
                                          <span className="text-muted-foreground ml-2">{entry.user_behavior.goal}</span>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <DatasetEntryDialog
        open={entryDialogOpen}
        onOpenChange={(open) => {
          setEntryDialogOpen(open);
          if (!open) setEditingEntry(undefined);
        }}
        entry={editingEntry}
        datasetType={selectedDataset?.type || "single-turn"}
        onSave={handleSaveEntry}
      />

      <DatasetMetadataDialog
        open={metadataDialogOpen}
        onOpenChange={setMetadataDialogOpen}
        dataset={selectedDataset || undefined}
        onSave={handleSaveMetadata}
      />

      <AlertDialog open={!!deleteEntryId} onOpenChange={() => setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteDatasetId} onOpenChange={() => setDeleteDatasetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dataset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this dataset and all its entries? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDataset}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Datasets;

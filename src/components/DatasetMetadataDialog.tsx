import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dataset } from "@/lib/db";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface DatasetMetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset?: Dataset;
  onSave: (metadata: { name: string; type: "single-turn" | "multi-turn"; description?: string; tags?: string[] }) => void;
}

export const DatasetMetadataDialog = ({ open, onOpenChange, dataset, onSave }: DatasetMetadataDialogProps) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<"single-turn" | "multi-turn">("single-turn");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (dataset) {
      setName(dataset.name);
      setType(dataset.type);
      setDescription(dataset.description || "");
      setTags(dataset.tags || []);
    } else {
      setName("");
      setType("single-turn");
      setDescription("");
      setTags([]);
    }
    setTagInput("");
  }, [dataset, open]);

  const handleSave = () => {
    onSave({
      name,
      type,
      description: description || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
    onOpenChange(false);
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{dataset ? "Edit Dataset" : "New Dataset"}</DialogTitle>
          <DialogDescription>
            Configure dataset metadata and properties
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Customer Support - Login Issues"
            />
          </div>

          <div>
            <Label htmlFor="type">Type *</Label>
            <Select value={type} onValueChange={(v) => setType(v as "single-turn" | "multi-turn")}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single-turn">Single-Turn</SelectItem>
                <SelectItem value="multi-turn">Multi-Turn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this dataset is for..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add tags..."
              />
              <Button onClick={addTag} variant="outline" size="sm">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {dataset ? "Save Changes" : "Create Dataset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

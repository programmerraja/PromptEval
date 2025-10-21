import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { Prompt, PromptVersion } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

interface VersionManagerProps {
  prompt: Prompt | null;
  selectedVersion: string;
  onVersionChange: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
}

const VersionManager = ({
  prompt,
  selectedVersion,
  onVersionChange,
  onDeleteVersion
}: VersionManagerProps) => {
  const { toast } = useToast();

  const handleDeleteVersion = (versionId: string) => {
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

    onDeleteVersion(versionId);
    
    // If we deleted the currently selected version, switch to v1
    if (selectedVersion === versionId) {
      onVersionChange("v1");
    }
  };

  if (!prompt || Object.keys(prompt.versions).length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label>Versions</Label>
      <div className="flex flex-wrap gap-2">
        {Object.keys(prompt.versions).map((versionId) => (
          <div key={versionId} className="flex items-center gap-1">
            <Button
              variant={selectedVersion === versionId ? "default" : "outline"}
              size="sm"
              onClick={() => onVersionChange(versionId)}
            >
              {versionId}
            </Button>
            {Object.keys(prompt.versions).length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteVersion(versionId);
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
  );
};

export default VersionManager;

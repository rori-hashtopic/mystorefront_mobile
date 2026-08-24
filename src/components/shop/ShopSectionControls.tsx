import { Pencil, Share2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShopSectionControlsProps {
  onAddCollection: () => void;
  onEditSection: () => void;
  isEditMode: boolean;
}

export function ShopSectionControls({ 
  onAddCollection, 
  onEditSection,
  isEditMode 
}: ShopSectionControlsProps) {
  return (
    <div className="flex items-center justify-end gap-2 mb-8">
      <Button
        variant="ghost"
        size="sm"
        className="rounded-full px-4 h-8 text-xs bg-secondary hover:bg-secondary/80 text-muted-foreground"
      >
        <Share2 className="h-3.5 w-3.5 mr-1.5" />
        Share
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={`rounded-full px-4 h-8 text-xs ${
          isEditMode 
            ? "bg-foreground text-background hover:bg-foreground/90" 
            : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
        }`}
        onClick={onEditSection}
      >
        <Pencil className="h-3.5 w-3.5 mr-1.5" />
        Edit Section
      </Button>

      <Button
        size="sm"
        className="rounded-full px-4 h-8 text-xs bg-foreground text-background hover:bg-foreground/90"
        onClick={onAddCollection}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Collection
      </Button>
    </div>
  );
}

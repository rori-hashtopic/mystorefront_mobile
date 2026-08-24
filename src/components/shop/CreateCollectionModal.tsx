import { useState } from "react";
import { X, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CollectionProduct } from "@/pages/Shop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  products: CollectionProduct[];
}

export function CreateCollectionModal({
  isOpen,
  onClose,
  onCreated,
  products,
}: CreateCollectionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSubmit = async () => {
    if (!user || !title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a collection title",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("collections").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        product_ids: selectedProducts,
      });

      if (error) throw error;

      toast({
        title: "Collection created",
        description: "Your new collection has been created successfully",
      });

      // Reset form
      setTitle("");
      setDescription("");
      setSelectedProducts([]);
      onCreated();
    } catch (error: any) {
      toast({
        title: "Error creating collection",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Create Collection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Summer Favourites"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="A short description of this collection..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Products Selection */}
          <div className="space-y-2">
            <Label>
              Add Products{" "}
              <span className="text-muted-foreground">
                ({selectedProducts.length} selected)
              </span>
            </Label>
            {products.length > 0 ? (
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                {products.map((product) => {
                  const isSelected = selectedProducts.includes(product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleToggleProduct(product.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent hover:border-border"
                      }`}
                    >
                      <img
                        src={
                          product.image_url ||
                          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop"
                        }
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground p-4 text-center bg-secondary rounded-lg">
                No products yet. Add some links first to include them in collections.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim()}
              className="rounded-full px-6 bg-foreground text-background hover:bg-foreground/90"
            >
              {isSubmitting ? "Creating..." : "Create Collection"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

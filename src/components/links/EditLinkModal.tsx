import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ExternalLink, ShoppingCart, Upload, Link2, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Link {
  id: string;
  product_title: string;
  product_image_url: string | null;
  affiliate_url: string;
  retailer: string | null;
  description?: string | null;
}

interface EditLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: Link | null;
  onLinkUpdated: () => void;
}

const MAX_DESCRIPTION_LENGTH = 500;

export function EditLinkModal({ open, onOpenChange, link, onLinkUpdated }: EditLinkModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && link) {
      setTitle(link.product_title);
      setDescription(link.description || "");
      setImageUrl(link.product_image_url);
      setImageUrlInput("");
      setShowUrlInput(false);
    }
    // Re-initialise ONLY when the modal opens or a different link is edited.
    // The parent (Shop.tsx) builds the `link` prop inline, so it's a new object
    // on every render; depending on `link` here would re-run this effect on any
    // parent re-render (e.g. when a toast fires) and wipe an in-progress upload
    // or edit. Keying on `open` + `link.id` avoids that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, link?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      // The avatars bucket RLS requires the FIRST path segment to be the
      // uploader's own user id: (storage.foldername(name))[1] = auth.uid().
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in to upload an image.");

      const ext = file.name.split(".").pop();
      const path = `${user.id}/product-images/${link!.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      setImageUrl(publicUrl);
      toast({ title: "Image uploaded" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: "Failed to upload image", description: error?.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleApplyUrl = () => {
    if (!imageUrlInput.trim()) return;
    setImageUrl(imageUrlInput.trim());
    setShowUrlInput(false);
    setImageUrlInput("");
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
  };

  const handleSave = async () => {
    if (!link) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("links")
        .update({ product_title: title.trim(), description, product_image_url: imageUrl })
        .eq("id", link.id);

      if (error) throw error;

      toast({ title: "Link updated" });
      onLinkUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating link:", error);
      toast({ title: "Failed to update link", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDescriptionChange = (value: string) => {
    if (value.length <= MAX_DESCRIPTION_LENGTH) {
      setDescription(value);
    }
  };

  if (!link) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[calc(100dvh-1rem)] overflow-y-auto gap-3 p-3 pt-10 sm:gap-4 sm:p-6 sm:pt-6">
        <DialogHeader className="pr-8">
          <DialogTitle className="font-display text-xl">Edit Link</DialogTitle>
          <DialogDescription className="sr-only">
            Edit product details, image, destination link, and description.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 mt-1 sm:mt-4">
          {/* Left column */}
          <div className="space-y-3 sm:space-y-4">
            {/* Product Image - Editable */}
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Product Image</Label>
              <div className="mt-1.5 sm:mt-2 relative group">
                {imageUrl ? (
                  <div className="relative">
                    <img
                      src={imageUrl}
                      alt={link.product_title}
                      className="w-full h-60 sm:h-40 object-contain sm:object-cover bg-muted rounded-lg border border-border"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-foreground/80 text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-60 sm:h-40 bg-muted rounded-lg flex items-center justify-center border border-border">
                    <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              {/* Image actions */}
              <div className="flex items-center gap-3 mt-1.5 sm:mt-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  Upload
                </button>
                <span className="text-muted-foreground/40 text-xs">|</span>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Link2 className="h-3 w-3" />
                  Paste URL
                </button>
              </div>
              {showUrlInput && (
                <div className="flex gap-2 mt-2">
                  <Input
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="text-xs h-8"
                    onKeyDown={(e) => e.key === "Enter" && handleApplyUrl()}
                  />
                  <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={handleApplyUrl}>
                    Apply
                  </Button>
                </div>
              )}
            </div>

            {/* Product Title */}
            <div>
              <Label htmlFor="product-title" className="text-muted-foreground text-xs uppercase tracking-wide">
                Product Title
              </Label>
              <Input id="product-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
            </div>

            {/* Retailer */}
            {link.retailer && (
              <div>
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Retailer</Label>
                <p className="mt-1 text-foreground">{link.retailer}</p>
              </div>
            )}

            {/* Destination Link */}
            <div>
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Destination Link</Label>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm text-muted-foreground truncate flex-1">{link.affiliate_url}</p>
                <a
                  href={link.affiliate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm font-medium shrink-0"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Right column - Editable description */}
          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="description" className="text-muted-foreground text-xs uppercase tracking-wide">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Add your review or details why you like it"
                className="mt-1.5 sm:mt-2 min-h-[88px] sm:min-h-[160px] resize-none"
              />
              <div className="flex justify-end sm:justify-between items-center mt-1.5 sm:mt-2">
                <p className="hidden sm:block text-xs text-muted-foreground">
                  Add notes about why you recommend this product
                </p>
                <span
                  className={`text-xs ${description.length >= MAX_DESCRIPTION_LENGTH ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-3 mt-1 sm:mt-6 pt-3 sm:pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isUploading || !title.trim()}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

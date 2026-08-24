import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X, Upload, Link as LinkIcon } from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  product_name: string;
  product_image_url: string | null;
  product_images?: string[] | null;
  product_value: number | null;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  onCreated: () => void;
  campaign?: Campaign | null;
}

export function CreateGiftCampaignModal({ open, onOpenChange, brandId, onCreated, campaign }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [productName, setProductName] = useState("");
  const [productValue, setProductValue] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const isEditing = !!campaign;

  useEffect(() => {
    if (open && campaign) {
      setTitle(campaign.title);
      setProductName(campaign.product_name);
      setProductValue(campaign.product_value?.toString() || "");
      setDescription(campaign.description || "");
      setImageUrls(campaign.product_images || (campaign.product_image_url ? [campaign.product_image_url] : []));
    } else if (open && !campaign) {
      setTitle("");
      setProductName("");
      setProductValue("");
      setDescription("");
      setImageUrls([]);
    }
  }, [open, campaign]);

  const addUrlImage = () => {
    const trimmed = urlInput.trim();
    if (trimmed && !imageUrls.includes(trimmed)) {
      setImageUrls((prev) => [...prev, trimmed]);
      setUrlInput("");
      setShowUrlInput(false);
    }
  };

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${brandId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("gift-campaign-images").upload(path, file, { upsert: true });

      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage.from("gift-campaign-images").getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }

    setImageUrls((prev) => [...prev, ...newUrls]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !productName.trim()) return;
    setSaving(true);

    const payload = {
      title: title.trim(),
      product_name: productName.trim(),
      product_image_url: imageUrls[0] || null,
      product_images: imageUrls,
      product_value: productValue ? parseFloat(productValue) : null,
      description: description.trim() || null,
    };

    let error;
    if (isEditing) {
      ({ error } = await supabase.from("gift_campaigns").update(payload).eq("id", campaign.id));
    } else {
      ({ error } = await supabase.from("gift_campaigns").insert({
        ...payload,
        brand_id: brandId,
        status: "active",
      }));
    }

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isEditing ? "Campaign updated." : "Gift campaign created." });
      onOpenChange(false);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onFocusOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-display">{isEditing ? "Edit Campaign" : "New Gift Campaign"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Campaign Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Launch Box"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Product Name *</Label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Hydrating Serum Set"
              required
            />
          </div>

          {/* Product Images */}
          <div className="space-y-2">
            <Label>Product Images</Label>

            {imageUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {imageUrls.map((url, i) => (
                  <div
                    key={i}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group"
                  >
                    <img src={url} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-background/80 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Upload
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowUrlInput(!showUrlInput)}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                Add URL
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />

            {showUrlInput && (
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrlImage())}
                  className="text-sm"
                />
                <Button type="button" size="sm" variant="secondary" onClick={addUrlImage} disabled={!urlInput.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              First image will be used as the cover. You can upload files or paste URLs.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Product Value (ZAR)</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={productValue}
              onChange={(e) => setProductValue(e.target.value)}
              placeholder="350.00"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what's included..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading || !title.trim() || !productName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Campaign"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

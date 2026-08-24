import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, X, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { GiftOfferData } from "@/hooks/useMessages";
import { CollabSelector, assignCreatorToCollab } from "./CollabSelector";

interface GiftOfferComposerProps {
  brandId: string;
  creatorId: string;
  onSend: (data: GiftOfferData) => void;
  onCancel: () => void;
  sending: boolean;
}

export function GiftOfferComposer({ brandId, creatorId, onSend, onCancel, sending }: GiftOfferComposerProps) {
  const [collabId, setCollabId] = useState("none");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);
  const [productName, setProductName] = useState("");
  const [productValue, setProductValue] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!brandId) return;
    supabase
      .from("gift_campaigns")
      .select("*")
      .eq("brand_id", brandId)
      .in("status", ["active", "draft"])
      .order("created_at", { ascending: false })
      .then(({ data }) => setCampaigns(data || []));
  }, [brandId]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  const handleSubmit = async () => {
    await assignCreatorToCollab(collabId, creatorId);
    if (useCustom) {
      if (!productName.trim()) return;
      onSend({
        campaign_title: productName.trim(),
        product_name: productName.trim(),
        product_value: productValue ? parseFloat(productValue) : undefined,
        description: description.trim() || undefined,
        status: "pending",
      });
    } else {
      if (!selectedCampaign) return;
      onSend({
        campaign_id: selectedCampaign.id,
        campaign_title: selectedCampaign.title,
        product_name: selectedCampaign.product_name,
        product_image_url: selectedCampaign.product_image_url || (selectedCampaign.product_images?.[0]) || undefined,
        product_value: selectedCampaign.product_value || undefined,
        description: selectedCampaign.description || undefined,
        status: "pending",
      });
    }
  };

  return (
    <div className="border-t border-border bg-secondary/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-semibold text-sm text-foreground">Send Gift Offer</h4>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <CollabSelector brandId={brandId} creatorId={creatorId} value={collabId} onChange={setCollabId} />

      {campaigns.length > 0 && !useCustom ? (
        <div className="space-y-2">
          <Label className="text-xs">Select Gift Campaign</Label>
          <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
            <SelectTrigger><SelectValue placeholder="Choose a campaign..." /></SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title} — {c.product_name}
                  {c.product_value ? ` (R${Number(c.product_value).toFixed(0)})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCampaign && (
            <div className="bg-secondary rounded-lg p-3 text-sm space-y-1">
              <div className="flex items-center gap-3">
                {(selectedCampaign.product_image_url || selectedCampaign.product_images?.[0]) && (
                  <img
                    src={selectedCampaign.product_image_url || selectedCampaign.product_images?.[0]}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                )}
                <div>
                  <p className="font-medium">{selectedCampaign.product_name}</p>
                  {selectedCampaign.product_value && (
                    <p className="text-xs text-muted-foreground">Value: R{Number(selectedCampaign.product_value).toFixed(2)}</p>
                  )}
                </div>
              </div>
              {selectedCampaign.description && (
                <p className="text-xs text-muted-foreground mt-1">{selectedCampaign.description}</p>
              )}
            </div>
          )}
          <button onClick={() => setUseCustom(true)} className="text-xs text-primary underline">
            Or create a custom offer
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.length > 0 && (
            <button onClick={() => setUseCustom(false)} className="text-xs text-primary underline">
              ← Choose from existing campaigns
            </button>
          )}
          <div>
            <Label className="text-xs">Product Name *</Label>
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Hydrating Serum" />
          </div>
          <div>
            <Label className="text-xs">Product Value (R)</Label>
            <Input type="number" value={productValue} onChange={(e) => setProductValue(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional details about the gift..." />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={sending}>Cancel</Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={sending || (useCustom ? !productName.trim() : !selectedCampaign)}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1" /> Send Gift Offer</>}
        </Button>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, X, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { MentionRequestData } from "@/hooks/useMessages";
import { CollabSelector, assignCreatorToCollab } from "./CollabSelector";

interface MentionRequestComposerProps {
  brandId: string;
  creatorId: string;
  onSend: (data: MentionRequestData) => void;
  onCancel: () => void;
  sending: boolean;
}

const DELIVERABLE_TYPES = [
  { value: "instagram_reel", label: "Instagram Reel" },
  { value: "instagram_story", label: "Instagram Story" },
  { value: "instagram_post", label: "Instagram Post" },
  { value: "tiktok_video", label: "TikTok Video" },
  { value: "tiktok_story", label: "TikTok Story" },
  { value: "youtube_short", label: "YouTube Short" },
  { value: "other", label: "Other" },
];

export function MentionRequestComposer({ brandId, creatorId, onSend, onCancel, sending }: MentionRequestComposerProps) {
  const [collabId, setCollabId] = useState("none");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);
  const [title, setTitle] = useState("");
  const [deliverableType, setDeliverableType] = useState("");
  const [instructions, setInstructions] = useState("");
  const [fee, setFee] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (!brandId) return;
    supabase
      .from("mention_campaigns")
      .select("*")
      .eq("brand_id", brandId)
      .in("status", ["active", "draft"])
      .order("created_at", { ascending: false })
      .then(({ data }) => setCampaigns(data || []));
  }, [brandId]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
  const deliverableLabel = (val: string) => DELIVERABLE_TYPES.find((d) => d.value === val)?.label || val;

  const handleSubmit = async () => {
    await assignCreatorToCollab(collabId, creatorId);
    if (useCustom || campaigns.length === 0) {
      if (!title.trim() || !deliverableType || !fee) return;
      onSend({
        campaign_title: title.trim(),
        deliverable_type: deliverableType,
        deliverable_description: instructions.trim() || undefined,
        fee_amount: parseFloat(fee),
        content_deadline: deadline || undefined,
        status: "pending",
      });
    } else {
      if (!selectedCampaign) return;
      onSend({
        campaign_id: selectedCampaign.id,
        campaign_title: selectedCampaign.title,
        deliverable_type: selectedCampaign.deliverable_type,
        deliverable_description: selectedCampaign.deliverable_description || undefined,
        fee_amount: selectedCampaign.fee_amount,
        content_deadline: selectedCampaign.content_deadline || undefined,
        revision_rounds: selectedCampaign.revision_rounds,
        status: "pending",
      });
    }
  };

  return (
    <div className="border-t border-border bg-secondary/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-semibold text-sm text-foreground">Send Mention Request</h4>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <CollabSelector brandId={brandId} creatorId={creatorId} value={collabId} onChange={setCollabId} />

      {campaigns.length > 0 && !useCustom ? (
        <div className="space-y-2">
          <Label className="text-xs">Select Campaign</Label>
          <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a campaign..." />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title} — R{Number(c.fee_amount).toFixed(0)} ({deliverableLabel(c.deliverable_type)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCampaign && (
            <div className="bg-secondary rounded-lg p-3 text-sm space-y-1">
              <p className="font-medium">{selectedCampaign.title}</p>
              <p className="text-muted-foreground text-xs">
                {deliverableLabel(selectedCampaign.deliverable_type)} · R
                {Number(selectedCampaign.fee_amount).toFixed(2)}
              </p>
              {selectedCampaign.deliverable_description && (
                <p className="text-xs text-muted-foreground">{selectedCampaign.deliverable_description}</p>
              )}
            </div>
          )}
          <button onClick={() => setUseCustom(true)} className="text-xs text-primary underline">
            Or create a custom request
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.length > 0 && (
            <button onClick={() => setUseCustom(false)} className="text-xs text-primary underline">
              ← Select from existing campaigns
            </button>
          )}
          <div>
            <Label className="text-xs">Title *</Label>
            <Input
              placeholder="e.g. Summer Collection Feature"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Deliverable *</Label>
              <Select value={deliverableType} onValueChange={setDeliverableType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Type..." />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERABLE_TYPES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Fee (ZAR) *</Label>
              <Input
                type="number"
                placeholder="500"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Content Instructions</Label>
            <Textarea
              placeholder="What should the creator post?"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="mt-1 min-h-[50px]"
            />
          </div>
          <div>
            <Label className="text-xs">Deadline</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1" />
          </div>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={
          sending ||
          (useCustom || campaigns.length === 0 ? !title.trim() || !deliverableType || !fee : !selectedCampaignId)
        }
        className="w-full"
        size="sm"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
        Send Mention Request
      </Button>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Megaphone, Check, X, Loader2, Calendar, ExternalLink,
  RotateCcw, DollarSign,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { MentionRequestData, MentionRequestStatus } from "@/hooks/useMessages";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const STATUS_CONFIG: Record<MentionRequestStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
  accepted: { label: "Accepted", color: "bg-blue-100 text-blue-700" },
  declined: { label: "Declined", color: "bg-red-100 text-red-700" },
  content_submitted: { label: "Content Submitted", color: "bg-violet-100 text-violet-700" },
  revision_requested: { label: "Revision Requested", color: "bg-orange-100 text-orange-700" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  paid: { label: "Paid", color: "bg-teal-100 text-teal-700" },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground" },
};

const DELIVERABLE_LABELS: Record<string, string> = {
  instagram_reel: "Instagram Reel",
  instagram_story: "Instagram Story",
  instagram_post: "Instagram Post",
  tiktok_video: "TikTok Video",
  tiktok_story: "TikTok Story",
  youtube_short: "YouTube Short",
  other: "Other",
};

const ZAR = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

interface MentionRequestCardProps {
  data: MentionRequestData;
  isMe: boolean;
  isBrand: boolean;
  messageId: string;
  onUpdate: (messageId: string, data: MentionRequestData) => Promise<any>;
}

export function MentionRequestCard({ data, isMe, isBrand, messageId, onUpdate }: MentionRequestCardProps) {
  const [showModal, setShowModal] = useState(false);
  const config = STATUS_CONFIG[data.status];

  return (
    <>
      <Card
        className={`border cursor-pointer hover:shadow-md transition-shadow ${isMe ? "border-foreground/20" : "border-border"}`}
        onClick={() => setShowModal(true)}
      >
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Mention Request</span>
            </div>
            <Badge className={`${config.color} text-[10px]`}>{config.label}</Badge>
          </div>
          <h4 className="font-medium text-foreground text-sm">{data.campaign_title}</h4>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">
              {DELIVERABLE_LABELS[data.deliverable_type] || data.deliverable_type}
            </Badge>
            <span className="font-semibold text-foreground">{ZAR.format(data.fee_amount)}</span>
            {data.content_deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {data.content_deadline}
              </span>
            )}
          </div>
          <p className="text-[10px] text-primary">Click to view details</p>
        </CardContent>
      </Card>

      <MentionRequestModal
        open={showModal}
        onClose={() => setShowModal(false)}
        data={data}
        isBrand={isBrand}
        messageId={messageId}
        onUpdate={onUpdate}
      />
    </>
  );
}

function MentionRequestModal({
  open, onClose, data, isBrand, messageId, onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  data: MentionRequestData;
  isBrand: boolean;
  messageId: string;
  onUpdate: (messageId: string, data: MentionRequestData) => Promise<any>;
}) {
  const [updating, setUpdating] = useState(false);
  const [postUrl, setPostUrl] = useState(data.post_url || "");
  const [brandNote, setBrandNote] = useState("");
  const [creatorNote, setCreatorNote] = useState("");
  const config = STATUS_CONFIG[data.status];

  const handleStatusChange = async (newStatus: MentionRequestStatus, extra?: Partial<MentionRequestData>) => {
    setUpdating(true);
    await onUpdate(messageId, {
      ...data,
      ...extra,
      status: newStatus,
      status_updated_at: new Date().toISOString(),
    });
    setUpdating(false);
    if (["declined", "cancelled"].includes(newStatus)) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Mention Request
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{data.campaign_title}</h3>
              <Badge className={config.color}>{config.label}</Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">
                {DELIVERABLE_LABELS[data.deliverable_type] || data.deliverable_type}
              </Badge>
              <span className="text-lg font-bold text-foreground">{ZAR.format(data.fee_amount)}</span>
            </div>
            {data.content_deadline && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Deadline: {data.content_deadline}
              </p>
            )}
            {data.deliverable_description && (
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Content Instructions</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{data.deliverable_description}</p>
              </div>
            )}
            {data.brand_note && data.status === "revision_requested" && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs font-medium text-orange-700 mb-1">Revision Feedback</p>
                <p className="text-sm text-orange-800">{data.brand_note}</p>
              </div>
            )}
            {data.post_url && (
              <a href={data.post_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1 hover:underline">
                <ExternalLink className="h-3.5 w-3.5" /> View submitted post
              </a>
            )}
          </div>

          {/* Creator actions */}
          {!isBrand && data.status === "pending" && (
            <div className="space-y-2 border-t pt-3">
              <Textarea
                placeholder="Add a note (optional)..."
                value={creatorNote}
                onChange={(e) => setCreatorNote(e.target.value)}
                className="min-h-[40px] text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => handleStatusChange("accepted")} disabled={updating}>
                  {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  Accept
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleStatusChange("declined")} disabled={updating}>
                  <X className="h-3.5 w-3.5 mr-1" /> Decline
                </Button>
              </div>
            </div>
          )}

          {!isBrand && (data.status === "accepted" || data.status === "revision_requested") && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs text-muted-foreground font-medium">Submit your post link</p>
              <Input
                placeholder="Paste your live post link here"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
              />
              <Button
                size="sm"
                className="w-full"
                onClick={() => handleStatusChange("content_submitted", { post_url: postUrl })}
                disabled={updating || !postUrl.trim()}
              >
                {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                {data.status === "revision_requested" ? "Resubmit Post" : "Submit Post for Approval"}
              </Button>
            </div>
          )}

          {!isBrand && data.status === "content_submitted" && (
            <div className="bg-secondary rounded-lg p-3 text-sm text-muted-foreground">
              Submitted. Awaiting brand approval.
            </div>
          )}

          {!isBrand && data.status === "approved" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700">
              <Check className="h-4 w-4 inline mr-1" /> Approved! Payment of {ZAR.format(data.fee_amount)} will be processed shortly.
            </div>
          )}

          {!isBrand && data.status === "paid" && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-teal-700">
              <DollarSign className="h-4 w-4 inline mr-1" /> Paid {ZAR.format(data.fee_amount)}.
            </div>
          )}

          {/* Brand actions */}
          {isBrand && data.status === "content_submitted" && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => handleStatusChange("approved")} disabled={updating}>
                  {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  Approve Post
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                  if (!brandNote.trim()) {
                    setBrandNote("");
                    return;
                  }
                  handleStatusChange("revision_requested", { brand_note: brandNote.trim() });
                }} disabled={updating || !brandNote.trim()}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Request Revision
                </Button>
              </div>
              <Textarea
                placeholder="Revision feedback (required to request revision)..."
                value={brandNote}
                onChange={(e) => setBrandNote(e.target.value)}
                className="min-h-[40px] text-sm"
              />
            </div>
          )}

          {isBrand && data.status === "approved" && (
            <div className="border-t pt-3">
              <Button size="sm" className="w-full" onClick={() => handleStatusChange("paid")} disabled={updating}>
                {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <DollarSign className="h-3.5 w-3.5 mr-1" />}
                Mark as Paid
              </Button>
            </div>
          )}

          {isBrand && (data.status === "pending" || data.status === "accepted") && (
            <div className="border-t pt-3">
              <Button size="sm" variant="outline" className="w-full" onClick={() => handleStatusChange("cancelled")} disabled={updating}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel Request
              </Button>
            </div>
          )}

          {data.status_updated_at && (
            <p className="text-[10px] text-muted-foreground text-right">
              Updated {formatDistanceToNow(new Date(data.status_updated_at), { addSuffix: true })}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

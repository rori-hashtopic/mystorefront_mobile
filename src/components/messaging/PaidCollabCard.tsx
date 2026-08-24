import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Handshake,
  Gift,
  Banknote,
  Package,
  Megaphone,
  Tag,
  Calendar,
  Check,
  X,
  Loader2,
  MapPin,
  Clock,
  Hash,
  AtSign,
  Shield,
  Image as ImageIcon,
  MessageSquareText,
  Pencil,
  Paperclip,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { CreatorCollabWorkspace } from "@/components/messaging/CreatorCollabWorkspace";
import { hasContentDeliverables } from "@/lib/collabTypes";

interface PaidCollabData {
  collab_id: string;
  title: string;
  compensation_type: string;
  description?: string;
  fee_amount?: number;
  product_name?: string;
  product_value?: number;
  product_image_url?: string;
  product_images?: string[];
  platforms?: string[];
  deliverables?: string;
  go_live_date?: string;
  submission_deadline?: string;
  required_hashtags?: string;
  required_mentions?: string;
  dos_and_donts?: string;
  usage_rights?: string;
  payment_terms?: string;
  exclusivity_required?: boolean;
  status: "pending" | "accepted" | "declined" | "negotiating";
  shipping_address?: string;
  sizing_question?: string;
  sizing_answer?: string;
  creator_counter_note?: string;
  brand_withdraw_note?: string;
  brand_withdraw_at?: string;
  declined_by?: "brand" | "creator";
  creator_counter_at?: string;
  additional_notes?: string;
  attachment_url?: string;
  attachment_name?: string;
  max_drafts?: number;
}

interface PaidCollabCardProps {
  data: PaidCollabData;
  isMe: boolean;
  isBrand: boolean;
  messageId: string;
  onUpdate: (messageId: string, data: PaidCollabData) => Promise<any>;
  onEdit?: (messageId: string, data: PaidCollabData) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  declined: { label: "Declined", color: "bg-red-100 text-red-700 hover:bg-red-100" },
  negotiating: { label: "Negotiating", color: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
};

// Granular participant-level statuses from paid_collab_participants
interface StatusMeta {
  label: string;
  color: string;
  creatorNote: string;
  brandNote: string;
  creatorAttention: boolean;
  brandAttention: boolean;
}

// Whether the collab involves shipping a physical product
const hasGifting = (compType: string) => compType.includes("Gifting") || compType === "Gifting + Deliverables";

// Base status display (label + color) — constant regardless of comp type
const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
  negotiating: { label: "Negotiating", color: "bg-blue-100 text-blue-700" },
  accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-700" },
  shipped: { label: "Shipped", color: "bg-sky-100 text-sky-700" },
  delivered: { label: "Delivered", color: "bg-teal-100 text-teal-700" },
  in_progress: { label: "In Progress", color: "bg-violet-100 text-violet-700" },
  draft_submitted: { label: "Draft Submitted", color: "bg-amber-100 text-amber-700" },
  revisions_requested: { label: "Revisions Requested", color: "bg-orange-100 text-orange-700" },
  approved: { label: "Content Approved", color: "bg-emerald-100 text-emerald-700" },
  live: { label: "Live", color: "bg-pink-100 text-pink-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  declined: { label: "Declined", color: "bg-red-100 text-red-700" },
};

function getStatusMeta(status: string, compensationType: string): StatusMeta {
  const display = STATUS_DISPLAY[status] || STATUS_DISPLAY.pending;
  const gifting = hasGifting(compensationType);

  switch (status) {
    case "pending":
      return {
        ...display,
        creatorNote: "Review this brief and respond.",
        brandNote: "Waiting for the creator to accept.",
        creatorAttention: true,
        brandAttention: false,
      };
    case "negotiating":
      return {
        ...display,
        creatorNote: "You proposed changes. Waiting for the brand to respond.",
        brandNote: "The creator proposed changes. Review and respond.",
        creatorAttention: false,
        brandAttention: true,
      };
    case "accepted":
      return gifting
        ? {
            ...display,
            creatorNote: "Waiting for the brand to ship your product.",
            brandNote: "Ship the product to the creator.",
            creatorAttention: false,
            brandAttention: true,
          }
        : {
            ...display,
            creatorNote: "You're booked. Start working on your content.",
            brandNote: "The creator has been booked and will begin working on content.",
            creatorAttention: true,
            brandAttention: false,
          };
    case "shipped":
      return {
        ...display,
        creatorNote: "Your product has been shipped. Confirm when it arrives.",
        brandNote: "Waiting for the creator to confirm receipt.",
        creatorAttention: true,
        brandAttention: false,
      };
    case "delivered": {
      const needsContent = hasContentDeliverables(compensationType);
      return {
        ...display,
        creatorNote: needsContent
          ? "Product received. Start working on your content."
          : "Product received. Enjoy! If you post about it, you can share the link below.",
        brandNote: needsContent
          ? "The creator has received the product and will begin working on content."
          : "The creator has received the product.",
        creatorAttention: needsContent,
        brandAttention: false,
      };
    }
    case "in_progress":
      return {
        ...display,
        creatorNote: "Work on your content and submit a draft when ready.",
        brandNote: "The creator is working on content.",
        creatorAttention: false,
        brandAttention: false,
      };
    case "draft_submitted":
      return {
        ...display,
        creatorNote: "Your draft is under review.",
        brandNote: "Review the creator's draft submission.",
        creatorAttention: false,
        brandAttention: true,
      };
    case "revisions_requested":
      return {
        ...display,
        creatorNote: "The brand requested changes. Update and resubmit your draft.",
        brandNote: "Waiting for the creator to revise their draft.",
        creatorAttention: true,
        brandAttention: false,
      };
    case "approved":
      return {
        ...display,
        creatorNote: "Your content is approved. Post it and share the link.",
        brandNote: "Waiting for the creator to go live.",
        creatorAttention: true,
        brandAttention: false,
      };
    case "live":
      return {
        ...display,
        creatorNote: "Your post is live. Waiting for the brand to verify.",
        brandNote: "Verify the creator's live post.",
        creatorAttention: false,
        brandAttention: true,
      };
    case "completed":
      return {
        ...display,
        creatorNote: "This collab is complete.",
        brandNote: "This collab is complete.",
        creatorAttention: false,
        brandAttention: false,
      };
    case "declined":
      return { ...display, creatorNote: "", brandNote: "", creatorAttention: false, brandAttention: false };
    default:
      return {
        ...STATUS_DISPLAY.pending,
        creatorNote: "",
        brandNote: "",
        creatorAttention: false,
        brandAttention: false,
      };
  }
}

const TYPE_ICONS: Record<string, any> = {
  Gifting: Gift,
  "Gifting + Deliverables": Package,
  "Paid Campaign": Banknote,
  "Paid Campaign + Gifting": Banknote,
  "Mention Request": Megaphone,
  "Discount Code": Tag,
};

const PAYMENT_TERM_LABELS: Record<string, string> = {
  on_acceptance: "On acceptance",
  on_submission: "On content submission",
  on_approval: "On content approval",
  on_go_live: "On go-live",
};

const ZAR = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

const formatDate = (v: string) =>
  new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(v));

function Section({ label, children, changed }: { label: string; children: React.ReactNode; changed?: boolean }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {label}
        {changed && (
          <svg width="10" height="10" viewBox="0 0 10 10" className="inline-block" aria-label="Updated by the brand">
            <title>Updated by the brand</title>
            <line x1="2" y1="2" x2="8" y2="2" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="2" y1="5" x2="8" y2="5" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="2" y1="8" x2="8" y2="8" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </p>
      {children}
    </div>
  );
}

// ─── Confirm Received (creator-side) ─────────────────────────────────────────

function ConfirmReceivedSection({
  collabId,
  creatorId,
  onDelivered,
}: {
  collabId: string;
  creatorId: string;
  onDelivered?: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "not_shipped" | "shipped" | "delivered">("loading");
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("paid_collab_participants" as any)
        .select("status, tracking_url, shipped_at, delivered_at")
        .eq("collab_id", collabId)
        .eq("creator_id", creatorId)
        .maybeSingle();
      if (!data) {
        setStatus("not_shipped");
        return;
      }
      const p = data as any;
      setTrackingUrl(p.tracking_url || null);
      if (p.delivered_at) setStatus("delivered");
      else if (p.shipped_at) setStatus("shipped");
      else setStatus("not_shipped");
    })();
  }, [collabId, creatorId]);

  const handleConfirm = async () => {
    setConfirming(true);
    // This is the creator's proof they received the gift. The optimistic
    // setStatus below stops the button rendering, so a silent failure hid itself
    // permanently — the check has to come first.
    const { data: rows, error } = await supabase
      .from("paid_collab_participants" as any)
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("collab_id", collabId)
      .eq("creator_id", creatorId)
      .select("id");
    if (error || !rows || rows.length === 0) {
      console.error("ConfirmReceived failed", error);
      toast.error("Could not confirm receipt. Please try again.");
      setConfirming(false);
      return;
    }
    setStatus("delivered");
    onDelivered?.();
    toast.success("Gift received. Thank you!");
    setConfirming(false);
  };

  if (status === "loading" || status === "not_shipped") return null;

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Delivery</p>
      {status === "delivered" ? (
        <p className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5" /> You confirmed receipt of this gift
        </p>
      ) : (
        <>
          {trackingUrl &&
            (() => {
              const isUrl = /^https?:\/\//i.test(trackingUrl) || /^[a-z0-9][-a-z0-9]*\.[a-z]{2,}/i.test(trackingUrl);
              return isUrl ? (
                <a
                  href={trackingUrl.startsWith("http") ? trackingUrl : `https://${trackingUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  Track your delivery →
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tracking number: <span className="font-medium text-foreground">{trackingUrl}</span>
                </p>
              );
            })()}
          <p className="text-sm text-muted-foreground">
            Your gift has been shipped. Let the brand know when it arrives.
          </p>
          <Button size="sm" onClick={handleConfirm} disabled={confirming}>
            {confirming ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Package className="h-3.5 w-3.5 mr-1.5" />
            )}
            Confirm Received
          </Button>
        </>
      )}
    </div>
  );
}

/** Brand-side tracking input on the message card */
function BrandTrackingInput({ collabId, onShipped }: { collabId: string; onShipped?: () => void }) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from("paid_collab_participants" as any)
      .select("tracking_url, shipped_at")
      .eq("collab_id", collabId)
      .limit(1)
      .then(({ data }) => {
        const p = (data as any)?.[0];
        if (p?.tracking_url) {
          setUrl(p.tracking_url);
          setSaved(true);
        }
      });
  }, [collabId]);

  const handleSave = async () => {
    if (!url.trim()) return;
    setSaving(true);
    const patch: any = { tracking_url: url.trim() };
    // Also mark as shipped if not already
    const { data: current } = await supabase
      .from("paid_collab_participants" as any)
      .select("shipped_at")
      .eq("collab_id", collabId)
      .limit(1)
      .maybeSingle();
    if (!(current as any)?.shipped_at) {
      patch.shipped_at = new Date().toISOString();
      patch.status = "shipped";
    }
    await supabase
      .from("paid_collab_participants" as any)
      .update(patch)
      .eq("collab_id", collabId);
    setSaving(false);
    setSaved(true);
    toast.success("Tracking saved and creator notified.");
    onShipped?.();
  };

  const handleShipWithoutTracking = async () => {
    setSaving(true);
    const { data: current } = await supabase
      .from("paid_collab_participants" as any)
      .select("shipped_at")
      .eq("collab_id", collabId)
      .limit(1)
      .maybeSingle();
    if (!(current as any)?.shipped_at) {
      await supabase
        .from("paid_collab_participants" as any)
        .update({ shipped_at: new Date().toISOString(), status: "shipped" })
        .eq("collab_id", collabId);
    }
    setSaving(false);
    setSaved(true);
    toast.success("Marked as shipped — creator notified.");
    onShipped?.();
  };

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tracking Link</p>
      <p className="text-xs text-muted-foreground">
        Once you've shipped the order, paste the tracking link here so the creator can follow the delivery.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="https://..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setSaved(false);
          }}
          className="text-sm"
        />
        <Button size="sm" onClick={handleSave} disabled={saving || saved || !url.trim()}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? "Saved" : "Save"}
        </Button>
      </div>
      {!saved && (
        <button
          type="button"
          onClick={handleShipWithoutTracking}
          disabled={saving}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          No tracking link — mark as shipped
        </button>
      )}
    </div>
  );
}

/** Optional post link for pure gifting collabs - no obligation */
function GiftingPostLink({ collabId, creatorId }: { collabId: string; creatorId: string }) {
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("paid_collab_participants" as any)
      .select("live_post_urls")
      .eq("collab_id", collabId)
      .eq("creator_id", creatorId)
      .maybeSingle()
      .then(({ data }) => {
        const urls = (data as any)?.live_post_urls;
        if (urls?.length) {
          setUrl(urls[0]);
          setSaved(true);
        }
      });
  }, [collabId, creatorId]);

  const handleSave = async () => {
    if (!url.trim()) return;
    setSaving(true);
    await supabase
      .from("paid_collab_participants" as any)
      .update({ live_post_urls: [url.trim()] })
      .eq("collab_id", collabId)
      .eq("creator_id", creatorId);
    setSaving(false);
    setSaved(true);
    toast.success("Post link saved.");
  };

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Share your post (optional)</p>
      <p className="text-xs text-muted-foreground">
        If you post about this gift, paste the link here so the brand can see it.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="https://instagram.com/p/..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setSaved(false);
          }}
          className="text-sm"
        />
        <Button size="sm" onClick={handleSave} disabled={saving || saved || !url.trim()}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? "Saved" : "Save"}
        </Button>
      </div>
    </div>
  );
}

export function PaidCollabCard({ data: briefData, isMe, isBrand, messageId, onUpdate, onEdit }: PaidCollabCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { user } = useAuth();
  const [imgError, setImgError] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const [street, setStreet] = useState("");
  const [apartment, setApartment] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("South Africa");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterNote, setCounterNote] = useState("");
  const [sendingCounter, setSendingCounter] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawNote, setWithdrawNote] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const withdrawFormRef = useRef<HTMLDivElement>(null);

  // The withdraw form lives in the scrollable body while the button that opens
  // it sits in the footer — bring it into view so it isn't missed.
  useEffect(() => {
    if (showWithdrawForm) {
      withdrawFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [showWithdrawForm]);
  const [sizingAnswer, setSizingAnswer] = useState("");

  // The message `brief_data` is a lossy snapshot taken at send time — it omits
  // several fields the brand entered (hashtags, mentions, dos/don'ts, usage
  // rights, exclusivity, notes, attachment, submission deadline). The full
  // paid_collabs row has them, so hydrate from it by collab_id and fill only the
  // keys the snapshot is missing (brief_data still wins for what it has). This
  // shows the complete brief to the creator AND brand, fixes already-sent
  // messages, and no-ops gracefully if the row can't be read.
  const [collabExtra, setCollabExtra] = useState<Partial<PaidCollabData>>({});
  const [participantStatus, setParticipantStatus] = useState<string | null>(null);

  // Fetch the real participant-level status from paid_collab_participants
  useEffect(() => {
    if (!briefData?.collab_id || !user) return;
    let cancelled = false;

    const fetchStatus = async () => {
      const query = supabase
        .from("paid_collab_participants" as any)
        .select("status")
        .eq("collab_id", briefData.collab_id);

      if (!isBrand && user) {
        query.eq("creator_id", user.id);
      }

      const { data: rows } = await query;
      if (!cancelled && rows && (rows as any[]).length > 0) {
        setParticipantStatus((rows as any[])[0].status);
      }
    };

    fetchStatus();

    // Subscribe to realtime changes on participant status
    const channel = supabase
      .channel(`participant-${briefData.collab_id}-${messageId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "paid_collab_participants",
          filter: `collab_id=eq.${briefData.collab_id}`,
        },
        () => {
          fetchStatus();
        },
      )
      .subscribe();

    // Polling fallback — realtime can miss events when RLS or network is flaky
    const poll = setInterval(fetchStatus, 15_000);

    // Re-fetch when the tab becomes visible again
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchStatus();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [briefData?.collab_id, briefData?.status, user, isBrand]);
  useEffect(() => {
    if (!briefData?.collab_id) return;
    let cancelled = false;
    supabase
      .from("paid_collabs" as any)
      .select(
        "required_hashtags, required_mentions, dos_and_donts, usage_rights, exclusivity_required, additional_notes, attachment_url, attachment_name, submission_deadline, payment_terms, sizing_question, max_drafts",
      )
      .eq("id", briefData.collab_id)
      .maybeSingle()
      .then((res: any) => {
        if (!cancelled && res?.data) setCollabExtra(res.data as Partial<PaidCollabData>);
      });
    return () => {
      cancelled = true;
    };
  }, [briefData?.collab_id]);
  const data: PaidCollabData = { ...briefData };
  for (const k of Object.keys(collabExtra)) {
    const v = (collabExtra as any)[k];
    if (v != null && (data as any)[k] == null) (data as any)[k] = v;
  }

  const config = STATUS_CONFIG[data.status] || STATUS_CONFIG.pending;
  const Icon = TYPE_ICONS[data.compensation_type] || Handshake;
  const includesGifting = data.compensation_type.includes("Gifting");
  const hasDeliverables = !!data.deliverables;
  const isGiftingOnly = data.compensation_type === "Gifting";

  // Show orange change markers to the creator when the brand has revised the offer
  const cf: string[] = (!isBrand && data.status === "pending" && (data as any).changed_fields) || [];
  const wasChanged = (...fields: string[]) => fields.some((f) => cf.includes(f));

  // Use the granular participant status when available, fall back to brief_data.status
  // Special case: if the message status is "negotiating" (creator proposed changes),
  // use that even if participant status is still "pending"
  const resolvedStatus = data.status === "negotiating" ? "negotiating" : participantStatus || data.status;
  const pMeta = getStatusMeta(resolvedStatus, data.compensation_type);

  const needsAttention = isBrand ? pMeta.brandAttention : pMeta.creatorAttention;
  const nextStepNote = isBrand ? pMeta.brandNote : pMeta.creatorNote;

  const buildAddress = () =>
    [street, apartment, city, province, postalCode, country, additionalNotes].filter(Boolean).join("\n");
  const isAddressValid = street.trim() && city.trim() && province.trim() && postalCode.trim();
  const isSizingValid = !data.sizing_question || sizingAnswer.trim();
  const canAccept = (!includesGifting || isAddressValid) && isSizingValid;

  const handleResponse = async (accepted: boolean) => {
    setUpdating(true);
    try {
      const newStatus = accepted ? "accepted" : "declined";
      const extra: Partial<PaidCollabData> = {};
      if (!accepted) extra.declined_by = isBrand ? "brand" : "creator";
      if (!isBrand && accepted && includesGifting) extra.shipping_address = buildAddress();
      if (!isBrand && accepted && data.sizing_question && sizingAnswer.trim())
        extra.sizing_answer = sizingAnswer.trim();
      // The participant row is what the brand's Manage drawer actually ships
      // from, so it goes FIRST and has to prove it landed. An update blocked by
      // RLS returns NO error and simply matches zero rows — .select() is the
      // only way to tell the difference.
      //
      // The paid_collabs `status: "active"` write that used to sit here was
      // removed, not fixed: creators hold SELECT only on that table, so it has
      // always matched zero rows, and CollabComposer already creates the collab
      // as "active". Do NOT re-add it with error checking — that would start
      // throwing on a write that is meant to be denied and would block every
      // creator from accepting.
      //
      // Declines are written here too. Previously only acceptance touched this
      // row, so a creator could decline, see "Declined" on their own card, and
      // the brand's Manage drawer would still list them as Pending forever —
      // the two sides disagreeing about whether the collab was still live.
      if (!isBrand && user && data.collab_id) {
        const participantPatch: Record<string, any> = { status: newStatus };
        if (extra.shipping_address) participantPatch.shipping_address = extra.shipping_address;
        if (extra.sizing_answer) participantPatch.sizing_answer = extra.sizing_answer;
        const { data: updatedRows, error: partErr } = await supabase
          .from("paid_collab_participants" as any)
          .update(participantPatch)
          .eq("collab_id", data.collab_id)
          .eq("creator_id", user.id)
          .select("id");
        if (partErr) throw partErr;
        if (!updatedRows || updatedRows.length === 0) {
          if (accepted) {
            // A silent half-acceptance is dangerous — the brand would ship to
            // an address that was never saved. Refuse.
            throw new Error(
              "We couldn't save your acceptance against this collab. Nothing was changed. Please message the brand before continuing.",
            );
          }
          // A decline must never be blocked. If the row is missing the creator
          // still gets out, and the decline is recorded on the message below —
          // being trapped in a collab you have said no to is worse than the
          // brand's list being briefly stale.
          console.error("Decline: no participant row updated for collab", data.collab_id);
        }
      }

      // Last, because this is what renders "accepted" in the chat and triggers
      // the brand's notification. ChatView already raises its own error toast
      // for this call, so return quietly rather than showing a second one.
      const res: any = await onUpdate(messageId, { ...data, ...extra, status: newStatus });
      if (res?.error) return;

      toast.success(accepted ? "Collab accepted!" : "Collab declined");
      setShowModal(false);
    } catch (e: any) {
      console.error("PaidCollabCard.handleResponse failed", e);
      toast.error(e?.message || "Could not update. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleCounter = async () => {
    if (!counterNote.trim()) return;
    setSendingCounter(true);
    try {
      // ChatView toasts its own error for this, so bail quietly rather than
      // claiming the brand received a proposal that was never saved.
      const res: any = await onUpdate(messageId, {
        ...data,
        status: "negotiating",
        creator_counter_note: counterNote.trim(),
        creator_counter_at: new Date().toISOString(),
      });
      if (res?.error) return;
      toast.success("Your proposed changes were sent to the brand.");
      setShowCounterForm(false);
      setCounterNote("");
    } catch {
      toast.error("Could not send your proposal");
    } finally {
      setSendingCounter(false);
    }
  };

  // Brands must explain a withdrawal — the creator has usually already spent
  // time on the negotiation, and the reason is kept on the card as a record.
  const WITHDRAW_MIN_CHARS = 10;
  const withdrawNoteIsValid = withdrawNote.trim().length >= WITHDRAW_MIN_CHARS;

  const handleWithdraw = async () => {
    if (!withdrawNoteIsValid) return;
    setWithdrawing(true);
    try {
      // A creator who is never told the offer was withdrawn is worse than an
      // error, so don't claim it happened unless the write landed.
      const res: any = await onUpdate(messageId, {
        ...data,
        status: "declined",
        declined_by: "brand",
        brand_withdraw_note: withdrawNote.trim(),
        brand_withdraw_at: new Date().toISOString(),
      });
      if (res?.error) return;
      toast.success("Offer withdrawn. The creator has been told why.");
      setShowWithdrawForm(false);
      setWithdrawNote("");
      setShowModal(false);
    } catch {
      toast.error("Could not withdraw the offer");
    } finally {
      setWithdrawing(false);
    }
  };

  // Who ended it matters: a brand withdrawal must never read as "you declined"
  // to the creator. declined_by is set going forward; brand_withdraw_note
  // covers offers withdrawn before that field existed. Older records have
  // neither, so fall back to neutral wording rather than guessing.
  const withdrawnByBrand = data.declined_by === "brand" || !!data.brand_withdraw_note;
  const declinedByCreator = data.declined_by === "creator";

  const statusLabel = withdrawnByBrand ? "Withdrawn" : config.label;

  // A counter note on a *pending* offer means the brand has since sent a revised
  // offer, so the ask is no longer live — it reads as a record of what the
  // creator originally requested rather than an outstanding change request.
  const counterSuperseded = !!data.creator_counter_note && data.status === "pending";
  const showCounterNote =
    !!data.creator_counter_note && (data.status === "negotiating" || data.status === "accepted" || counterSuperseded);
  const counterNoteLabel = counterSuperseded
    ? isBrand
      ? "Creator's original request"
      : "Your original request"
    : data.status === "accepted"
      ? "Agreed changes"
      : isBrand
        ? "Creator's proposed changes"
        : "Your proposed changes";

  const closingStatusText = (() => {
    if (data.status === "accepted") {
      return isBrand ? "The creator accepted this collab." : "You accepted this collab.";
    }
    if (data.status === "declined") {
      if (withdrawnByBrand) return isBrand ? "You withdrew this offer." : "The brand withdrew this offer.";
      if (declinedByCreator) return isBrand ? "The creator declined this collab." : "You declined this collab.";
      return "This collab was declined.";
    }
    return `This collab was ${data.status}.`;
  })();

  return (
    <>
      {/* ── Summary card ── */}
      <Card
        className={`border cursor-pointer hover:shadow-md transition-shadow relative ${isMe ? "border-foreground/20" : "border-border"}`}
        onClick={() => setShowModal(true)}
      >
        {/* Attention indicator */}
        {needsAttention && (
          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 z-10">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border-2 border-background" />
          </span>
        )}
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                Paid Collab · {data.compensation_type}
              </span>
            </div>
            <Badge className={`text-xs shrink-0 pointer-events-none ${pMeta.color}`}>
              {withdrawnByBrand ? "Withdrawn" : pMeta.label}
            </Badge>
          </div>

          {/* Product image — shown prominently for gifting */}
          {includesGifting && data.product_image_url && !imgError && (
            <img
              src={data.product_image_url}
              alt={data.product_name || "Product"}
              className="w-full h-40 rounded-xl object-cover border border-border"
              onError={() => setImgError(true)}
            />
          )}

          {/* Title */}
          <p className="font-semibold text-foreground">{data.title}</p>

          {/* Key details row */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {data.fee_amount && (
              <span className="flex items-center gap-1">
                <Banknote className="h-3 w-3" /> {ZAR.format(data.fee_amount)}
              </span>
            )}
            {data.product_name && (
              <span className="flex items-center gap-1">
                <Gift className="h-3 w-3" /> {data.product_name}
                {data.product_value ? ` (${ZAR.format(data.product_value)})` : ""}
              </span>
            )}
            {data.deliverables && (
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" /> {data.deliverables}
              </span>
            )}
            {data.go_live_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Go-live: {formatDate(data.go_live_date)}
              </span>
            )}
            {data.platforms && data.platforms.length > 0 && <span>{data.platforms.join(", ")}</span>}
          </div>

          {data.description && <p className="text-xs text-muted-foreground line-clamp-2">{data.description}</p>}

          {/* Next step note */}
          {nextStepNote && data.status !== "declined" && !withdrawnByBrand && (
            <p
              className={`text-xs font-medium flex items-center gap-1.5 ${needsAttention ? "text-amber-700" : "text-muted-foreground"}`}
            >
              {needsAttention ? <Clock className="h-3 w-3 shrink-0" /> : <Check className="h-3 w-3 shrink-0" />}
              {nextStepNote}
            </p>
          )}

          {showCounterNote ? (
            <p className="text-xs text-blue-700 font-medium flex items-center gap-1">
              <MessageSquareText className="h-3 w-3" />{" "}
              {counterSuperseded
                ? "Revised offer. Click to view"
                : data.status === "accepted"
                  ? "Agreed changes. Click to view"
                  : "Changes proposed. Click to view"}
            </p>
          ) : (
            <p className="text-xs text-primary font-medium">Click to view full brief →</p>
          )}
        </CardContent>
      </Card>

      {/* ── Full detail modal ── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[80dvh] p-0 gap-0 rounded-xl overflow-hidden flex flex-col">
          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
          </div>

          {/* Header */}
          <div className="px-4 pt-2 sm:px-6 sm:pt-4 shrink-0">
            <DialogHeader className="mb-2 text-left">
              <div className="flex items-start justify-between gap-3 pr-6">
                <div>
                  <DialogTitle className="font-display text-xl leading-tight">{data.title}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5 text-left">{data.compensation_type}</p>
                </div>
                <Badge className={`shrink-0 mt-1 pointer-events-none ${pMeta.color}`}>
                  {withdrawnByBrand ? "Withdrawn" : pMeta.label}
                </Badge>
              </div>
            </DialogHeader>
          </div>

          {/* Next step banner */}
          {data.status !== "pending" &&
            data.status !== "negotiating" &&
            nextStepNote &&
            data.status !== "declined" &&
            !withdrawnByBrand && (
              <div className="px-4 sm:px-6 pb-1">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-foreground/[0.04] border border-foreground/10">
                  <div className="shrink-0 mt-0.5 h-5 w-5 rounded-full bg-foreground/10 flex items-center justify-center">
                    {needsAttention ? (
                      <span className="text-[10px] font-bold text-foreground">!</span>
                    ) : (
                      <Check className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{nextStepNote}</p>
                </div>
              </div>
            )}

          {/* Scrollable body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6">
            <div className="space-y-5 py-2">
              {/* Product image(s) */}
              {includesGifting &&
                (() => {
                  const images =
                    data.product_images && data.product_images.length > 0
                      ? data.product_images
                      : data.product_image_url
                        ? [data.product_image_url]
                        : [];
                  const visible = images.filter((_, i) => !imgErrors[i]);
                  if (visible.length === 0) return null;
                  if (visible.length === 1) {
                    const idx = images.indexOf(visible[0]);
                    return (
                      <img
                        src={visible[0]}
                        alt={data.product_name || "Product"}
                        className="w-full h-52 rounded-xl object-cover border border-border"
                        onError={() => setImgErrors((p) => ({ ...p, [idx]: true }))}
                      />
                    );
                  }
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      {images.map((url, i) =>
                        imgErrors[i] ? null : (
                          <img
                            key={i}
                            src={url}
                            alt={`${data.product_name || "Product"} ${i + 1}`}
                            className={`w-full rounded-xl object-cover border border-border ${i === 0 && images.length % 2 !== 0 ? "col-span-2 h-48" : "h-36"}`}
                            onError={() => setImgErrors((p) => ({ ...p, [i]: true }))}
                          />
                        ),
                      )}
                    </div>
                  );
                })()}

              {/* Description */}
              {data.description && (
                <Section label="Description" changed={wasChanged("description")}>
                  <p className="text-sm text-foreground leading-relaxed">{data.description}</p>
                </Section>
              )}

              {/* Compensation */}
              {(data.fee_amount || (includesGifting && data.product_name)) && (
                <Section
                  label="Compensation"
                  changed={wasChanged("fee_amount", "product_name", "product_value", "payment_terms")}
                >
                  {data.fee_amount && (
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{ZAR.format(data.fee_amount)}</span>
                      {data.payment_terms && (
                        <span className="text-xs text-muted-foreground">
                          · {PAYMENT_TERM_LABELS[data.payment_terms] || data.payment_terms}
                        </span>
                      )}
                    </div>
                  )}
                  {includesGifting && data.product_name && (
                    <div className="flex items-start gap-3 mt-2">
                      {data.product_image_url && !imgError ? (
                        <img
                          src={data.product_image_url}
                          alt=""
                          className="h-16 w-16 rounded-lg object-cover border shrink-0"
                          onError={() => setImgError(true)}
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg border bg-secondary flex items-center justify-center shrink-0">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{data.product_name}</p>
                        {data.product_value != null && data.product_value > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Product value: {ZAR.format(data.product_value)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </Section>
              )}

              {/* Deliverables */}
              {hasDeliverables && (
                <Section label="Deliverables" changed={wasChanged("deliverables", "platforms", "max_drafts")}>
                  <p className="text-sm text-foreground">{data.deliverables}</p>
                  {data.max_drafts && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {data.max_drafts} draft {data.max_drafts === 1 ? "round" : "rounds"} allowed
                    </p>
                  )}
                  {data.platforms && data.platforms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {data.platforms.map((p) => (
                        <span
                          key={p}
                          className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {/* Timeline */}
              {(data.go_live_date || data.submission_deadline) && (
                <Section label="Timeline" changed={wasChanged("go_live_date", "submission_deadline")}>
                  {data.submission_deadline && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        Draft due: <strong>{formatDate(data.submission_deadline)}</strong>
                      </span>
                    </div>
                  )}
                  {data.go_live_date && (
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        Go-live: <strong>{formatDate(data.go_live_date)}</strong>
                      </span>
                    </div>
                  )}
                </Section>
              )}

              {/* Content guidelines */}
              {(data.required_hashtags || data.required_mentions || data.dos_and_donts) && (
                <Section
                  label="Content Guidelines"
                  changed={wasChanged("required_hashtags", "required_mentions", "dos_and_donts")}
                >
                  {data.required_hashtags && (
                    <div className="flex items-start gap-2">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground">{data.required_hashtags}</p>
                    </div>
                  )}
                  {data.required_mentions && (
                    <div className="flex items-start gap-2 mt-1">
                      <AtSign className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground">{data.required_mentions}</p>
                    </div>
                  )}
                  {data.dos_and_donts && (
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed border-l-2 border-border pl-3">
                      {data.dos_and_donts}
                    </p>
                  )}
                </Section>
              )}

              {/* Usage rights */}
              {data.usage_rights && (
                <Section label="Usage Rights" changed={wasChanged("usage_rights")}>
                  <div className="flex items-start gap-2">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground">{data.usage_rights}</p>
                  </div>
                </Section>
              )}

              {/* Exclusivity — reads as a normal brief field, not a warning. */}
              {data.exclusivity_required && (
                <Section label="Exclusivity" changed={wasChanged("exclusivity_required")}>
                  <div className="flex items-start gap-2">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground">
                      You may not promote direct competitors during this campaign.
                    </p>
                  </div>
                </Section>
              )}

              {/* Additional notes */}
              {data.additional_notes && (
                <Section label="Additional Notes" changed={wasChanged("additional_notes")}>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{data.additional_notes}</p>
                </Section>
              )}

              {/* Attachment */}
              {data.attachment_url && (
                <Section label="Attached File">
                  <a
                    href={data.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[220px]">{data.attachment_name || "View attachment"}</span>
                  </a>
                </Section>
              )}

              {/* Shipping notice / address form for gifting */}
              {includesGifting && !isBrand && data.status === "pending" && !showCounterForm && (
                <div className="space-y-3 border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Shipping Address</p>
                  <p className="text-xs text-muted-foreground">
                    Please provide your shipping address so the brand can send the product if you accept.
                  </p>
                  <div className="space-y-2">
                    <Input
                      placeholder="Street address *"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Apartment, suite, unit (optional)"
                      value={apartment}
                      onChange={(e) => setApartment(e.target.value)}
                      className="text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="City *"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Province *"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Postal code *"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <Textarea
                      placeholder="Additional notes (optional). E.g. access code, floor, delivery instructions"
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                  </div>
                </div>
              )}
              {/* Sizing question — shown to creator when pending */}
              {data.sizing_question && !isBrand && data.status === "pending" && !showCounterForm && (
                <div className="space-y-3 border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand Question</p>
                  <p className="text-sm text-foreground">{data.sizing_question}</p>
                  <Input
                    placeholder="Your answer…"
                    value={sizingAnswer}
                    onChange={(e) => setSizingAnswer(e.target.value)}
                    className="text-sm"
                  />
                </div>
              )}

              {/* Sizing answer — shown after acceptance */}
              {data.sizing_question && data.sizing_answer && data.status === "accepted" && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {isBrand ? "Creator's Answer" : "Your Answer"}
                  </p>
                  <p className="text-xs text-muted-foreground">{data.sizing_question}</p>
                  <p className="text-sm text-foreground">{data.sizing_answer}</p>
                </div>
              )}

              {includesGifting && !isBrand && data.status === "accepted" && data.shipping_address && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Shipping Address Provided
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{data.shipping_address}</p>
                </div>
              )}

              {includesGifting && isBrand && data.status === "accepted" && data.shipping_address && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Creator Shipping Address
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{data.shipping_address}</p>
                </div>
              )}

              {/* Agreed changes / counter note — kept on card as a record, placed
                  after the shipping address but before the tracking input so the
                  brand's next action (adding a tracking link) stays at the bottom. */}
              {showCounterNote && (
                <div className="space-y-1.5 rounded-xl border border-foreground/10 bg-foreground/[0.04] px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                    <MessageSquareText className="h-3.5 w-3.5" />
                    {counterNoteLabel}
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{data.creator_counter_note}</p>
                  {counterSuperseded && (
                    <p className="text-xs text-muted-foreground">
                      {isBrand
                        ? "You sent a revised offer in response to this. The terms above are the current ones."
                        : "The brand sent a revised offer in response to this. The terms above are the current ones."}
                    </p>
                  )}
                  {data.status === "accepted" && isBrand && (
                    <p className="text-xs text-muted-foreground">
                      Accepted as agreed. If the brief above still shows the original terms, use "Send Revised Offer" to
                      update them.
                    </p>
                  )}
                </div>
              )}

              {/* Confirm Received — creator side, after brand ships */}
              {includesGifting && !isBrand && user && data.collab_id && data.status === "accepted" && (
                <ConfirmReceivedSection
                  collabId={data.collab_id}
                  creatorId={user.id}
                  onDelivered={() => setParticipantStatus("delivered")}
                />
              )}

              {/* Brand tracking input — sits at the bottom so it's the clear next action */}
              {includesGifting && isBrand && data.collab_id && ["accepted", "shipped"].includes(resolvedStatus) && (
                <BrandTrackingInput collabId={data.collab_id} onShipped={() => setParticipantStatus("shipped")} />
              )}

              {/* Creator workspace - for gifting types, only after delivery confirmed; for paid-only, after acceptance */}
              {!isBrand &&
                user &&
                data.collab_id &&
                data.compensation_type !== "Gifting" &&
                (data.compensation_type.includes("Gifting")
                  ? [
                      "delivered",
                      "in_progress",
                      "draft_submitted",
                      "revisions_requested",
                      "approved",
                      "live",
                      "completed",
                    ].includes(resolvedStatus)
                  : resolvedStatus === "accepted" ||
                    ["in_progress", "draft_submitted", "revisions_requested", "approved", "live", "completed"].includes(
                      resolvedStatus,
                    )) && (
                  <CreatorCollabWorkspace
                    collabId={data.collab_id}
                    creatorId={user.id}
                    compensationType={data.compensation_type}
                    feeAmount={data.fee_amount}
                    paymentTerms={data.payment_terms}
                    onStatusChange={setParticipantStatus}
                  />
                )}

              {/* Optional post link for pure gifting - only after delivery confirmed */}
              {!isBrand &&
                user &&
                data.collab_id &&
                data.compensation_type === "Gifting" &&
                resolvedStatus === "delivered" && <GiftingPostLink collabId={data.collab_id} creatorId={user.id} />}

              {/* Withdrawal reason — kept on the card for both parties as a record. */}
              {data.brand_withdraw_note && (
                <div className="space-y-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-red-700">
                    <X className="h-3.5 w-3.5" />
                    {isBrand ? "Why you withdrew" : "Why the brand withdrew"}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-red-900">{data.brand_withdraw_note}</p>
                </div>
              )}

              {/* Withdraw form for brand */}
              {isBrand && showWithdrawForm && (
                <div ref={withdrawFormRef} className="space-y-2 rounded-xl border border-red-200 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Withdraw offer</p>
                  <p className="text-xs text-muted-foreground">
                    Let the creator know why you're withdrawing. This is required and they'll see it on the offer.
                  </p>
                  <Textarea
                    className="min-h-[70px] text-sm"
                    placeholder="e.g. We've filled this slot with another creator — we'd love to work with you on the next campaign."
                    value={withdrawNote}
                    onChange={(e) => setWithdrawNote(e.target.value)}
                  />
                  {withdrawNote.trim().length > 0 && !withdrawNoteIsValid && (
                    <p className="text-xs text-red-700">Please give a little more detail (at least 10 characters).</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setShowWithdrawForm(false);
                        setWithdrawNote("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-red-600 text-white hover:bg-red-700"
                      disabled={!withdrawNoteIsValid || withdrawing}
                      onClick={handleWithdraw}
                    >
                      {withdrawing ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Withdraw Offer
                    </Button>
                  </div>
                </div>
              )}

              {/* Counter-offer form for creator */}
              {!isBrand && showCounterForm && (
                <div className="space-y-2 rounded-xl border border-border px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Propose changes</p>
                  <p className="text-xs text-muted-foreground">
                    Tell the brand what you'd like adjusted, e.g. fee, size, or deliverables.
                  </p>
                  <Textarea
                    className="text-sm min-h-[70px]"
                    placeholder="e.g. Due to the deadline, I can do 1 Reel instead of 2"
                    value={counterNote}
                    onChange={(e) => setCounterNote(e.target.value)}
                  />
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setShowCounterForm(false);
                        setCounterNote("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={!counterNote.trim() || sendingCounter}
                      onClick={handleCounter}
                    >
                      {sendingCounter ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <MessageSquareText className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Send Proposal
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {/* end space-y-5 */}
          </div>
          {/* end scrollable body */}

          {/* Footer actions */}
          <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-t border-border/50 bg-background space-y-2">
            {!isBrand &&
              (data.status === "pending" || (data.status === "negotiating" && !data.creator_counter_note)) &&
              !showCounterForm && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    className="flex-1 text-xs px-2 h-10"
                    disabled={updating}
                    onClick={() => handleResponse(false)}
                  >
                    {updating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 mr-1 shrink-0" />
                    )}
                    Decline
                  </Button>
                  {!isGiftingOnly && (
                    <Button
                      variant="outline"
                      className="flex-1 text-xs px-2 h-10"
                      disabled={updating}
                      onClick={() => setShowCounterForm(true)}
                    >
                      <MessageSquareText className="h-3.5 w-3.5 mr-1 shrink-0" />
                      {data.status === "negotiating" ? "Edit Proposal" : "Propose Changes"}
                    </Button>
                  )}
                  <Button
                    className="flex-1 text-xs px-2 h-10"
                    disabled={updating || !canAccept}
                    onClick={() => handleResponse(true)}
                  >
                    {updating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1 shrink-0" />
                    ) : (
                      <Check className="h-3.5 w-3.5 mr-1 shrink-0" />
                    )}
                    {includesGifting ? "Accept & Confirm" : "Accept Collab"}
                  </Button>
                </div>
              )}
            {/* Creator proposed changes and is waiting for the brand to respond */}
            {!isBrand && data.status === "negotiating" && !!data.creator_counter_note && !showCounterForm && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <p className="text-xs text-muted-foreground text-center flex-1 py-2">
                  Waiting for the brand to respond to your proposed changes.
                </p>
                <Button
                  variant="outline"
                  className="text-xs px-2 h-10"
                  disabled={updating}
                  onClick={() => setShowCounterForm(true)}
                >
                  <MessageSquareText className="h-3.5 w-3.5 mr-1 shrink-0" />
                  Edit Proposal
                </Button>
                <Button
                  variant="outline"
                  className="text-xs px-2 h-10"
                  disabled={updating}
                  onClick={() => handleResponse(false)}
                >
                  <X className="h-3.5 w-3.5 mr-1 shrink-0" />
                  Withdraw
                </Button>
              </div>
            )}
            {!isBrand && !canAccept && data.status === "pending" && !showCounterForm && (
              <p className="text-xs text-muted-foreground text-center">
                {includesGifting && !isAddressValid && !isSizingValid
                  ? "Scroll up to fill in your shipping address and answer the sizing question before accepting."
                  : includesGifting && !isAddressValid
                    ? "Scroll up to fill in your shipping address before accepting."
                    : !isSizingValid
                      ? "Scroll up to answer the brand's question before accepting."
                      : null}
              </p>
            )}
            {isBrand && (data.status === "pending" || data.status === "negotiating") && !showWithdrawForm && (
              <div className="space-y-2">
                {data.status === "negotiating" && (
                  <p className="text-xs text-muted-foreground">
                    To accept the creator's proposal, send a revised offer with the agreed terms. That becomes the
                    on-the-record offer they accept, so the final terms are always tracked.
                  </p>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  {data.status === "negotiating" && (
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 text-xs px-2 h-10"
                      disabled={updating}
                      onClick={() => setShowWithdrawForm(true)}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Withdraw
                    </Button>
                  )}
                  <Button
                    variant={data.status === "negotiating" ? "default" : "outline"}
                    className={`flex-1 text-xs px-2 h-10 ${
                      data.status === "negotiating" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                    }`}
                    onClick={() => {
                      setShowModal(false);
                      onEdit(messageId, data);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1 shrink-0" />
                    {data.status === "negotiating" ? "Accept & Revise Offer" : "Send Revised Offer"}
                  </Button>
                </div>
              </div>
            )}

            {data.status !== "pending" && data.status !== "negotiating" && (
              <p className="text-center text-sm text-muted-foreground">{closingStatusText}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

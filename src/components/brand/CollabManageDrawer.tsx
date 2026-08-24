import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/** Collapsible section that auto-opens/closes based on relevance */
function CollapsibleSection({
  id,
  icon,
  title,
  defaultOpen,
  children,
}: {
  id?: string;
  icon?: React.ReactNode;
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} className="space-y-3">
      <button
        type="button"
        className="w-full flex items-center justify-between group"
        onClick={() => setOpen((v) => !v)}
      >
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          {icon} {title}
        </h4>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && children}
    </section>
  );
}
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasCashFee, hasContentDeliverables } from "@/lib/collabTypes";
import {
  Loader2,
  Truck,
  Package,
  Banknote,
  CheckCircle2,
  X,
  ExternalLink,
  Clock,
  FileVideo,
  Send,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { emailCreatorOnCollabStatus } from "@/lib/collabEmails";

interface Collab {
  id: string;
  brand_id: string;
  title: string;
  compensation_type: string;
  fee_amount: number | null;
  status: string;
  max_drafts?: number | null;
  payment_terms?: string | null;
  product_name?: string | null;
  product_value?: number | null;
  go_live_date?: string | null;
  creator_ids?: string[] | null;
  sizing_question?: string | null;
}

interface Participant {
  id: string;
  collab_id: string;
  creator_id: string;
  status: string;
  shipping_address: string | null;
  sizing_answer: string | null;
  tracking_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  live_post_urls: string[] | null;
  verified_live_at: string | null;
  revision_count: number;
  revision_note: string | null;
  payment_status: string;
  payment_amount: number | null;
  paid_at: string | null;
}

interface Submission {
  id: string;
  participant_id: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  caption: string | null;
  platform: string | null;
  version: number;
  status: string;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface CreatorProfile {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  username: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collab: Collab;
  /** Brand's display name — used to personalise the creator-facing status emails. */
  brandName?: string;
}

const STATUS_PIPELINE = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "in_progress", label: "In Progress" },
  { value: "draft_submitted", label: "Draft Submitted" },
  { value: "revisions_requested", label: "Revisions Requested" },
  { value: "approved", label: "Approved" },
  { value: "live", label: "Live" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
];

const CAMPAIGN_STATUSES = [
  { value: "draft", label: "Draft", style: "bg-muted text-muted-foreground" },
  {
    value: "active",
    label: "Active",
    style: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  { value: "paused", label: "Paused", style: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "completed", label: "Completed", style: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "closed", label: "Closed", style: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
];

const ZAR = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

export function CollabManageDrawer({ open, onOpenChange, collab, brandName }: Props) {
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [profiles, setProfiles] = useState<Record<string, CreatorProfile>>({});
  const [submissionsByParticipant, setSubmissionsByParticipant] = useState<Record<string, Submission[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [campaignStatus, setCampaignStatus] = useState(collab.status || "active");
  const [statusSaving, setStatusSaving] = useState(false);

  const includesGifting = collab.compensation_type?.includes("Gifting");
  // isPaid is a CASH-FEE question and gates only the Payment section.
  // It used to gate Content Submissions too, which is a DELIVERABLES question —
  // and "Gifting + Deliverables" is the one type that is content-bearing but
  // fee-free, so it fell through the gap. Creators uploaded drafts this drawer
  // fetched successfully and then refused to render, which also blocked
  // approval, live posts, Verify Live, and left the amber dot stuck on.
  const isPaid = hasCashFee(collab.compensation_type);
  const hasDeliverables = hasContentDeliverables(collab.compensation_type);

  const fetchAll = async () => {
    setLoading(true);
    const { data: parts } = await supabase
      .from("paid_collab_participants" as any)
      .select("*")
      .eq("collab_id", collab.id)
      .order("created_at", { ascending: true });
    const rows = (parts as unknown as Participant[]) || [];
    setParticipants(rows);
    if (rows.length && !activeId) setActiveId(rows[0].id);

    const ids = rows.map((r) => r.creator_id);
    if (ids.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, username")
        .in("id", ids);
      const map: Record<string, CreatorProfile> = {};
      (ps || []).forEach((p: any) => (map[p.id] = p));
      setProfiles(map);
    }

    if (rows.length) {
      const { data: subs } = await supabase
        .from("paid_collab_submissions" as any)
        .select("*")
        .in(
          "participant_id",
          rows.map((r) => r.id),
        )
        .order("created_at", { ascending: false });
      const byPart: Record<string, Submission[]> = {};
      ((subs as unknown as Submission[]) || []).forEach((s) => {
        byPart[s.participant_id] = byPart[s.participant_id] || [];
        byPart[s.participant_id].push(s);
      });
      setSubmissionsByParticipant(byPart);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, collab.id]);

  useEffect(() => {
    if (open) setCampaignStatus(collab.status || "active");
  }, [open, collab.id, collab.status]);

  const handleCampaignStatusChange = async (newStatus: string) => {
    setStatusSaving(true);
    const { error } = await supabase.from("paid_collabs").update({ status: newStatus }).eq("id", collab.id);
    if (error) {
      toast.error("Failed to update campaign status");
    } else {
      setCampaignStatus(newStatus);
      collab.status = newStatus;
      toast.success(`Campaign marked as ${CAMPAIGN_STATUSES.find((s) => s.value === newStatus)?.label || newStatus}`);
    }
    setStatusSaving(false);
  };

  const updateParticipant = async (id: string, patch: Partial<Participant>) => {
    const { error } = await supabase
      .from("paid_collab_participants" as any)
      .update(patch)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setParticipants((prev) => prev.map((p) => (p.id === id ? ({ ...p, ...patch } as Participant) : p)));
    toast.success("Updated");
  };

  const active = participants.find((p) => p.id === activeId) || null;
  const activeProfile = active ? profiles[active.creator_id] : null;
  const activeSubmissions = active ? submissionsByParticipant[active.id] || [] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="pr-10">
            <DialogTitle className="font-display text-xl text-left">{collab.title}</DialogTitle>
          </div>
          <div className="flex items-center justify-between gap-3 mt-1">
            <p className="text-xs text-muted-foreground">
              {collab.compensation_type}
              {collab.fee_amount ? ` · ${ZAR.format(collab.fee_amount)}` : ""}
            </p>
            <Select value={campaignStatus} onValueChange={handleCampaignStatusChange} disabled={statusSaving}>
              <SelectTrigger
                className={`h-7 w-[120px] text-xs font-medium rounded-full border-0 shrink-0 focus:ring-0 focus:ring-offset-0 ${CAMPAIGN_STATUSES.find((s) => s.value === campaignStatus)?.style || "bg-muted text-muted-foreground"}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : participants.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No creators have been assigned to this collab yet.
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col sm:flex-row overflow-hidden">
            {/* Sidebar */}
            <aside className="sm:w-60 sm:border-r border-b sm:border-b-0 overflow-y-auto shrink-0">
              {participants.map((p) => {
                const prof = profiles[p.creator_id];
                return (
                  <button
                    key={p.id}
                    onClick={() => setActiveId(p.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      activeId === p.id ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={prof?.photo_url || ""} />
                      <AvatarFallback>{prof?.display_name?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{prof?.display_name || "—"}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                        {STATUS_PIPELINE.find((s) => s.value === p.status)?.label || p.status}
                      </p>
                    </div>
                  </button>
                );
              })}
            </aside>

            {/* Detail */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {active && (
                <ParticipantDetail
                  participant={active}
                  profile={activeProfile}
                  submissions={activeSubmissions}
                  collab={collab}
                  brandName={brandName}
                  includesGifting={!!includesGifting}
                  isPaid={!!isPaid}
                  hasDeliverables={hasDeliverables}
                  onUpdate={(patch) => updateParticipant(active.id, patch)}
                  onReviewSubmission={async (submissionId, status, note) => {
                    const { error } = await supabase
                      .from("paid_collab_submissions" as any)
                      .update({
                        status,
                        review_note: note || null,
                        reviewed_at: new Date().toISOString(),
                      })
                      .eq("id", submissionId);
                    if (error) {
                      toast.error(error.message);
                      return;
                    }
                    if (status === "approved") {
                      await updateParticipant(active.id, { status: "approved" });
                      emailCreatorOnCollabStatus({
                        creatorUserId: active.creator_id,
                        collabId: collab.id,
                        status: "approved",
                        brandName,
                        collabTitle: collab.title,
                        compensationType: collab.compensation_type,
                        feeAmount: collab.fee_amount,
                        productName: collab.product_name,
                        idempotencySuffix: submissionId,
                      });
                    } else if (status === "changes_requested") {
                      await updateParticipant(active.id, {
                        status: "revisions_requested",
                        revision_count: (active.revision_count || 0) + 1,
                        revision_note: note || null,
                      });
                      emailCreatorOnCollabStatus({
                        creatorUserId: active.creator_id,
                        collabId: collab.id,
                        status: "revisions_requested",
                        brandName,
                        collabTitle: collab.title,
                        compensationType: collab.compensation_type,
                        feeAmount: collab.fee_amount,
                        productName: collab.product_name,
                        idempotencySuffix: submissionId,
                      });
                    }
                    fetchAll();
                    toast.success("Review saved");
                  }}
                  onReleasePayment={async () => {
                    const amount = active.payment_amount ?? collab.fee_amount ?? 0;
                    await updateParticipant(active.id, {
                      payment_status: "paid",
                      payment_amount: amount,
                      paid_at: new Date().toISOString(),
                    });
                    emailCreatorOnCollabStatus({
                      creatorUserId: active.creator_id,
                      collabId: collab.id,
                      status: "paid",
                      brandName,
                      collabTitle: collab.title,
                      compensationType: collab.compensation_type,
                      feeAmount: amount,
                      productName: collab.product_name,
                      idempotencySuffix: "paid",
                    });
                  }}
                />
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Participant Detail ──────────────────────────────────────────────────────

function ParticipantDetail({
  participant,
  profile,
  submissions,
  collab,
  brandName,
  includesGifting,
  isPaid,
  hasDeliverables,
  onUpdate,
  onReviewSubmission,
  onReleasePayment,
}: {
  participant: Participant;
  profile: CreatorProfile | null;
  submissions: Submission[];
  collab: Collab;
  brandName?: string;
  includesGifting: boolean;
  /** Cash fee — gates the Payment section only. */
  isPaid: boolean;
  /** Content deliverables — gates Content Submissions and Live Posts. */
  hasDeliverables: boolean;
  onUpdate: (patch: Partial<Participant>) => Promise<void>;
  onReviewSubmission: (id: string, status: "approved" | "changes_requested", note?: string) => Promise<void>;
  onReleasePayment: () => Promise<void>;
}) {
  // Fire-and-forget: tell the creator the brand advanced their status.
  const notifyCreator = (status: string, suffix?: string | number) =>
    emailCreatorOnCollabStatus({
      creatorUserId: participant.creator_id,
      collabId: collab.id,
      status,
      brandName,
      collabTitle: collab.title,
      compensationType: collab.compensation_type,
      feeAmount: collab.fee_amount,
      productName: collab.product_name,
      idempotencySuffix: suffix,
    });
  const [trackingUrl, setTrackingUrl] = useState(participant.tracking_url || "");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [draftsExpanded, setDraftsExpanded] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);
  const [counterNote, setCounterNote] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [counterMessageId, setCounterMessageId] = useState<string | null>(null);

  useEffect(() => {
    setTrackingUrl(participant.tracking_url || "");
    setCounterNote(null);
    setConversationId(null);

    // Find the conversation for this brand+creator pair
    (async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .eq("brand_id", collab.brand_id)
        .eq("creator_id", participant.creator_id)
        .limit(1);
      const convId = convs?.[0]?.id;
      if (!convId) return;
      setConversationId(convId);

      // Fetch messages in that conversation for this collab
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, brief_data")
        .eq("conversation_id", convId)
        .eq("message_type", "paid_collab")
        .order("created_at", { ascending: false });

      for (const msg of (msgs || []) as any[]) {
        const meta = msg.brief_data;
        if (meta?.collab_id === collab.id && meta?.status === "negotiating" && meta?.creator_counter_note) {
          setCounterNote(meta.creator_counter_note);
          setCounterMessageId(msg.id);
          return;
        }
      }
    })();
  }, [participant.id, collab.id]);

  const saveTracking = async () => {
    setSavingTracking(true);
    const patch: Partial<Participant> = {
      tracking_url: trackingUrl || null,
    };
    if (trackingUrl && !participant.shipped_at) {
      patch.shipped_at = new Date().toISOString();
      patch.status = "shipped";
    }
    await onUpdate(patch);
    if (patch.status === "shipped") notifyCreator("shipped");
    setSavingTracking(false);
  };

  const markDelivered = async () => {
    await onUpdate({ status: "delivered", delivered_at: new Date().toISOString() });
    notifyCreator("delivered");
  };

  const setStatus = async (status: string) => onUpdate({ status });

  return (
    <div className="p-6 space-y-6">
      {/* Creator header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.photo_url || ""} />
            <AvatarFallback>{profile?.display_name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{profile?.display_name || "—"}</p>
            {profile?.username && <p className="text-xs text-muted-foreground">@{profile.username}</p>}
          </div>
        </div>
        <Badge variant="secondary">
          {STATUS_PIPELINE.find((s) => s.value === participant.status)?.label || participant.status}
        </Badge>
      </div>

      {/* Status progress stepper */}
      {(() => {
        const steps =
          includesGifting && !hasDeliverables
            ? [
                { key: "pending", label: "Pending" },
                { key: "accepted", label: "Accepted" },
                { key: "shipped", label: "Shipped" },
                { key: "delivered", label: "Delivered" },
                { key: "completed", label: "Complete" },
              ]
            : includesGifting
              ? [
                  { key: "pending", label: "Pending" },
                  { key: "accepted", label: "Accepted" },
                  { key: "shipped", label: "Shipped" },
                  { key: "delivered", label: "Delivered" },
                  { key: "draft_submitted", label: "Draft" },
                  { key: "approved", label: "Approved" },
                  { key: "live", label: "Live" },
                ]
              : [
                  { key: "pending", label: "Pending" },
                  { key: "accepted", label: "Accepted" },
                  { key: "draft_submitted", label: "Draft" },
                  { key: "approved", label: "Approved" },
                  { key: "live", label: "Live" },
                ];

        const statusOrder = steps.map((s) => s.key);
        const currentIdx = statusOrder.indexOf(participant.status);
        // Map some statuses to their step equivalent
        const resolvedIdx =
          participant.status === "in_progress"
            ? statusOrder.indexOf("accepted")
            : participant.status === "revisions_requested"
              ? statusOrder.indexOf("draft_submitted")
              : currentIdx;

        if (participant.status === "declined") return null;

        return (
          <div className="flex items-center gap-0.5">
            {steps.map((step, i) => {
              const isComplete = i < resolvedIdx;
              const isCurrent = i === resolvedIdx;
              return (
                <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-center">
                    {i > 0 && (
                      <div className={`flex-1 h-0.5 ${isComplete || isCurrent ? "bg-foreground" : "bg-border"}`} />
                    )}
                    <div
                      className={`shrink-0 rounded-full ${
                        isCurrent
                          ? "w-2.5 h-2.5 bg-foreground ring-2 ring-foreground/20"
                          : isComplete
                            ? "w-2 h-2 bg-foreground"
                            : "w-2 h-2 bg-border"
                      }`}
                    />
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 ${isComplete ? "bg-foreground" : "bg-border"}`} />
                    )}
                  </div>
                  <span
                    className={`text-[9px] leading-tight text-center ${isCurrent ? "font-semibold text-foreground" : isComplete ? "text-muted-foreground" : "text-muted-foreground/50"}`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Current step action prompt */}
      {(() => {
        const s = participant.status;
        const pendingText = counterNote
          ? "The creator has proposed changes. Review and respond below."
          : "Waiting for the creator to accept or respond to this offer.";
        const actions: Record<string, { text: string }> = {
          pending: { text: pendingText },
          accepted: includesGifting
            ? { text: "The creator has accepted. Ship the product and add the tracking link below." }
            : { text: "The creator has accepted. They will begin working on their content." },
          shipped: { text: "The product has been shipped. Waiting for the creator to confirm receipt." },
          delivered: hasDeliverables
            ? { text: "Product delivered. Waiting for the creator to submit their draft." }
            : { text: "Product delivered. The collab is complete." },
          in_progress: { text: "The creator is working on their content." },
          draft_submitted: { text: "The creator has submitted a draft for your review." },
          revisions_requested: { text: "You requested changes. Waiting for the creator to resubmit." },
          approved: { text: "Content approved. Waiting for the creator to post it live." },
          live: { text: "The creator's post is live. Verify it to complete the collab." },
          completed: { text: "This collab is complete." },
        };
        const info = actions[s];
        if (!info) return null;
        return (
          <div className="rounded-lg bg-foreground/[0.04] border border-foreground/10 px-4 py-3 flex items-start gap-3">
            <div className="shrink-0 mt-0.5 h-5 w-5 rounded-full bg-foreground/10 flex items-center justify-center">
              <span className="text-[10px] font-bold text-foreground">!</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{info.text}</p>
          </div>
        );
      })()}

      {/* Proposed changes from creator */}
      {counterNote && (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.04] overflow-hidden">
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <div className="shrink-0 h-4 w-4 rounded-full bg-foreground/10 flex items-center justify-center">
              <span className="text-[8px] font-bold text-foreground">!</span>
            </div>
            <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">Proposed Changes</p>
          </div>
          <div className="px-4 pb-3">
            <blockquote className="border-l-2 border-foreground/20 pl-3 py-1 text-sm text-foreground whitespace-pre-wrap italic">
              {counterNote}
            </blockquote>
          </div>
          {conversationId && (
            <div className="border-t border-foreground/10 px-4 py-2.5">
              <Button asChild size="sm" className="w-full h-8 text-xs">
                <Link
                  to={`/brand/messages?conversation=${conversationId}${counterMessageId ? `&message=${counterMessageId}` : ""}`}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                  Review and Respond
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Shipping & Tracking */}
      {includesGifting && (
        <CollapsibleSection
          id="shipping-section"
          icon={<Truck className="h-3.5 w-3.5" />}
          title="Shipping & Tracking"
          defaultOpen={["pending", "accepted", "shipped"].includes(participant.status)}
        >
          {participant.shipping_address ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
              {participant.shipping_address}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Address not yet provided.</p>
          )}

          {collab.sizing_question && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{collab.sizing_question}</p>
              {participant.sizing_answer ? (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">{participant.sizing_answer}</div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not yet answered.</p>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs">Tracking Link</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
              Once you've shipped the order, paste the tracking link here so the creator can follow the delivery.
            </p>
            <Input placeholder="https://…" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={saveTracking} disabled={savingTracking || !trackingUrl.trim()}>
              {savingTracking ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save Tracking
            </Button>
            {!participant.shipped_at && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  setSavingTracking(true);
                  await onUpdate({ shipped_at: new Date().toISOString(), status: "shipped" });
                  notifyCreator("shipped");
                  setSavingTracking(false);
                }}
                disabled={savingTracking}
              >
                No tracking (Mark shipped)
              </Button>
            )}
            {participant.shipped_at &&
              !participant.delivered_at &&
              Date.now() - new Date(participant.shipped_at).getTime() > 7 * 24 * 60 * 60 * 1000 && (
                <Button size="sm" variant="outline" onClick={markDelivered}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Mark Delivered
                </Button>
              )}
          </div>

          {participant.shipped_at &&
            !participant.delivered_at &&
            Date.now() - new Date(participant.shipped_at).getTime() <= 7 * 24 * 60 * 60 * 1000 && (
              <p className="text-xs text-muted-foreground italic mt-1">Waiting for creator to confirm receipt</p>
            )}
        </CollapsibleSection>
      )}

      {/* Deliverables / Submissions */}
      {hasDeliverables && !["pending", "invited", "negotiating", "declined"].includes(participant.status) && (
        <CollapsibleSection
          id="drafts-section"
          icon={<FileVideo className="h-3.5 w-3.5" />}
          title="Content Submissions"
          defaultOpen={["draft_submitted", "revisions_requested", "in_progress"].includes(participant.status)}
        >
          {submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Waiting for the creator to submit their draft for review.
            </p>
          ) : participant.live_post_urls &&
            participant.live_post_urls.length > 0 &&
            // ...but never collapse while something is still awaiting review.
            // The Approve / Request Changes controls live only in the expanded
            // branch below, so once a live post existed a second round of
            // content became unreviewable: the creator could upload v2 and the
            // brand had no way to action it.
            !submissions.some((s) => s.status === "pending") ? (
            /* Collapsible summary once live posts exist and nothing is pending */
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setDraftsExpanded(!draftsExpanded)}
                className="w-full rounded-lg border bg-emerald-50 border-emerald-200 p-3 text-sm text-emerald-800 flex items-center gap-2 hover:bg-emerald-100 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">
                  Draft approved · {submissions.length} submission{submissions.length > 1 ? "s" : ""}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${draftsExpanded ? "rotate-180" : ""}`}
                />
              </button>
              {draftsExpanded && (
                <div className="space-y-3">
                  {submissions.map((s) => (
                    <div key={s.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            v{s.version} · {s.platform || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Submitted {new Date(s.created_at).toLocaleString("en-ZA")}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            s.status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : s.status === "changes_requested"
                                ? "bg-amber-100 text-amber-700"
                                : ""
                          }
                        >
                          {s.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <a
                        href={s.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> {s.file_name || "Open file"}
                      </a>
                      {s.caption && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap border-l-2 border-border pl-2">
                          {s.caption}
                        </p>
                      )}
                      {s.review_note && (
                        <p className="text-xs text-amber-700 border-l-2 border-amber-300 pl-2">
                          Review note: {s.review_note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((s) => (
                <div key={s.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        v{s.version} · {s.platform || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {new Date(s.created_at).toLocaleString("en-ZA")}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        s.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : s.status === "changes_requested"
                            ? "bg-amber-100 text-amber-700"
                            : ""
                      }
                    >
                      {s.status.replace("_", " ")}
                    </Badge>
                  </div>

                  <a
                    href={s.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> {s.file_name || "Open file"}
                  </a>

                  {s.caption && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap border-l-2 border-border pl-2">
                      {s.caption}
                    </p>
                  )}

                  {s.review_note && (
                    <p className="text-xs text-amber-700 border-l-2 border-amber-300 pl-2">
                      Review note: {s.review_note}
                    </p>
                  )}

                  {s.status === "pending" && (
                    <div className="space-y-2 pt-2 border-t">
                      <Textarea
                        placeholder="Optional note (required if requesting changes)"
                        className="text-sm min-h-[60px]"
                        value={reviewNotes[s.id] || ""}
                        onChange={(e) => setReviewNotes({ ...reviewNotes, [s.id]: e.target.value })}
                      />
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          {(() => {
                            const maxDrafts = collab.max_drafts || 1;
                            const revisionsUsed = participant.revision_count || 0;
                            const limitReached = revisionsUsed >= maxDrafts;
                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onReviewSubmission(s.id, "changes_requested", reviewNotes[s.id])}
                                disabled={!reviewNotes[s.id]?.trim() || limitReached}
                                title={limitReached ? `All ${maxDrafts} draft round(s) have been used` : undefined}
                              >
                                Request Changes
                              </Button>
                            );
                          })()}
                          <Button
                            size="sm"
                            onClick={() => onReviewSubmission(s.id, "approved", reviewNotes[s.id])}
                            disabled={!!reviewNotes[s.id]?.trim()}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Approve
                          </Button>
                        </div>
                        {(() => {
                          const maxDrafts = collab.max_drafts || 1;
                          const revisionsUsed = participant.revision_count || 0;
                          return revisionsUsed >= maxDrafts ? (
                            <p className="text-xs text-amber-600">
                              All {maxDrafts} draft round(s) used. You can no longer request changes.
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {revisionsUsed} of {maxDrafts} draft round(s) used.
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Live Post Verification */}
      {hasDeliverables && ["approved", "live", "completed"].includes(participant.status) ? (
        <CollapsibleSection
          id="live-section"
          icon={<ExternalLink className="h-3.5 w-3.5" />}
          title="Live Posts"
          defaultOpen={["live", "approved"].includes(participant.status)}
        >
          {participant.live_post_urls && participant.live_post_urls.length > 0 ? (
            <div className="space-y-1">
              {participant.live_post_urls.map((u, i) => (
                <div key={u} className="flex items-center gap-3">
                  <a
                    href={u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1.5 min-w-0 truncate"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" /> {u}
                  </a>
                  {i === participant.live_post_urls!.length - 1 && !participant.verified_live_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={async () => {
                        await onUpdate({
                          status: "completed",
                          verified_live_at: new Date().toISOString(),
                          payment_status: "due",
                        });
                        notifyCreator("verified_live");
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Verify Live
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No live posts submitted yet.</p>
          )}
        </CollapsibleSection>
      ) : null}

      {/* Payment */}
      {isPaid && collab.fee_amount && ["approved", "live", "completed"].includes(participant.status) && (
        <section className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5" /> Payment
          </h4>
          <div className="rounded-lg border p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{ZAR.format(participant.payment_amount ?? collab.fee_amount)}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {participant.payment_status}
                {participant.paid_at && ` · paid ${new Date(participant.paid_at).toLocaleDateString("en-ZA")}`}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Clock className="h-3 w-3 mt-0.5 shrink-0" />
            This fee will be included in your monthly invoice from MyStorefront.
          </p>
        </section>
      )}
    </div>
  );
}

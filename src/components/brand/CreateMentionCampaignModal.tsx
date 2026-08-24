import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Paperclip, X } from "lucide-react";

const USAGE_RIGHTS = [
  "Creator retains all rights",
  "Brand may repost with credit",
  "Brand has full repurposing rights",
];

const PAYMENT_TERMS = [
  { value: "on_acceptance", label: "On acceptance" },
  { value: "on_submission", label: "On content submission" },
  { value: "on_approval", label: "On content approval" },
  { value: "on_go_live", label: "On go-live" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  onCreated: () => void;
  onBack?: () => void;
  /**
   * When true (Paid Collabs page) the modal creates a first-class paid collab
   * (compensation_type "Mention Request") that shows in the Paid Collabs list,
   * assigns the selected creators, posts a message to each of them and sends the
   * branded collab-invite email. When false/omitted (Mentions page) it keeps the
   * original behaviour of creating a reusable mention_campaigns template.
   */
  sendAsPaidCollab?: boolean;
}

interface CreatorOption {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  username: string | null;
}

const EMPTY = {
  title: "",
  description: "",
  deliverables: "",
  feeAmount: "",
  submissionDeadline: "",
  goLiveDate: "",
  revisionRounds: "2",
  maxCreators: "",
  requiredHashtags: "",
  requiredMentions: "",
  dosAndDonts: "",
  usageRights: "",
  paymentTerms: "",
  exclusivity: false,
  attachmentUrl: "",
  attachmentName: "",
  additionalNotes: "",
};

export function CreateMentionCampaignModal({
  open,
  onOpenChange,
  brandId,
  onCreated,
  onBack,
  sendAsPaidCollab = false,
}: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Creator selection — only used in the Paid Collabs (sendAsPaidCollab) flow
  const [creators, setCreators] = useState<CreatorOption[]>([]);
  const [creatorIds, setCreatorIds] = useState<string[]>([]);
  const [creatorSearch, setCreatorSearch] = useState("");

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setForm(EMPTY);
    setCreatorIds([]);
    setCreatorSearch("");
  };

  // Load creators to choose from when sending a mention request as a paid collab
  useEffect(() => {
    if (!open || !sendAsPaidCollab) return;
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "creator");
      if (!roles || roles.length === 0) return;
      const ids = roles.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, username")
        .in("id", ids)
        .order("display_name");
      if (profiles) setCreators(profiles as CreatorOption[]);
    })();
  }, [open, sendAsPaidCollab]);

  const toggleCreator = (id: string) =>
    setCreatorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filteredCreators = creators.filter((c) => {
    const s = creatorSearch.toLowerCase();
    return !s || c.display_name?.toLowerCase().includes(s) || c.username?.toLowerCase().includes(s);
  });

  const isValid =
    form.title.trim() &&
    form.deliverables.trim() &&
    form.feeAmount &&
    form.goLiveDate &&
    form.usageRights &&
    form.paymentTerms;

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      // Brand id MUST be the first path segment — the gift-campaign-images bucket
      // RLS policy checks (storage.foldername(name))[1] against the brand's id.
      const path = `${brandId}/mention-briefs/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("gift-campaign-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("gift-campaign-images").getPublicUrl(path);
      set("attachmentUrl", data.publicUrl);
      set("attachmentName", file.name);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ── Mentions page: create a reusable mention_campaigns template ──
  const submitCampaignTemplate = async () => {
    const { error } = await supabase.from("mention_campaigns" as any).insert({
      brand_id: brandId,
      title: form.title.trim(),
      description:
        [
          form.description.trim(),
          form.additionalNotes.trim(),
          form.attachmentUrl ? `Attachment: ${form.attachmentUrl}` : "",
        ]
          .filter(Boolean)
          .join("\n\n") || null,
      deliverable_description: form.dosAndDonts.trim()
        ? `${form.deliverables.trim()}\n\nDos & Don'ts: ${form.dosAndDonts.trim()}`
        : form.deliverables.trim(),
      deliverable_type: "other",
      fee_amount: parseFloat(form.feeAmount),
      submission_deadline: form.submissionDeadline || null,
      content_deadline: form.goLiveDate,
      revision_rounds: parseInt(form.revisionRounds) || 1,
      max_creators: form.maxCreators ? parseInt(form.maxCreators) : null,
      required_hashtags: form.requiredHashtags.trim() || null,
      required_mentions: form.requiredMentions.trim() || null,
      usage_rights: form.usageRights,
      payment_terms: form.paymentTerms,
      exclusivity_required: form.exclusivity,
      status: "draft",
    });
    if (error) {
      toast({ title: "Error creating campaign", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Campaign created." });
    return true;
  };

  // ── Paid Collabs page: create a paid collab + notify + email each creator ──
  const submitAsPaidCollab = async () => {
    const feeNum = form.feeAmount ? parseFloat(form.feeAmount) : null;

    const { data: collab, error: collabErr } = await supabase
      .from("paid_collabs" as any)
      .insert({
        brand_id: brandId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        compensation_type: "Mention Request",
        deliverables: form.deliverables.trim() || null,
        fee_amount: feeNum,
        go_live_date: form.goLiveDate || null,
        submission_deadline: form.submissionDeadline || null,
        required_hashtags: form.requiredHashtags.trim() || null,
        required_mentions: form.requiredMentions.trim() || null,
        dos_and_donts: form.dosAndDonts.trim() || null,
        usage_rights: form.usageRights || null,
        payment_terms: form.paymentTerms || null,
        exclusivity_required: form.exclusivity,
        additional_notes: form.additionalNotes.trim() || null,
        attachment_url: form.attachmentUrl || null,
        attachment_name: form.attachmentName || null,
        creator_ids: creatorIds.length > 0 ? creatorIds : null,
        status: "active",
      })
      .select("id")
      .single();
    if (collabErr) {
      toast({ title: "Error creating mention request", description: collabErr.message, variant: "destructive" });
      return false;
    }
    const collabId = (collab as any)?.id;

    if (creatorIds.length > 0) {
      const { data: brandRow } = await supabase.from("brand_accounts").select("name").eq("id", brandId).maybeSingle();
      const brandName = (brandRow as any)?.name || "A brand";
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const briefData = {
        collab_id: collabId,
        title: form.title.trim(),
        compensation_type: "Mention Request",
        description: form.description.trim() || null,
        deliverables: form.deliverables.trim() || null,
        fee_amount: feeNum,
        go_live_date: form.goLiveDate || null,
        submission_deadline: form.submissionDeadline || null,
        required_hashtags: form.requiredHashtags.trim() || null,
        required_mentions: form.requiredMentions.trim() || null,
        dos_and_donts: form.dosAndDonts.trim() || null,
        usage_rights: form.usageRights || null,
        payment_terms: form.paymentTerms || null,
        exclusivity_required: form.exclusivity,
        additional_notes: form.additionalNotes.trim() || null,
        attachment_url: form.attachmentUrl || null,
        attachment_name: form.attachmentName || null,
        status: "pending",
      };

      for (const creatorId of creatorIds) {
        // Find or create the brand ↔ creator conversation
        let { data: convo } = await supabase
          .from("conversations")
          .select("id")
          .eq("brand_id", brandId)
          .eq("creator_id", creatorId)
          .maybeSingle();
        if (!convo) {
          const { data: newConvo } = await supabase
            .from("conversations")
            .insert({ brand_id: brandId, creator_id: creatorId })
            .select("id")
            .single();
          convo = newConvo;
        }
        if (convo && user) {
          await supabase.from("messages").insert({
            conversation_id: convo.id,
            sender_id: user.id,
            content: `You've received a Mention Request: ${form.title.trim()}`,
            message_type: "paid_collab",
            brief_data: briefData,
          });
        }

        // Branded email — same template Paid Collabs uses (has a Mention branch)
        try {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "collab-invite-creator",
              recipientUserId: creatorId,
              idempotencyKey: `collab-invite-${creatorId}-${collabId}-${Date.now()}`,
              templateData: {
                brandName,
                collabTitle: form.title.trim(),
                compensationType: "Mention Request",
                description: form.description.trim() || undefined,
                deliverableType: form.deliverables.trim() || undefined,
                feeAmount: feeNum ?? undefined,
                goLiveDate: form.goLiveDate || undefined,
                submissionDeadline: form.submissionDeadline || undefined,
                requiredHashtags: form.requiredHashtags.trim() || undefined,
                requiredMentions: form.requiredMentions.trim() || undefined,
                dosAndDonts: form.dosAndDonts.trim() || undefined,
              },
            },
          });
        } catch (emailErr) {
          console.error("Failed to send mention invite email", emailErr);
        }
      }
    }

    toast({
      title: creatorIds.length > 0 ? "Mention request sent" : "Mention request created",
      description:
        creatorIds.length > 0
          ? `${creatorIds.length} creator${creatorIds.length > 1 ? "s" : ""} notified by message and email.`
          : "Add creators from Manage to send it out.",
    });
    return true;
  };

  const handleSubmit = async () => {
    if (!isValid) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    const ok = sendAsPaidCollab ? await submitAsPaidCollab() : await submitCampaignTemplate();
    setSaving(false);
    if (ok) {
      reset();
      onOpenChange(false);
      onCreated();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                  onBack();
                }}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <DialogTitle className="font-display text-xl">
              {sendAsPaidCollab ? "New Mention Request" : "New Mention Campaign"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ── Campaign ── */}
          <section className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Campaign</p>
            <div>
              <Label className="text-xs">Campaign Title *</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Summer Skincare Launch"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Description / Goals</Label>
              <Textarea
                className="mt-1 min-h-[70px]"
                placeholder="What is this campaign trying to achieve? Give the creator context."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
          </section>

          {/* ── Deliverables ── */}
          <section className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Deliverables</p>
            <div>
              <Label className="text-xs">What content do you need? *</Label>
              <Input
                className="mt-1"
                placeholder="e.g. 2 Instagram Reels, 1 Story"
                value={form.deliverables}
                onChange={(e) => set("deliverables", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Required Hashtags</Label>
              <Input
                className="mt-1"
                placeholder="e.g. #MyStorefront #BrandName"
                value={form.requiredHashtags}
                onChange={(e) => set("requiredHashtags", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Required Mentions</Label>
              <Input
                className="mt-1"
                placeholder="e.g. @yourbrandhandle"
                value={form.requiredMentions}
                onChange={(e) => set("requiredMentions", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Dos and Don'ts</Label>
              <Textarea
                className="mt-1 min-h-[60px]"
                placeholder="e.g. Do not mention competitors. Always show product in natural light."
                value={form.dosAndDonts}
                onChange={(e) => set("dosAndDonts", e.target.value)}
              />
            </div>
          </section>

          {/* ── Timeline ── */}
          <section className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Timeline</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Submission Deadline</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={form.submissionDeadline}
                  onChange={(e) => set("submissionDeadline", e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">When the draft is due</p>
              </div>
              <div>
                <Label className="text-xs">Go-live Date *</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={form.goLiveDate}
                  onChange={(e) => set("goLiveDate", e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">When it must be published</p>
              </div>
            </div>
          </section>

          {/* ── Compensation ── */}
          <section className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Compensation</p>
            <div>
              <Label className="text-xs">Fixed Fee per Creator (ZAR) *</Label>
              <Input
                type="number"
                min="0"
                className="mt-1"
                placeholder="e.g. 1500"
                value={form.feeAmount}
                onChange={(e) => set("feeAmount", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Payment Terms *</Label>
              <div className="mt-1 flex flex-col gap-2">
                {PAYMENT_TERMS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set("paymentTerms", t.value)}
                    className={`rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${form.paymentTerms === t.value ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground hover:border-foreground"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Rights & Terms ── */}
          <section className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rights & Terms</p>
            <div>
              <Label className="text-xs">Usage Rights *</Label>
              <div className="mt-1 flex flex-col gap-2">
                {USAGE_RIGHTS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => set("usageRights", r)}
                    className={`rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${form.usageRights === r ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground hover:border-foreground"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-3 pt-1">
              <input
                id="exclusivity"
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border accent-foreground"
                checked={form.exclusivity}
                onChange={(e) => set("exclusivity", e.target.checked)}
              />
              <label htmlFor="exclusivity" className="text-sm text-muted-foreground leading-5 cursor-pointer">
                Exclusivity required — creator may not promote direct competitors during this campaign
              </label>
            </div>
          </section>

          {/* ── Send To (Paid Collabs flow only) ── */}
          {sendAsPaidCollab && (
            <section className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Send To</p>
              <p className="-mt-1 text-xs text-muted-foreground">
                Select the creators to send this mention request to. They'll be notified in Messages and by email.
              </p>
              <input
                type="text"
                placeholder="Search creators..."
                value={creatorSearch}
                onChange={(e) => setCreatorSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
              <div className="max-h-40 overflow-y-auto rounded-xl border border-border">
                {filteredCreators.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-muted-foreground">No creators found</p>
                ) : (
                  filteredCreators.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCreator(c.id)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary ${
                        creatorIds.includes(c.id) ? "bg-secondary font-medium" : ""
                      }`}
                    >
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={c.photo_url || undefined} />
                        <AvatarFallback className="text-[9px]">{(c.display_name || "?")[0]}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{c.display_name || c.username || "Unknown"}</span>
                      {creatorIds.includes(c.id) && <span className="text-xs text-foreground">✓</span>}
                    </button>
                  ))
                )}
              </div>
              {creatorIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {creatorIds.length} creator{creatorIds.length > 1 ? "s" : ""} selected
                </p>
              )}
            </section>
          )}

          {/* ── Campaign Limits (template flow only) ── */}
          {!sendAsPaidCollab && (
            <section className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Campaign Limits</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Max Creators</Label>
                  <Input
                    type="number"
                    min="1"
                    className="mt-1"
                    placeholder="Unlimited"
                    value={form.maxCreators}
                    onChange={(e) => set("maxCreators", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Revision Rounds</Label>
                  <Input
                    type="number"
                    min="0"
                    className="mt-1"
                    value={form.revisionRounds}
                    onChange={(e) => set("revisionRounds", e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Before content is approved as-is</p>
                </div>
              </div>
            </section>
          )}

          {/* ── Additional Notes & Attachment ── */}
          <section className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Additional Notes & Files
            </p>
            <div>
              <Label className="text-xs">Additional Notes</Label>
              <Textarea
                className="mt-1 min-h-[70px]"
                placeholder="Anything else the creator should know — delivery address for product samples, brand tone of voice, campaign hashtag context, etc."
                value={form.additionalNotes}
                onChange={(e) => set("additionalNotes", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Attach a File</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Logo, mood board, video example, brand guidelines — any file type.
              </p>
              {form.attachmentUrl ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={form.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary truncate flex-1 hover:underline"
                  >
                    {form.attachmentName || "View attachment"}
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      set("attachmentUrl", "");
                      set("attachmentName", "");
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-foreground transition-colors w-full"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  {uploading ? "Uploading..." : "Click to attach a file"}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
              />
            </div>
          </section>

          {/* ── Actions ── */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={!isValid || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {sendAsPaidCollab
                ? creatorIds.length > 0
                  ? "Send Mention Request"
                  : "Create Mention Request"
                : "Create Campaign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

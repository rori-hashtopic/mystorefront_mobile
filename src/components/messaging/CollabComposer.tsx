import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Send, X, Upload, Gift, Package, Banknote, Paperclip, Info } from "lucide-react";
import { toast } from "sonner";

// ─── Email helper ─────────────────────────────────────────────────────────────

async function sendCollabEmail(creatorId: string, templateData: Record<string, unknown>) {
  try {
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "collab-invite-creator",
        recipientUserId: creatorId,
        idempotencyKey: `collab-invite-${creatorId}-${templateData.collabTitle}-${Date.now()}`,
        templateData,
      },
    });
  } catch (err) {
    // Non-fatal — message already sent; log and continue
    console.error("Failed to send collab invite email", err);
  }
}

async function sendCollabStatusEmail(recipientUserId: string, templateData: Record<string, unknown>) {
  try {
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "collab-status",
        recipientUserId,
        idempotencyKey: `collab-status-${recipientUserId}-${templateData.collabTitle}-${Date.now()}`,
        templateData,
      },
    });
  } catch (err) {
    console.error("Failed to send collab status email", err);
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

type CompensationType =
  | "Gifting"
  | "Gifting + Deliverables"
  | "Paid Campaign"
  | "Paid Campaign + Gifting"
  | "Mention Request"
  | "Discount Code";

interface CollabComposerProps {
  type: CompensationType;
  brandId: string;
  creatorId: string;
  partnerName: string;
  onSent: () => void;
  onCancel: () => void;
  sendMessage: (content: string, messageType: string, briefData?: any) => Promise<any>;
  editMessage?: {
    messageId: string;
    data: any; // existing brief_data being edited
  };
}

interface ExistingCollab {
  id: string;
  title: string;
  compensation_type: string;
  creator_ids: string[] | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Mirrors COMPENSATION_TYPES on the Paid Collabs page so the composer's
// subtitle reads identically to the creation modal.
const TYPE_DESCRIPTIONS: Record<CompensationType, string> = {
  Gifting: "Send product — no content required",
  "Gifting + Deliverables": "Send product in exchange for specific content",
  "Paid Campaign": "Pay a cash fee for deliverables",
  "Paid Campaign + Gifting": "Cash fee plus product for deliverables",
  "Mention Request": "Request a shout-out or tag — no formal brief required",
  "Discount Code": "Send a creator an exclusive discount code to share",
};

// Local calendar date — toISOString() shifts to UTC and reports yesterday for
// SAST users after 02:00. Matches the helper on the Paid Collabs page.
const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const isPastDate = (v: string) => !!v && v < todayISO();

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Other"];

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

const DELIVERABLE_TYPES = [
  { value: "instagram_reel", label: "Instagram Reel" },
  { value: "instagram_story", label: "Instagram Story" },
  { value: "instagram_post", label: "Instagram Post" },
  { value: "tiktok_video", label: "TikTok Video" },
  { value: "tiktok_story", label: "TikTok Story" },
  { value: "youtube_short", label: "YouTube Short" },
  { value: "other", label: "Other" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function CollabComposer({
  type,
  brandId,
  creatorId,
  partnerName,
  onSent,
  onCancel,
  sendMessage,
  editMessage,
}: CollabComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Existing collabs for "assign to existing" at the top
  const [existingCollabs, setExistingCollabs] = useState<ExistingCollab[]>([]);
  const [assignToExisting, setAssignToExisting] = useState("new");

  // Shared fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Gift fields
  const [productName, setProductName] = useState("");
  const [productValue, setProductValue] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");

  // Deliverable fields
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [otherPlatform, setOtherPlatform] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [goLiveDate, setGoLiveDate] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [requiredHashtags, setRequiredHashtags] = useState("");
  const [requiredMentions, setRequiredMentions] = useState("");
  const [dosAndDonts, setDosAndDonts] = useState("");
  const [usageRights, setUsageRights] = useState("Brand may repost with credit");
  const [paymentTerms, setPaymentTerms] = useState("on_go_live");
  const [feeAmount, setFeeAmount] = useState("");
  const [exclusivity, setExclusivity] = useState(false);
  const [maxDrafts, setMaxDrafts] = useState("2");

  // Notes / attachment / sizing question — parity with the creation modal so a
  // revised offer can edit every field the brand set when creating the collab.
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [sizingQuestion, setSizingQuestion] = useState("");

  // Mention request fields
  const [deliverableType, setDeliverableType] = useState("");
  const [mentionFee, setMentionFee] = useState("");
  const [mentionDeadline, setMentionDeadline] = useState("");

  // Discount code fields
  const [discountCode, setDiscountCode] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [discountNotes, setDiscountNotes] = useState("");

  const isMention = type === "Mention Request";
  const isDiscount = type === "Discount Code";
  const editing = !!editMessage;
  // A Mention Request is revised ("Send Revised Offer") through the full collab
  // form so every field captured at creation (deliverables, fee, timeline,
  // guidelines, usage rights, payment terms) can be edited and saved. Only the
  // initial in-chat create uses the quick chip form.
  const mentionFull = isMention && editing;

  const isGiftingOnly = type === "Gifting";
  const includesGifting = type === "Gifting" || type === "Gifting + Deliverables" || type === "Paid Campaign + Gifting";
  const needsFee = type === "Paid Campaign" || type === "Paid Campaign + Gifting" || mentionFull;
  const hasDeliverables =
    type === "Gifting + Deliverables" || type === "Paid Campaign" || type === "Paid Campaign + Gifting" || mentionFull;

  useEffect(() => {
    if (editMessage) return; // not relevant when editing an existing offer
    supabase
      .from("paid_collabs" as any)
      .select("id, title, compensation_type, creator_ids")
      .eq("brand_id", brandId)
      .eq("status", "active")
      .eq("compensation_type", type)
      .order("created_at", { ascending: false })
      .then(({ data }) => setExistingCollabs((data as unknown as ExistingCollab[]) || []));
  }, [brandId, type, editMessage]);

  // Prefill form fields when editing an existing collab offer
  useEffect(() => {
    if (!editMessage?.data) return;
    const d = editMessage.data;
    setTitle(d.title || "");
    setDescription(d.description || "");
    setProductName(d.product_name || "");
    setProductValue(d.product_value != null ? String(d.product_value) : "");
    setProductImageUrl(d.product_image_url || "");
    setPlatforms(d.platforms || []);
    setDeliverables(d.deliverables || "");
    setGoLiveDate(d.go_live_date || "");
    setSubmissionDeadline(d.submission_deadline || "");
    setRequiredHashtags(d.required_hashtags || "");
    setRequiredMentions(d.required_mentions || "");
    setDosAndDonts(d.dos_and_donts || "");
    setUsageRights(d.usage_rights || "Brand may repost with credit");
    setPaymentTerms(d.payment_terms || "on_go_live");
    setFeeAmount(d.fee_amount != null ? String(d.fee_amount) : "");
    setExclusivity(!!d.exclusivity_required);
    setMaxDrafts(String(d.max_drafts || 2));
    setAdditionalNotes((d as any).additional_notes || "");
    setAttachmentUrl((d as any).attachment_url || "");
    setAttachmentName((d as any).attachment_name || "");
    setSizingQuestion((d as any).sizing_question || "");
  }, [editMessage]);

  const handleAttachmentUpload = async (file: File) => {
    setUploadingAttachment(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${brandId}/attachments/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("gift-campaign-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("gift-campaign-images").getPublicUrl(path);
      setAttachmentUrl(data.publicUrl);
      setAttachmentName(file.name);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const togglePlatform = (p: string) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${brandId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("gift-campaign-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("gift-campaign-images").getPublicUrl(path);
      setProductImageUrl(data.publicUrl);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      // Fetch brand name once — used in all email notifications
      const { data: brandRow } = await supabase
        .from("brand_accounts" as any)
        .select("name")
        .eq("id", brandId)
        .maybeSingle();
      const brandName: string = (brandRow as any)?.name || "A brand";

      // ── Editing an existing collab offer (e.g. responding to a creator's counter) ──
      if (editMessage) {
        const updatedBrief: any = {
          ...editMessage.data,
          title: title.trim(),
          description: description.trim() || undefined,
          fee_amount: needsFee && feeAmount ? parseFloat(feeAmount.replace(/[^0-9.]/g, "")) : undefined,
          product_name: includesGifting ? productName.trim() || undefined : undefined,
          product_value: includesGifting && productValue ? Number(productValue) : undefined,
          product_image_url: includesGifting ? productImageUrl || undefined : undefined,
          platforms: hasDeliverables ? platforms : undefined,
          deliverables: hasDeliverables || isGiftingOnly ? deliverables.trim() || undefined : undefined,
          go_live_date: hasDeliverables && goLiveDate ? goLiveDate : undefined,
          submission_deadline: hasDeliverables && submissionDeadline ? submissionDeadline : undefined,
          required_hashtags: requiredHashtags.trim() || undefined,
          required_mentions: requiredMentions.trim() || undefined,
          dos_and_donts: dosAndDonts.trim() || undefined,
          usage_rights: hasDeliverables ? usageRights || undefined : undefined,
          payment_terms: hasDeliverables ? paymentTerms || undefined : undefined,
          exclusivity_required: exclusivity,
          max_drafts: hasDeliverables ? parseInt(maxDrafts) || 1 : undefined,
          additional_notes: additionalNotes.trim() || undefined,
          attachment_url: attachmentUrl || undefined,
          attachment_name: attachmentName || undefined,
          sizing_question: includesGifting ? sizingQuestion.trim() || undefined : undefined,
          status: "pending",
          // Keep the creator's counter note. The card relabels it as their
          // "original request" once the offer has been revised, so the
          // negotiation stays traceable instead of vanishing.
          status_updated_at: new Date().toISOString(),
        };

        // Track which fields the brand changed so the creator sees orange markers
        const trackableFields = [
          "title",
          "description",
          "fee_amount",
          "product_name",
          "product_value",
          "deliverables",
          "go_live_date",
          "submission_deadline",
          "platforms",
          "required_hashtags",
          "required_mentions",
          "dos_and_donts",
          "usage_rights",
          "payment_terms",
          "exclusivity_required",
          "max_drafts",
          "additional_notes",
          "sizing_question",
        ];
        const changedFields: string[] = [];
        for (const f of trackableFields) {
          const oldVal = JSON.stringify((editMessage.data as any)?.[f] ?? null);
          const newVal = JSON.stringify((updatedBrief as any)[f] ?? null);
          if (oldVal !== newVal) changedFields.push(f);
        }
        if (changedFields.length > 0) {
          updatedBrief.changed_fields = changedFields;
        }

        // paid_collabs.fee_amount is what the brand is INVOICED from
        // (BrandPayments) and what the payout is computed from
        // (CollabManageDrawer). messages.brief_data is only what the creator is
        // SHOWN. They are read in different places and nothing reconciles them,
        // so the money record has to be written first and proven — otherwise a
        // failure here leaves the two parties looking at different numbers while
        // the chat and the email both announce the new one.
        const feeChanged = ((editMessage.data as any)?.fee_amount ?? null) !== (updatedBrief.fee_amount ?? null);
        let collabWriteLanded = false;

        if (editMessage.data.collab_id) {
          const { data: collabRows, error: collabError } = await supabase
            .from("paid_collabs" as any)
            .update({
              title: updatedBrief.title,
              description: updatedBrief.description || null,
              fee_amount: updatedBrief.fee_amount ?? null,
              product_name: updatedBrief.product_name || null,
              product_value: updatedBrief.product_value ?? null,
              product_image_url: updatedBrief.product_image_url || null,
              platforms: updatedBrief.platforms || [],
              deliverables: updatedBrief.deliverables || null,
              go_live_date: updatedBrief.go_live_date || null,
              submission_deadline: updatedBrief.submission_deadline || null,
              required_hashtags: updatedBrief.required_hashtags || null,
              required_mentions: updatedBrief.required_mentions || null,
              dos_and_donts: updatedBrief.dos_and_donts || null,
              usage_rights: updatedBrief.usage_rights || null,
              payment_terms: updatedBrief.payment_terms || null,
              exclusivity_required: updatedBrief.exclusivity_required,
              max_drafts: updatedBrief.max_drafts || null,
              additional_notes: updatedBrief.additional_notes || null,
              attachment_url: updatedBrief.attachment_url || null,
              attachment_name: updatedBrief.attachment_name || null,
              sizing_question: updatedBrief.sizing_question || null,
            })
            .eq("id", editMessage.data.collab_id)
            // Load-bearing. Without .select() Supabase returns no rows and an
            // update that matched NOTHING is indistinguishable from one that
            // worked — `error` is null in both cases. Gift-campaign messages
            // carry a gift_campaigns id in collab_id, so that path matches zero
            // rows every single time and has been silently no-op'ing.
            .select("id");
          if (collabError) throw collabError;
          collabWriteLanded = !!collabRows && collabRows.length > 0;
        }

        if (feeChanged && !collabWriteLanded) {
          // Refuse before the chat/email announce a fee the invoice will not honour.
          throw new Error(
            "The fee could not be saved to the collab record, so the revised offer was not sent. Nothing has changed — please contact support before agreeing a new fee with this creator.",
          );
        }
        if (!collabWriteLanded && editMessage.data.collab_id) {
          // No money moved, so don't block a revision that works today (e.g. a
          // gifting brief whose collab_id points at gift_campaigns).
          console.warn("paid_collabs not updated for collab_id", editMessage.data.collab_id);
        }

        const { error: msgError } = await supabase
          .from("messages")
          .update({ brief_data: updatedBrief })
          .eq("id", editMessage.messageId);
        if (msgError) throw msgError;

        // System message removed — the card already reflects the updated offer.
        await sendCollabStatusEmail(creatorId, {
          recipientRole: "creator",
          brandName,
          collabTitle: updatedBrief.title,
          compensationType: updatedBrief.compensation_type,
          status: "pending",
          feeAmount: updatedBrief.fee_amount,
          productName: updatedBrief.product_name,
        });
        toast.success("Offer updated — the creator has been notified.");
        onSent();
        return;
      }

      // ── Assign to existing collab ──
      if (assignToExisting !== "new") {
        const collab = existingCollabs.find((c) => c.id === assignToExisting);
        if (collab) {
          const current = collab.creator_ids || [];
          if (!current.includes(creatorId)) {
            // This write is what fires trg_sync_paid_collab_participants, which
            // CREATES the participant row. If it silently no-ops the creator is
            // told they're assigned but never appears in the brand's Manage
            // drawer and never reaches the monthly invoice, which joins
            // participants — so they'd do the work and not be billed for.
            const { data: assignRows, error: assignError } = await supabase
              .from("paid_collabs" as any)
              .update({ creator_ids: [...current, creatorId] })
              .eq("id", assignToExisting)
              .select("id");
            if (assignError) throw assignError;
            if (!assignRows || assignRows.length === 0) {
              throw new Error("Could not assign the creator to that collab — nothing was sent.");
            }
          }
          const { data: fullCollab } = await supabase
            .from("paid_collabs" as any)
            .select("*")
            .eq("id", assignToExisting)
            .single();
          if (fullCollab) {
            await sendMessage(`🤝 You've been assigned to a paid collab: ${(fullCollab as any).title}`, "paid_collab", {
              collab_id: (fullCollab as any).id,
              title: (fullCollab as any).title,
              compensation_type: (fullCollab as any).compensation_type,
              description: (fullCollab as any).description,
              fee_amount: (fullCollab as any).fee_amount,
              product_name: (fullCollab as any).product_name,
              product_value: (fullCollab as any).product_value,
              product_image_url: (fullCollab as any).product_image_url,
              platforms: (fullCollab as any).platforms,
              deliverables: (fullCollab as any).deliverables,
              go_live_date: (fullCollab as any).go_live_date,
              submission_deadline: (fullCollab as any).submission_deadline,
              required_hashtags: (fullCollab as any).required_hashtags,
              required_mentions: (fullCollab as any).required_mentions,
              dos_and_donts: (fullCollab as any).dos_and_donts,
              usage_rights: (fullCollab as any).usage_rights,
              payment_terms: (fullCollab as any).payment_terms,
              exclusivity_required: (fullCollab as any).exclusivity_required,
              max_drafts: (fullCollab as any).max_drafts || undefined,
              additional_notes: (fullCollab as any).additional_notes || undefined,
              attachment_url: (fullCollab as any).attachment_url || undefined,
              attachment_name: (fullCollab as any).attachment_name || undefined,
              sizing_question: (fullCollab as any).sizing_question || undefined,
              status: "pending",
            });
            await sendCollabEmail(creatorId, {
              brandName,
              collabTitle: (fullCollab as any).title,
              compensationType: (fullCollab as any).compensation_type,
              description: (fullCollab as any).description,
              productName: (fullCollab as any).product_name,
              productValue: (fullCollab as any).product_value,
              productImageUrl: (fullCollab as any).product_image_url,
              feeAmount: (fullCollab as any).fee_amount,
              paymentTerms: (fullCollab as any).payment_terms,
              platforms: (fullCollab as any).platforms,
              deliverables: (fullCollab as any).deliverables,
              goLiveDate: (fullCollab as any).go_live_date,
              submissionDeadline: (fullCollab as any).submission_deadline,
              requiredHashtags: (fullCollab as any).required_hashtags,
              requiredMentions: (fullCollab as any).required_mentions,
              dosAndDonts: (fullCollab as any).dos_and_donts,
              usageRights: (fullCollab as any).usage_rights,
              exclusivityRequired: (fullCollab as any).exclusivity_required,
              maxDrafts: (fullCollab as any).max_drafts || undefined,
            });
          }
          toast.success(`${partnerName} assigned to "${collab.title}"`);
          onSent();
          return;
        }
      }

      // ── Discount Code ──
      if (isDiscount) {
        const { error } = await supabase.from("discount_codes" as any).insert({
          brand_id: brandId,
          creator_id: creatorId,
          code: discountCode.trim().toUpperCase(),
          discount_type: discountType,
          discount_value: parseFloat(discountValue),
          expiry_date: expiryDate || null,
          notes: discountNotes.trim() || null,
          is_active: true,
        });
        if (error) throw error;
        await sendMessage(
          `Your exclusive discount code is ready: ${discountCode.trim().toUpperCase()}`,
          "discount_code",
          {
            code: discountCode.trim().toUpperCase(),
            discount_type: discountType,
            discount_value: parseFloat(discountValue),
            expiry_date: expiryDate || undefined,
            notes: discountNotes.trim() || undefined,
            status: "assigned",
          },
        );
        await sendCollabEmail(creatorId, {
          brandName,
          compensationType: "Discount Code",
          discountCode: discountCode.trim().toUpperCase(),
          discountType,
          discountValue: parseFloat(discountValue),
          expiryDate: expiryDate || undefined,
          discountNotes: discountNotes.trim() || undefined,
        });
        toast.success("Discount code sent to creator");
        onSent();
        return;
      }

      // ── Mention Request ──
      if (isMention) {
        const { data: mentionCollab, error } = await supabase
          .from("paid_collabs" as any)
          .insert({
            brand_id: brandId,
            title: title.trim(),
            description: description.trim() || null,
            compensation_type: "Mention Request",
            deliverables: deliverableType,
            go_live_date: mentionDeadline || null,
            fee_amount: mentionFee ? parseFloat(mentionFee) : null,
            creator_ids: [creatorId],
            status: "active",
          })
          .select("id")
          .single();
        if (error) throw error;
        await sendMessage(`You have received a Mention Request: ${title}`, "paid_collab", {
          collab_id: (mentionCollab as any)?.id || null,
          title,
          compensation_type: "Mention Request",
          description: description || undefined,
          deliverables: DELIVERABLE_TYPES.find((d) => d.value === deliverableType)?.label || deliverableType,
          fee_amount: mentionFee ? parseFloat(mentionFee) : undefined,
          go_live_date: mentionDeadline || undefined,
          status: "pending",
        });
        await sendCollabEmail(creatorId, {
          brandName,
          collabTitle: title,
          compensationType: "Mention Request",
          description: description || undefined,
          deliverableType: DELIVERABLE_TYPES.find((d) => d.value === deliverableType)?.label || deliverableType,
          feeAmount: mentionFee ? parseFloat(mentionFee) : undefined,
          goLiveDate: mentionDeadline || undefined,
        });
        toast.success("Mention request sent");
        onSent();
        return;
      }

      // ── All other paid collab types ──
      const { data: collabRecord, error } = await supabase
        .from("paid_collabs" as any)
        .insert({
          brand_id: brandId,
          title: title.trim(),
          description: description.trim() || null,
          compensation_type: type,
          platforms: isGiftingOnly ? [] : platforms,
          other_platform: platforms.includes("Other") ? otherPlatform.trim() || null : null,
          fee_amount: needsFee && feeAmount ? parseFloat(feeAmount.replace(/[^0-9.]/g, "")) : null,
          payment_terms: hasDeliverables ? paymentTerms || null : null,
          deliverables: hasDeliverables || isGiftingOnly ? deliverables.trim() || null : null,
          go_live_date: hasDeliverables && goLiveDate ? goLiveDate : null,
          submission_deadline: hasDeliverables && submissionDeadline ? submissionDeadline : null,
          required_hashtags: requiredHashtags.trim() || null,
          required_mentions: requiredMentions.trim() || null,
          dos_and_donts: dosAndDonts.trim() || null,
          usage_rights: hasDeliverables ? usageRights || null : null,
          exclusivity_required: exclusivity,
          max_drafts: hasDeliverables ? parseInt(maxDrafts) || 1 : undefined,
          product_name: includesGifting ? productName.trim() || null : null,
          product_value: includesGifting && productValue ? Number(productValue) : null,
          product_image_url: includesGifting ? productImageUrl || null : null,
          request_shipping_address: includesGifting,
          additional_notes: null,
          creator_ids: [creatorId],
          status: "active",
        })
        .select("id")
        .single();
      if (error) throw error;

      // sendMessage returns { error, flagged } WITHOUT inserting when the
      // off-platform moderation filter trips on the brief text. The collab row
      // above already exists at that point, so discarding this told the brand
      // "creator notified" for an offer the creator never received.
      const sendResult: any = await sendMessage(`You have received a new collab offer: ${title}`, "paid_collab", {
        collab_id: (collabRecord as any)?.id || null,
        title,
        compensation_type: type,
        description: description || undefined,
        fee_amount: needsFee && feeAmount ? parseFloat(feeAmount.replace(/[^0-9.]/g, "")) : undefined,
        product_name: includesGifting ? productName || undefined : undefined,
        product_value: includesGifting && productValue ? Number(productValue) : undefined,
        product_image_url: includesGifting ? productImageUrl || undefined : undefined,
        platforms: hasDeliverables ? platforms : undefined,
        deliverables: hasDeliverables || isGiftingOnly ? deliverables || undefined : undefined,
        go_live_date: hasDeliverables && goLiveDate ? goLiveDate : undefined,
        submission_deadline: hasDeliverables && submissionDeadline ? submissionDeadline : undefined,
        required_hashtags: requiredHashtags || undefined,
        required_mentions: requiredMentions || undefined,
        dos_and_donts: dosAndDonts || undefined,
        usage_rights: hasDeliverables ? usageRights || undefined : undefined,
        payment_terms: hasDeliverables ? paymentTerms || undefined : undefined,
        exclusivity_required: exclusivity,
        max_drafts: hasDeliverables ? parseInt(maxDrafts) || 1 : undefined,
        status: "pending",
      });
      if (sendResult?.flagged) {
        // The collab row is real and manageable on the Paid Collabs page, so
        // don't roll it back — just stop claiming the creator was notified.
        toast.error(sendResult.error || "That message was blocked, so the creator was not notified.");
        return;
      }
      if (sendResult?.error) throw new Error(sendResult.error);

      await sendCollabEmail(creatorId, {
        brandName,
        collabTitle: title,
        compensationType: type,
        description: description || undefined,
        feeAmount: needsFee && feeAmount ? parseFloat(feeAmount.replace(/[^0-9.]/g, "")) : undefined,
        paymentTerms: hasDeliverables ? paymentTerms || undefined : undefined,
        productName: includesGifting ? productName || undefined : undefined,
        productValue: includesGifting && productValue ? Number(productValue) : undefined,
        productImageUrl: includesGifting ? productImageUrl || undefined : undefined,
        platforms: hasDeliverables ? platforms : undefined,
        deliverables: hasDeliverables || isGiftingOnly ? deliverables || undefined : undefined,
        goLiveDate: hasDeliverables && goLiveDate ? goLiveDate : undefined,
        submissionDeadline: hasDeliverables && submissionDeadline ? submissionDeadline : undefined,
        requiredHashtags: requiredHashtags || undefined,
        requiredMentions: requiredMentions || undefined,
        dosAndDonts: dosAndDonts || undefined,
        usageRights: hasDeliverables ? usageRights || undefined : undefined,
        exclusivityRequired: exclusivity,
        maxDrafts: hasDeliverables ? parseInt(maxDrafts) || 1 : undefined,
      });
      toast.success("Collab created and creator notified");
      onSent();
    } catch (err: any) {
      toast.error(err.message || "Could not send");
    } finally {
      setSending(false);
    }
  };

  const isValid = () => {
    if (assignToExisting !== "new") return true;
    if (isDiscount) return discountCode.trim() && discountValue;
    if (mentionFull) return title.trim() && deliverables.trim();
    if (isMention) return title.trim() && deliverableType;
    if (!title.trim()) return false;
    if (includesGifting && !productName.trim()) return false;
    if (hasDeliverables && (!deliverables.trim() || !goLiveDate)) return false;
    // Past dates are blocked on new offers only — an edit may legitimately
    // carry dates that have since passed.
    if (!editMessage && hasDeliverables && (isPastDate(goLiveDate) || isPastDate(submissionDeadline))) return false;
    if (needsFee && (!usageRights || !paymentTerms)) return false;
    if (needsFee && !feeAmount) return false;
    return true;
  };

  const typeLabel = type;

  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <div className="min-w-0">
            <DialogTitle className="font-display text-xl">
              {editMessage ? "Edit Paid Collab" : `New ${isDiscount ? "Discount Code" : "Paid Collab"}`}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {typeLabel} · {TYPE_DESCRIPTIONS[type]}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Assign to existing */}
          {existingCollabs.length > 0 && !isDiscount && !editMessage && (
            <div className="space-y-1 pb-3 border-b border-border">
              <Label className="text-xs">Assign to existing collab</Label>
              <Select value={assignToExisting} onValueChange={setAssignToExisting}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Create new collab</SelectItem>
                  {existingCollabs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title} · {c.compensation_type}
                      {(c.creator_ids || []).includes(creatorId) ? " ✓" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assignToExisting !== "new" && (
                <p className="text-xs text-muted-foreground mt-1">
                  {(existingCollabs.find((c) => c.id === assignToExisting)?.creator_ids || []).includes(creatorId)
                    ? `${partnerName} is already assigned to this collab.`
                    : `${partnerName} will be assigned to this collab when you send.`}
                </p>
              )}
            </div>
          )}

          {/* 'or' divider — only shown when there are existing collabs to choose from */}
          {existingCollabs.length > 0 && !isDiscount && !editMessage && (
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* New collab form — hidden if assigning to existing */}
          {(assignToExisting === "new" || !!editMessage) && (
            <div className="space-y-3">
              {/* Discount Code */}
              {isDiscount && (
                <>
                  <div>
                    <Label className="text-xs">Discount Code *</Label>
                    <Input
                      className="mt-1 font-mono uppercase"
                      placeholder="e.g. RORI20"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select value={discountType} onValueChange={setDiscountType}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed_amount">Fixed Amount (R)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">
                        {discountType === "percentage" ? "Discount %" : "Amount (ZAR)"} *
                      </Label>
                      <Input
                        type="number"
                        className="mt-1"
                        placeholder={discountType === "percentage" ? "20" : "100"}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Expiry Date</Label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Message to Creator</Label>
                    <Textarea
                      className="mt-1 min-h-[60px]"
                      placeholder={`e.g. Hi! Here's your exclusive code. Share it with your audience for ${discountType === "percentage" ? `${discountValue || "X"}%` : `R${discountValue || "X"}`} off at our store.`}
                      value={discountNotes}
                      onChange={(e) => setDiscountNotes(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Mention Request — quick chip form, initial in-chat create only */}
              {isMention && !editing && (
                <>
                  <div>
                    <Label className="text-xs">Campaign Title *</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. Heritage Day Campaign"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      className="mt-1 min-h-[60px]"
                      placeholder="What is this campaign about?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Content Type *</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {DELIVERABLE_TYPES.map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => setDeliverableType(d.value)}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${deliverableType === d.value ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground hover:border-foreground"}`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Fee (ZAR)</Label>
                      <Input
                        type="number"
                        className="mt-1"
                        placeholder="e.g. 1500"
                        value={mentionFee}
                        onChange={(e) => setMentionFee(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Go-live Date</Label>
                      <Input
                        type="date"
                        className="mt-1"
                        value={mentionDeadline}
                        onChange={(e) => setMentionDeadline(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* All other types — also used to revise a Mention Request (mentionFull) */}
              {(mentionFull || (!isMention && !isDiscount)) && (
                <>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Campaign</p>
                  <div>
                    <Label className="text-xs">Campaign Title *</Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. Winter Collection Launch"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{isGiftingOnly ? "Message to Creator" : "Description / Goals *"}</Label>
                    <Textarea
                      className="mt-1 min-h-[60px]"
                      placeholder={
                        isGiftingOnly
                          ? "e.g. We'd love for you to try our new winter range and share your honest thoughts if you enjoy it — no content required in exchange."
                          : "e.g. We're launching our winter collection on 1 August and want to build awareness on Instagram..."
                      }
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  {needsFee && (
                    <>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fee</p>
                      <div>
                        <Label className="text-xs">Fee Amount (ZAR) *</Label>
                        <Input
                          className="mt-1"
                          placeholder="e.g. 5000"
                          value={feeAmount}
                          onChange={(e) => setFeeAmount(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {includesGifting && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Gift Product *
                      </p>
                      <div>
                        <Label className="text-xs">Product Name *</Label>
                        <Input
                          className="mt-1"
                          placeholder="e.g. Winter Hoodie"
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Product Value (ZAR)</Label>
                        <Input
                          className="mt-1"
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 1200"
                          value={productValue}
                          onChange={(e) => setProductValue(e.target.value.replace(/[^0-9.]/g, ""))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Product Image</Label>
                        <div className="mt-1">
                          {productImageUrl ? (
                            <div className="relative w-16 h-16">
                              <img
                                src={productImageUrl}
                                alt="Product"
                                className="h-16 w-16 rounded-lg object-cover border"
                              />
                              <button
                                type="button"
                                onClick={() => setProductImageUrl("")}
                                className="absolute -top-1.5 -right-1.5 rounded-full bg-background border p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                              className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:border-foreground"
                            >
                              {uploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleImageUpload(f);
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
                        <span className="mt-0.5 shrink-0">📦</span>
                        <p>
                          The creator's shipping address will be automatically requested when they accept this collab.
                        </p>
                      </div>
                    </div>
                  )}

                  {hasDeliverables && (
                    <>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Deliverables</p>
                      <div>
                        <Label className="text-xs">What content do you need? *</Label>
                        <Input
                          className="mt-1"
                          placeholder="e.g. 2 Instagram Reels, 1 Instagram Story or 3 TikTok videos"
                          value={deliverables}
                          onChange={(e) => setDeliverables(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label className="text-xs flex items-center gap-1.5">
                          Draft rounds allowed *
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[220px] text-xs">
                                How many draft submissions the creator can send for review. You won't be able to request
                                more revisions than this.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <select
                          value={maxDrafts}
                          onChange={(e) => setMaxDrafts(e.target.value)}
                          className="mt-1 w-full appearance-none rounded-xl border border-border bg-background px-3 py-2 pr-8 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
                        >
                          <option value="1">1 draft</option>
                          <option value="2">2 drafts</option>
                          <option value="3">3 drafts</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs">Go-live Date *</Label>
                          <Input
                            type="date"
                            className="mt-1"
                            min={submissionDeadline || todayISO()}
                            value={goLiveDate}
                            onChange={(e) => setGoLiveDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Submission Deadline</Label>
                          <Input
                            type="date"
                            className="mt-1"
                            min={todayISO()}
                            value={submissionDeadline}
                            onChange={(e) => setSubmissionDeadline(e.target.value)}
                          />
                        </div>
                      </div>

                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground pt-1">
                        Content Guidelines
                      </p>
                      <div>
                        <Label className="text-xs">Required Hashtags</Label>
                        <Input
                          className="mt-1"
                          placeholder="e.g. #MyStorefront #BrandName"
                          value={requiredHashtags}
                          onChange={(e) => setRequiredHashtags(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Required Mentions</Label>
                        <Input
                          className="mt-1"
                          placeholder="e.g. @yourbrandhandle"
                          value={requiredMentions}
                          onChange={(e) => setRequiredMentions(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Dos and Don'ts</Label>
                        <Textarea
                          className="mt-1 min-h-[50px]"
                          placeholder="e.g. Do not mention competitors."
                          value={dosAndDonts}
                          onChange={(e) => setDosAndDonts(e.target.value)}
                        />
                      </div>

                      {needsFee && (
                        <div>
                          <Label className="text-xs">Usage Rights *</Label>
                          <div className="mt-1 flex flex-col gap-1.5">
                            {USAGE_RIGHTS.map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setUsageRights(r)}
                                className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors ${usageRights === r ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground hover:border-foreground"}`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {needsFee && (
                        <div>
                          <Label className="text-xs">Payment Terms *</Label>
                          <select
                            value={paymentTerms}
                            onChange={(e) => setPaymentTerms(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors"
                          >
                            {PAYMENT_TERMS.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {needsFee && (
                        <div className="flex items-start gap-2 pt-1">
                          <Checkbox
                            id="exclusivity"
                            checked={exclusivity}
                            onCheckedChange={(v) => setExclusivity(Boolean(v))}
                          />
                          <label
                            htmlFor="exclusivity"
                            className="text-xs text-muted-foreground leading-5 cursor-pointer"
                          >
                            Exclusivity required: creator may not promote direct competitors during this campaign
                          </label>
                        </div>
                      )}
                    </>
                  )}

                  {/* Sizing / custom question — gifting only, mirrors the creation modal */}
                  {includesGifting && (
                    <div className="pt-1">
                      <Label className="text-xs flex items-center gap-1.5">
                        Question for the creator (optional)
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px] text-xs">
                              The creator will be asked to answer this when they accept, alongside their shipping
                              address.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        className="mt-1"
                        placeholder="e.g. What hoodie size do you wear? (XS, S, M, L, XL, XXL)"
                        value={sizingQuestion}
                        onChange={(e) => setSizingQuestion(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Additional notes & attachment — parity with the creation modal */}
                  <div className="pt-1">
                    <Label className="text-xs">Additional Notes</Label>
                    <Textarea
                      className="mt-1 min-h-[60px]"
                      placeholder="Anything else the creator should know — brand tone of voice, sample delivery details, context, etc."
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-xs flex items-center gap-1.5">
                      Attach a File
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px] text-xs">
                            Logo, mood board, video example, brand guidelines — any file type.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    {attachmentUrl ? (
                      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2">
                        <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {/* min-w-0 is required for truncate to work — flex-1 alone
                            leaves min-width:auto, so a long filename widens the
                            whole dialog and forces horizontal scrolling. */}
                        <a
                          href={attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 flex-1 truncate text-sm text-primary hover:underline"
                        >
                          {attachmentName || "View attachment"}
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentUrl("");
                            setAttachmentName("");
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => attachmentInputRef.current?.click()}
                        disabled={uploadingAttachment}
                        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground"
                      >
                        {uploadingAttachment ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Paperclip className="h-4 w-4" />
                        )}
                        {uploadingAttachment ? "Uploading..." : "Click to attach a file"}
                      </button>
                    )}
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleAttachmentUpload(f);
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-6">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!isValid() || sending} className="flex-1">
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {editMessage ? "Save & Notify Creator" : assignToExisting !== "new" ? "Assign & Notify" : "Send Collab"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

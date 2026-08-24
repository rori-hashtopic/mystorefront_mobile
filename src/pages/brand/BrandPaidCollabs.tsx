import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useBrandAccount } from "@/hooks/useBrandAccount";
import { BrandLayout } from "@/components/layout/BrandLayout";
import { canAccessPaidCollabs } from "@/lib/paidCollabsAccess";
import { buildDiscountBriefData, emailCreatorOnDiscountAssigned } from "@/lib/discountEmails";

import { TierBanner } from "@/components/brand/TierBanner";
import { DiscountCodesPanel } from "@/components/brand/DiscountCodesPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Handshake,
  Plus,
  Loader2,
  Calendar,
  Package,
  Banknote,
  Gift,
  Upload,
  X,
  ArrowLeft,
  Megaphone,
  Tag,
  Paperclip,
  Info,
  AlertCircle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GiftCampaignDetailModal } from "@/components/brand/GiftCampaignDetailModal";
import { CollabManageDrawer } from "@/components/brand/CollabManageDrawer";

// ─── Types ───────────────────────────────────────────────────────────────────

type CompensationType =
  | "Gifting"
  | "Gifting + Deliverables"
  | "Paid Campaign"
  | "Paid Campaign + Gifting"
  | "Discount Code"
  | "Mention Request";

interface CollabForm {
  title: string;
  description: string;
  platforms: string[];
  compensation_type: CompensationType | "";
  fee_amount: string;
  payment_terms: string;
  deliverables: string;
  go_live_date: string;
  submission_deadline: string;
  required_hashtags: string;
  required_mentions: string;
  dos_and_donts: string;
  usage_rights: string;
  exclusivity: boolean;
  additional_notes: string;
  attachment_url: string;
  attachment_name: string;
  product_name: string;
  product_value: string;
  product_image_url: string;
  request_shipping_address: boolean;
  sizing_question: string;
  max_drafts: string;
  creator_ids: string[];
  other_platform: string;
}

interface CreatorOption {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  username: string | null;
}

interface Collab {
  id: string;
  brand_id: string;
  title: string;
  description: string | null;
  compensation_type: string;
  fee_amount: number | null;
  status: string;
  go_live_date: string | null;
  platforms: string[] | null;
  deliverables: string | null;
  creator_ids: string[] | null;
  created_at: string;
  gift_campaign_id: string | null;
  product_name: string | null;
  product_value: number | null;
  product_image_url: string | null;
  sizing_question: string | null;
  max_drafts: number | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Other"];

const COMPENSATION_TYPES: { value: CompensationType; label: string; icon: any; description: string }[] = [
  {
    value: "Gifting",
    label: "Gifting",
    icon: Gift,
    description: "Send product. No content required",
  },
  {
    value: "Gifting + Deliverables",
    label: "Gifting + Deliverables",
    icon: Package,
    description: "Send product in exchange for specific content",
  },
  {
    value: "Paid Campaign",
    label: "Paid Campaign",
    icon: Banknote,
    description: "Pay a cash fee for deliverables",
  },
  {
    value: "Paid Campaign + Gifting",
    label: "Paid Campaign + Gifting",
    icon: Banknote,
    description: "Cash fee plus product for deliverables",
  },
  {
    value: "Discount Code",
    label: "Discount Code",
    icon: Tag,
    description: "Send a creator an exclusive discount code to share",
  },
  {
    value: "Mention Request",
    label: "Mention Request",
    icon: Megaphone,
    description: "Request a shout-out or tag. No formal brief required",
  },
];

const USAGE_RIGHTS = [
  "Creator retains all rights",
  "Brand may repost with credit",
  "Brand has full repurposing rights",
];

const STATUS_COLOURS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground hover:bg-muted",
  active: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  paused: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  completed: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  closed: "bg-red-100 text-red-700 hover:bg-red-100",
  cancelled: "bg-red-100 text-red-700 hover:bg-red-100",
};

const PAYMENT_TERMS = [
  { value: "on_acceptance", label: "On acceptance" },
  { value: "on_submission", label: "On content submission" },
  { value: "on_approval", label: "On content approval" },
  { value: "on_go_live", label: "On go-live" },
];

const EMPTY_FORM: CollabForm = {
  title: "",
  description: "",
  platforms: [],
  compensation_type: "",
  fee_amount: "",
  payment_terms: "on_go_live",
  deliverables: "",
  go_live_date: "",
  submission_deadline: "",
  required_hashtags: "",
  required_mentions: "",
  dos_and_donts: "",
  usage_rights: "Brand may repost with credit",
  exclusivity: false,
  additional_notes: "",
  attachment_url: "",
  attachment_name: "",
  product_name: "",
  product_value: "",
  product_image_url: "",
  request_shipping_address: true,
  sizing_question: "",
  max_drafts: "2",
  creator_ids: [],
  other_platform: "",
};

// Local calendar date as YYYY-MM-DD. Deliberately not toISOString(), which
// converts to UTC and rolls back a day for SAST users after 02:00.
const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// Date inputs are YYYY-MM-DD, so string comparison is a valid date comparison.
const isPastDate = (v: string) => !!v && v < todayISO();

const formatDate = (v: string) =>
  new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(v));

// ─── Step 1: Compensation picker ─────────────────────────────────────────────

const COLLAB_OPTIONS = [
  {
    value: "Gifting" as CompensationType,
    label: "Gifting",
    icon: Gift,
    description: "Send product. No content required",
    type: "collab" as const,
  },
  {
    value: "Gifting + Deliverables" as CompensationType,
    label: "Gifting + Deliverables",
    icon: Package,
    description: "Send product in exchange for specific content",
    type: "collab" as const,
  },
  {
    value: "Paid Campaign" as CompensationType,
    label: "Paid Campaign",
    icon: Banknote,
    description: "Pay a cash fee for deliverables",
    type: "collab" as const,
  },
  {
    value: "Paid Campaign + Gifting" as CompensationType,
    label: "Paid Campaign + Gifting",
    icon: Banknote,
    description: "Cash fee plus product for deliverables",
    type: "collab" as const,
  },
  {
    value: "Mention Request" as CompensationType,
    label: "Mention Request",
    icon: Megaphone,
    description: "Request a shout-out or tag. No formal brief required",
    type: "collab" as const,
  },
  {
    value: "Discount Code" as CompensationType,
    label: "Discount Code",
    icon: Tag,
    description: "Send a creator an exclusive discount code to share",
    type: "collab" as const,
  },
];

function CompensationPicker({
  onSelect,
  onNavigate,
}: {
  onSelect: (type: CompensationType) => void;
  onNavigate: (href: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">What type of collab do you want to create?</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {COLLAB_OPTIONS.map(({ label, icon: Icon, description, value }) => (
          <button
            key={label}
            type="button"
            onClick={() => onSelect(value)}
            className="flex items-start gap-4 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-foreground hover:bg-secondary/40"
          >
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Icon className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">{label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Collab form ──────────────────────────────────────────────────────

function CollabFormFields({
  form,
  set,
  uploading,
  fileInputRef,
  handleImageUpload,
  attachmentInputRef,
  handleAttachmentUpload,
  uploadingAttachment,
}: {
  form: CollabForm;
  set: <K extends keyof CollabForm>(key: K, value: CollabForm[K]) => void;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleImageUpload: (file: File) => void;
  attachmentInputRef: React.RefObject<HTMLInputElement>;
  handleAttachmentUpload: (file: File) => void;
  uploadingAttachment: boolean;
}) {
  const togglePlatform = (p: string) =>
    set("platforms", form.platforms.includes(p) ? form.platforms.filter((x) => x !== p) : [...form.platforms, p]);

  const isDiscountCode = form.compensation_type === "Discount Code";
  const isGiftingOnly = form.compensation_type === "Gifting" || isDiscountCode;
  const includesGifting =
    form.compensation_type === "Gifting" ||
    form.compensation_type === "Gifting + Deliverables" ||
    form.compensation_type === "Paid Campaign + Gifting";
  const needsFee =
    form.compensation_type === "Paid Campaign" ||
    form.compensation_type === "Paid Campaign + Gifting" ||
    form.compensation_type === "Mention Request";

  const descriptionLabel = isGiftingOnly ? "Message to Creator" : "Description / Goals *";
  const descriptionPlaceholder = isGiftingOnly
    ? "e.g. We'd love for you to try our new winter range and share your honest thoughts if you enjoy it. No content required in exchange."
    : "e.g. We're launching our winter collection on 1 August and want to build awareness on Instagram. We're looking for authentic content that shows our products being used in everyday life. Nothing too polished. The tone should feel warm and relatable, not salesy.";

  return (
    <div className="space-y-6">
      {/* ── Campaign ── */}
      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Campaign</p>
        <div>
          <Label className="text-xs">Campaign Title *</Label>
          <Input
            className="mt-1"
            placeholder="e.g. Winter Collection Launch"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">{descriptionLabel}</Label>
          <Textarea
            className="mt-1 min-h-[80px]"
            placeholder={descriptionPlaceholder}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
      </section>

      {/* ── Fee — paid campaign types only ── */}
      {needsFee && <hr className="border-border" />}
      {needsFee && (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fee</p>
          <div>
            <Label className="text-xs">Fee Amount (ZAR) *</Label>
            <Input
              className="mt-1"
              placeholder="e.g. 5000"
              inputMode="decimal"
              value={form.fee_amount}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || /^\d*\.?\d*$/.test(v)) set("fee_amount", v);
              }}
            />
          </div>
        </section>
      )}

      {/* ── Gift Product ── */}
      {includesGifting && <hr className="border-border" />}
      {includesGifting && (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Gift Product *</p>
          <div>
            <Label className="text-xs">Product Name *</Label>
            <Input
              className="mt-1"
              placeholder="e.g. Winter Hoodie"
              value={form.product_name}
              onChange={(e) => set("product_name", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Product Value (ZAR)</Label>
            <Input
              className="mt-1"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 1200"
              value={form.product_value}
              onChange={(e) => set("product_value", e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </div>
          <div>
            <Label className="text-xs">Product Image</Label>
            <div className="mt-1 flex items-center gap-3">
              {form.product_image_url ? (
                <div className="relative">
                  <img
                    src={form.product_image_url}
                    alt="Product"
                    className="h-20 w-20 rounded-lg object-cover border"
                  />
                  <button
                    type="button"
                    onClick={() => set("product_image_url", "")}
                    className="absolute -top-2 -right-2 rounded-full bg-background border p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:border-foreground"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
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
        </section>
      )}

      {/* ── Deliverables — hidden for gifting-only ── */}
      {!isGiftingOnly && <hr className="border-border" />}
      {!isGiftingOnly && (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Deliverables</p>
          <div>
            <Label className="text-xs">What content do you need? *</Label>
            <Input
              className="mt-1"
              placeholder="e.g. 2 Instagram Reels, 1 Instagram Story or 3 TikTok videos"
              value={form.deliverables}
              onChange={(e) => set("deliverables", e.target.value)}
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
                    How many draft submissions the creator can send for review. You won't be able to request more
                    revisions than this.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <select
              value={form.max_drafts}
              onChange={(e) => set("max_drafts", e.target.value)}
              className="mt-1 w-full appearance-none rounded-xl border border-border bg-background px-3 py-2 pr-8 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
            >
              <option value="1">1 draft</option>
              <option value="2">2 drafts</option>
              <option value="3">3 drafts</option>
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Submission Deadline *</Label>
              <Input
                type="date"
                className={`mt-1 ${isPastDate(form.submission_deadline) ? "border-destructive focus-visible:ring-destructive" : ""}`}
                required
                min={todayISO()}
                value={form.submission_deadline}
                onChange={(e) => set("submission_deadline", e.target.value)}
                aria-invalid={isPastDate(form.submission_deadline)}
              />
            </div>
            <div>
              <Label className="text-xs">Go-live Date *</Label>
              <Input
                type="date"
                className={`mt-1 ${isPastDate(form.go_live_date) ? "border-destructive focus-visible:ring-destructive" : ""}`}
                min={form.submission_deadline || todayISO()}
                value={form.go_live_date}
                onChange={(e) => set("go_live_date", e.target.value)}
                aria-invalid={isPastDate(form.go_live_date)}
              />
            </div>
          </div>
          {isPastDate(form.submission_deadline) && (
            <p className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              The submission deadline can't be in the past; pick today or a future date.
            </p>
          )}
          {isPastDate(form.go_live_date) && (
            <p className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              The go-live date can't be in the past; pick today or a future date.
            </p>
          )}
          {form.submission_deadline && form.go_live_date && form.submission_deadline > form.go_live_date && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              ⚠️ Submission deadline is after the go-live date; creators won't have time to submit before going live.
            </p>
          )}
        </section>
      )}

      {/* ── Content Guidelines — hidden for gifting-only ── */}
      {!isGiftingOnly && <hr className="border-border" />}
      {!isGiftingOnly && (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Content Guidelines</p>
          <div>
            <Label className="text-xs">Required Hashtags</Label>
            <Input
              className="mt-1"
              placeholder="e.g. #MyStorefront #BrandName"
              value={form.required_hashtags}
              onChange={(e) => set("required_hashtags", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Required Mentions</Label>
            <Input
              className="mt-1"
              placeholder="e.g. @yourbrandhandle"
              value={form.required_mentions}
              onChange={(e) => set("required_mentions", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Dos and Don'ts</Label>
            <Textarea
              className="mt-1 min-h-[60px]"
              placeholder="e.g. Do not mention competitors. Always show product in natural light."
              value={form.dos_and_donts}
              onChange={(e) => set("dos_and_donts", e.target.value)}
            />
          </div>
        </section>
      )}

      {/* ── Usage Rights — paid campaigns only ── */}
      {needsFee && <hr className="border-border" />}
      {needsFee && (
        <section className="space-y-3">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Usage Rights *</p>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[240px] text-xs leading-relaxed">
                  <p className="font-medium mb-1">What does this mean?</p>
                  <p>
                    <strong>Creator retains all rights</strong>: the creator owns the content and you may not reuse it
                    without permission.
                  </p>
                  <p className="mt-1">
                    <strong>Brand may repost with credit</strong>: you can reshare on your channels as long as you tag
                    the creator.
                  </p>
                  <p className="mt-1">
                    <strong>Brand has full repurposing rights</strong>: you can use the content in ads, emails, or any
                    marketing without further permission.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex flex-col gap-2">
            {USAGE_RIGHTS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => set("usage_rights", r)}
                className={`rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${
                  form.usage_rights === r
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:border-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Payment & Exclusivity — paid campaigns only ── */}
      {needsFee && <hr className="border-border" />}
      {needsFee && (
        <section className="space-y-3">
          <div className="flex items-start gap-3 pt-1">
            <input
              id="exclusivity"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border accent-foreground"
              checked={form.exclusivity}
              onChange={(e) => set("exclusivity", e.target.checked)}
            />
            <label htmlFor="exclusivity" className="text-sm text-muted-foreground leading-5 cursor-pointer">
              Exclusivity required: creator may not promote direct competitors during this campaign
            </label>
          </div>
        </section>
      )}

      {/* ── Sizing Question (gifting only) ── */}
      {includesGifting && <hr className="border-border" />}
      {includesGifting && (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sizing / Custom Question</p>
          <div>
            <Label className="text-xs flex items-center gap-1.5">
              Question for the creator (optional)
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    The creator will be asked to answer this when they accept, alongside their shipping address.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              className="mt-1"
              placeholder="e.g. What hoodie size do you wear? (XS, S, M, L, XL, XXL)"
              value={form.sizing_question}
              onChange={(e) => set("sizing_question", e.target.value)}
            />
          </div>
        </section>
      )}

      <hr className="border-border" />
      {/* ── Additional Notes & Files ── */}
      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Additional Notes & Files</p>
        <div>
          <Label className="text-xs">Additional Notes</Label>
          <Textarea
            className="mt-1 min-h-[60px]"
            placeholder="Anything else the creator should know: brand tone of voice, sample delivery details, context, etc."
            value={form.additional_notes}
            onChange={(e) => set("additional_notes", e.target.value)}
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
                  Logo, mood board, video example, brand guidelines. Any file type.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          {form.attachment_url ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2">
              <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={form.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary truncate flex-1 hover:underline"
              >
                {form.attachment_name || "View attachment"}
              </a>
              <button
                type="button"
                onClick={() => {
                  set("attachment_url", "");
                  set("attachment_name", "");
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
              className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-foreground transition-colors w-full"
            >
              {uploadingAttachment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
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
      </section>
    </div>
  );
}

// ─── Assign Creator Modal ────────────────────────────────────────────────────

function AssignCreatorModal({
  open,
  onOpenChange,
  collab,
  brandId,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  collab: Collab | null;
  brandId: string;
  onAssigned: () => void;
}) {
  const [creators, setCreators] = useState<CreatorOption[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !collab) return;
    setSelected(collab.creator_ids || []);
    setSearch("");
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "creator");
      if (!roles || roles.length === 0) return;
      const ids = roles.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, username")
        .in("id", ids)
        .eq("onboarding_completed", true)
        .order("display_name");
      if (profiles) setCreators(profiles as CreatorOption[]);
    })();
  }, [open, collab]);

  if (!collab) return null;

  const existing = new Set(collab.creator_ids || []);
  const filtered = creators.filter((c) => {
    const s = search.toLowerCase();
    return !s || c.display_name?.toLowerCase().includes(s) || c.username?.toLowerCase().includes(s);
  });

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const newlyAdded = selected.filter((id) => !existing.has(id));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update creator_ids on the collab
      const { error } = await supabase
        .from("paid_collabs" as any)
        .update({ creator_ids: selected })
        .eq("id", collab.id);
      if (error) throw error;

      // Notify newly added creators via message + email
      if (newlyAdded.length > 0) {
        const { data: brandRow } = await supabase.from("brand_accounts").select("name").eq("id", brandId).maybeSingle();
        const brandName = (brandRow as any)?.name || "A brand";
        const {
          data: { user },
        } = await supabase.auth.getUser();

        for (const creatorId of newlyAdded) {
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
          if (!convo || !user) continue;

          await supabase.from("messages").insert({
            conversation_id: convo.id,
            sender_id: user.id,
            content: `You've been assigned to a paid collab: ${collab.title}`,
            message_type: "paid_collab",
            brief_data: {
              collab_id: collab.id,
              title: collab.title,
              compensation_type: collab.compensation_type,
              description: collab.description || null,
              fee_amount: collab.fee_amount,
              product_name: collab.product_name,
              product_value: collab.product_value,
              product_image_url: collab.product_image_url,
              platforms: collab.platforms || null,
              deliverables: collab.deliverables || null,
              go_live_date: collab.go_live_date || null,
              sizing_question: collab.sizing_question || null,
              status: "pending",
            },
          });

          try {
            await supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "collab-invite-creator",
                recipientUserId: creatorId,
                idempotencyKey: `collab-assign-${creatorId}-${collab.id}-${Date.now()}`,
                templateData: {
                  brandName,
                  collabTitle: collab.title,
                  compensationType: collab.compensation_type,
                  description: collab.description || undefined,
                  feeAmount: collab.fee_amount || undefined,
                  productName: collab.product_name || undefined,
                  productImageUrl: collab.product_image_url || undefined,
                },
              },
            });
          } catch (emailErr) {
            console.error("Failed to send collab invite email", emailErr);
          }
        }
      }

      // If the collab is still a draft, activate it now that creators are assigned
      if (collab.status === "draft" && newlyAdded.length > 0) {
        await supabase.from("paid_collabs").update({ status: "active" }).eq("id", collab.id);
      }

      toast.success(
        newlyAdded.length > 0
          ? `${newlyAdded.length} creator${newlyAdded.length > 1 ? "s" : ""} assigned & notified`
          : "Creator list updated",
      );
      onOpenChange(false);
      onAssigned();
    } catch (err: any) {
      toast.error(err.message || "Could not assign creators");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Assign Creators</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{collab.title}</p>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <input
            type="text"
            placeholder="Search creators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <div className="max-h-60 overflow-y-auto rounded-xl border border-border">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">No creators found</p>
            ) : (
              filtered.map((c) => {
                const isExisting = existing.has(c.id);
                const isSelected = selected.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary ${
                      isSelected ? "bg-secondary font-medium" : ""
                    }`}
                  >
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={c.photo_url || undefined} />
                      <AvatarFallback className="text-[9px]">{(c.display_name || "?")[0]}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{c.display_name || c.username || "Unknown"}</span>
                    {isExisting && <span className="text-[10px] text-muted-foreground">Already assigned</span>}
                    {isSelected && <span className="text-xs text-foreground">✓</span>}
                  </button>
                );
              })
            )}
          </div>
          {selected.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selected.length} creator{selected.length > 1 ? "s" : ""} selected
              {newlyAdded.length > 0 && ` · ${newlyAdded.length} new`}
            </p>
          )}
          {(collab.compensation_type || "").includes("Gifting") && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
              <span className="mt-0.5 shrink-0">📦</span>
              <p>The creator's shipping address will be automatically requested when they accept this collab.</p>
            </div>
          )}
          <Button className="w-full" disabled={saving || newlyAdded.length === 0} onClick={handleSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {newlyAdded.length > 0
              ? `Assign ${newlyAdded.length} Creator${newlyAdded.length > 1 ? "s" : ""}`
              : "No new creators selected"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal (orchestrates the two steps) ──────────────────────────────────────

function CollabFormModal({
  open,
  onOpenChange,
  brandId,
  brandName,
  onCreated,
  editingId,
  initialForm,
  existingGiftCampaignId,
  lockCommercialTerms,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  brandId: string;
  brandName: string;
  onCreated: () => void;
  editingId?: string | null;
  initialForm?: CollabForm | null;
  existingGiftCampaignId?: string | null;
  /** True once a creator has agreed to the terms — see the guard in handleSave. */
  lockCommercialTerms?: boolean;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(editingId || initialForm?.compensation_type ? 2 : 1);
  const [form, setForm] = useState<CollabForm>(initialForm || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // ── Discount code state ──
  const EMPTY_DISCOUNT = {
    code: "",
    discountType: "percentage",
    discountValue: "",
    minOrder: "",
    usageLimit: "",
    expiryDate: "",
    creatorId: "",
    customMessage: "",
    notes: "",
    creatorSearch: "",
  };
  const [discountForm, setDiscountForm] = useState(EMPTY_DISCOUNT);
  const [discountCreators, setDiscountCreators] = useState<CreatorOption[]>([]);
  const setDiscount = <K extends keyof typeof EMPTY_DISCOUNT>(key: K, value: (typeof EMPTY_DISCOUNT)[K]) =>
    setDiscountForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (open) {
      setForm(initialForm || EMPTY_FORM);
      setStep(editingId || initialForm?.compensation_type ? 2 : 1);
      setDiscountForm({ ...EMPTY_DISCOUNT });
    }
  }, [open, initialForm, editingId]);

  // Fetch creators for discount code assignment
  useEffect(() => {
    if (!open || form.compensation_type !== "Discount Code") return;
    supabase
      .from("profiles")
      .select("id, display_name, photo_url, username")
      .eq("onboarding_completed", true)
      .order("display_name")
      .then(({ data }) => {
        if (data) setDiscountCreators(data as CreatorOption[]);
      });
  }, [open, form.compensation_type]);

  const set = <K extends keyof CollabForm>(key: K, value: CollabForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleCompensationSelect = (type: CompensationType) => {
    set("compensation_type", type);
    setStep(2);
  };

  const isDiscountCode = form.compensation_type === "Discount Code";
  const isGiftingOnly = form.compensation_type === "Gifting" || isDiscountCode;
  const includesGifting =
    !isDiscountCode &&
    (form.compensation_type === "Gifting" ||
      form.compensation_type === "Gifting + Deliverables" ||
      form.compensation_type === "Paid Campaign + Gifting");
  const needsDeliverables =
    form.compensation_type === "Gifting + Deliverables" ||
    form.compensation_type === "Paid Campaign" ||
    form.compensation_type === "Paid Campaign + Gifting" ||
    form.compensation_type === "Mention Request";
  const needsFee =
    form.compensation_type === "Paid Campaign" ||
    form.compensation_type === "Paid Campaign + Gifting" ||
    form.compensation_type === "Mention Request";

  // Only block past dates when creating. An existing collab may legitimately
  // have dates in the past — editing it shouldn't become impossible.
  const datesAreValid = !!editingId || (!isPastDate(form.submission_deadline) && !isPastDate(form.go_live_date));

  const isValid =
    form.title.trim() &&
    form.compensation_type &&
    (!includesGifting || form.product_name.trim()) &&
    (isGiftingOnly ||
      (form.deliverables.trim() &&
        form.go_live_date &&
        form.submission_deadline &&
        datesAreValid &&
        (!needsFee || form.usage_rights)));

  // ── Discount code helpers ──
  const discountDefaultMessage = () => {
    const discountText =
      discountForm.discountType === "percentage"
        ? `${discountForm.discountValue}% off`
        : `R${Number(discountForm.discountValue).toFixed(0)} off`;
    return `Your exclusive discount code is ready: ${discountForm.code.trim().toUpperCase()}. Share it with your audience for ${discountText} at ${brandName}.`;
  };

  const filteredDiscountCreators = discountCreators.filter((c) => {
    const s = discountForm.creatorSearch.toLowerCase();
    return !s || c.display_name?.toLowerCase().includes(s) || c.username?.toLowerCase().includes(s);
  });

  const handleDiscountSubmit = async () => {
    if (!discountForm.code.trim() || !discountForm.discountValue) return;
    setSaving(true);

    // Capture the inserted row id so the message card and the email idempotency
    // key can both point at this specific code.
    const { data: inserted, error } = await supabase
      .from("discount_codes" as any)
      .insert({
        brand_id: brandId,
        code: discountForm.code.trim().toUpperCase(),
        discount_type: discountForm.discountType,
        discount_value: parseFloat(discountForm.discountValue),
        minimum_order_value: discountForm.minOrder ? parseFloat(discountForm.minOrder) : null,
        usage_limit: discountForm.usageLimit ? parseInt(discountForm.usageLimit) : null,
        expiry_date: discountForm.expiryDate || null,
        creator_id: discountForm.creatorId || null,
        notes: discountForm.notes.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        toast.error("This code already exists for your brand.");
      } else {
        toast.error(error.message);
      }
      setSaving(false);
      return;
    }

    const discountCodeId = (inserted as any)?.id ?? null;

    // Send message to creator if assigned
    if (discountForm.creatorId) {
      try {
        let { data: convo } = await supabase
          .from("conversations")
          .select("id")
          .eq("brand_id", brandId)
          .eq("creator_id", discountForm.creatorId)
          .maybeSingle();
        if (!convo) {
          const { data: newConvo } = await supabase
            .from("conversations")
            .insert({ brand_id: brandId, creator_id: discountForm.creatorId })
            .select("id")
            .single();
          convo = newConvo;
        }
        if (convo) {
          const messageText = discountForm.customMessage.trim() || discountDefaultMessage();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          await supabase.from("messages").insert({
            conversation_id: convo.id,
            sender_id: user!.id,
            content: messageText,
            message_type: "discount_code",
            // Without brief_data ChatView renders this as plain text instead of
            // a DiscountCodeCard, and the creator never gets an Acknowledge
            // button.
            brief_data: buildDiscountBriefData({
              code: discountForm.code.trim().toUpperCase(),
              discountType: discountForm.discountType,
              discountValue: parseFloat(discountForm.discountValue),
              expiryDate: discountForm.expiryDate || null,
              notes: discountForm.notes.trim() || null,
              discountCodeId,
            }),
          });
        }
      } catch (err) {
        console.error("Failed to send discount message:", err);
      }

      // Fire-and-forget: a failed email must not block the success toast.
      await emailCreatorOnDiscountAssigned({
        creatorUserId: discountForm.creatorId,
        discountCodeId,
        code: discountForm.code.trim().toUpperCase(),
        discountType: discountForm.discountType,
        discountValue: parseFloat(discountForm.discountValue),
        expiryDate: discountForm.expiryDate || null,
        notes: discountForm.notes.trim() || null,
        brandName,
      });
    }

    toast.success("Discount code created.");
    setDiscountForm({ ...EMPTY_DISCOUNT });
    onOpenChange(false);
    onCreated();
    setSaving(false);
  };

  const handleAttachmentUpload = async (file: File) => {
    setUploadingAttachment(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${brandId}/attachments/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("gift-campaign-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("gift-campaign-images").getPublicUrl(path);
      set("attachment_url", data.publicUrl);
      set("attachment_name", file.name);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${brandId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gift-campaign-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("gift-campaign-images").getPublicUrl(path);
      set("product_image_url", data.publicUrl);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Fields that make up the deal the creator agreed to. Changing any of them
  // after acceptance is a renegotiation, not an edit — it has to go through the
  // conversation so the creator sees it and can agree or push back.
  const COMMERCIAL_FIELDS: [keyof CollabForm, string][] = [
    ["fee_amount", "fee"],
    ["deliverables", "deliverables"],
    ["go_live_date", "go-live date"],
    ["submission_deadline", "draft deadline"],
    ["product_value", "product value"],
    ["usage_rights", "usage rights"],
    ["payment_terms", "payment terms"],
  ];

  const handleSave = async (status: "draft" | "active") => {
    if (!isValid) return;

    if (lockCommercialTerms && initialForm) {
      const changed = COMMERCIAL_FIELDS.find(([key]) => String(form[key] ?? "") !== String(initialForm[key] ?? ""));
      const label = changed
        ? changed[1]
        : form.exclusivity !== initialForm.exclusivity
          ? "exclusivity requirement"
          : null;
      if (label) {
        toast.error(
          `A creator has already accepted this collab, so the ${label} can't be changed here. Open the conversation and revise the offer so they can agree to it.`,
        );
        return;
      }
    }

    setSaving(true);
    try {
      let giftCampaignId: string | null = existingGiftCampaignId || null;

      if (includesGifting) {
        const productValueNum = form.product_value ? Number(form.product_value.replace(/[^\d.]/g, "")) : null;
        const campaignPayload: any = {
          brand_id: brandId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          product_name: form.product_name.trim(),
          product_value: productValueNum,
          product_image_url: form.product_image_url || null,
          status: status === "active" ? "active" : "draft",
        };
        if (giftCampaignId) {
          const { error: gcErr } = await supabase
            .from("gift_campaigns")
            .update(campaignPayload)
            .eq("id", giftCampaignId);
          if (gcErr) throw gcErr;
        } else {
          const { data: gc, error: gcErr } = await supabase
            .from("gift_campaigns")
            .insert(campaignPayload)
            .select("id")
            .single();
          if (gcErr) throw gcErr;
          giftCampaignId = gc.id;
        }
      }

      const payload: any = {
        brand_id: brandId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        platforms: isGiftingOnly ? [] : form.platforms,
        compensation_type: form.compensation_type,
        fee_amount: needsFee && form.fee_amount ? Number(form.fee_amount.replace(/[^\d.]/g, "")) : null,
        deliverables: needsDeliverables ? form.deliverables.trim() || null : null,
        go_live_date: !isGiftingOnly && form.go_live_date ? form.go_live_date : null,
        submission_deadline: !isGiftingOnly && form.submission_deadline ? form.submission_deadline : null,
        required_hashtags: form.required_hashtags.trim() || null,
        required_mentions: form.required_mentions.trim() || null,
        dos_and_donts: form.dos_and_donts.trim() || null,
        usage_rights: !isGiftingOnly ? form.usage_rights || null : null,
        payment_terms: !isGiftingOnly ? form.payment_terms || null : null,
        exclusivity_required: form.exclusivity,
        creator_ids: editingId ? undefined : null,
        other_platform: form.platforms.includes("Other") ? form.other_platform.trim() || null : null,
        additional_notes: form.additional_notes.trim() || null,
        attachment_url: form.attachment_url || null,
        attachment_name: form.attachment_name || null,
        product_name: includesGifting ? form.product_name.trim() : null,
        product_value: includesGifting && form.product_value ? Number(form.product_value.replace(/[^\d.]/g, "")) : null,
        product_image_url: includesGifting ? form.product_image_url || null : null,
        gift_campaign_id: giftCampaignId,
        request_shipping_address: includesGifting ? form.request_shipping_address : false,
        sizing_question: includesGifting && form.sizing_question.trim() ? form.sizing_question.trim() : null,
        max_drafts: needsDeliverables ? parseInt(form.max_drafts) || 1 : null,
        status,
      };

      let savedCollabId = editingId;
      if (editingId) {
        const { error } = await supabase.from("paid_collabs").update(payload).eq("id", editingId);
        if (error) throw error;

        // The creator's chat card renders from messages.brief_data, NOT from
        // paid_collabs, and nothing syncs the two — no trigger, no shared write.
        // So an edit made on this page updated the record the brand is invoiced
        // from while the creator carried on seeing the original terms.
        // One collab can carry several creators, each with their own card, so
        // every linked message has to be updated.
        const { data: linkedMessages, error: linkedErr } = await supabase
          .from("messages")
          .select("id, brief_data")
          .eq("brief_data->>collab_id", editingId);
        if (linkedErr) throw linkedErr;

        if (!linkedMessages?.length) {
          // Normal for a draft that was never sent to anyone. Logged because a
          // collab WITH creators and no linked message means the filter missed.
          console.warn("No linked chat messages found for collab", editingId);
        }

        for (const m of (linkedMessages || []) as any[]) {
          // Merge, never replace: brief_data also holds the negotiation state
          // this page knows nothing about — status, counter notes, the
          // creator's shipping address and sizing answer.
          const merged = {
            ...(m.brief_data || {}),
            title: payload.title,
            description: payload.description ?? undefined,
            compensation_type: payload.compensation_type,
            fee_amount: payload.fee_amount ?? undefined,
            deliverables: payload.deliverables ?? undefined,
            platforms: payload.platforms,
            go_live_date: payload.go_live_date ?? undefined,
            submission_deadline: payload.submission_deadline ?? undefined,
            required_hashtags: payload.required_hashtags ?? undefined,
            required_mentions: payload.required_mentions ?? undefined,
            dos_and_donts: payload.dos_and_donts ?? undefined,
            usage_rights: payload.usage_rights ?? undefined,
            payment_terms: payload.payment_terms ?? undefined,
            exclusivity_required: payload.exclusivity_required,
            additional_notes: payload.additional_notes ?? undefined,
            attachment_url: payload.attachment_url ?? undefined,
            attachment_name: payload.attachment_name ?? undefined,
            product_name: payload.product_name ?? undefined,
            product_value: payload.product_value ?? undefined,
            product_image_url: payload.product_image_url ?? undefined,
            sizing_question: payload.sizing_question ?? undefined,
            max_drafts: payload.max_drafts ?? undefined,
          };
          const { data: msgRows, error: msgErr } = await supabase
            .from("messages")
            .update({ brief_data: merged })
            .eq("id", m.id)
            .select("id");
          if (msgErr) throw msgErr;
          if (!msgRows || msgRows.length === 0) {
            throw new Error(
              "The collab was saved, but the creator's copy could not be updated. They would still see the old terms. Please refresh and try again.",
            );
          }
        }
      } else {
        const { data: inserted, error } = await supabase.from("paid_collabs").insert(payload).select("id").single();
        if (error) throw error;
        savedCollabId = (inserted as any).id;
      }

      toast.success(editingId ? "Collab updated" : status === "draft" ? "Saved as draft" : "Paid collab created");
      setForm(EMPTY_FORM);
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error(err.message || "Could not save collab");
    } finally {
      setSaving(false);
    }
  };

  const selectedType = COMPENSATION_TYPES.find((t) => t.value === form.compensation_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto gap-1.5 p-4 sm:p-6 sm:gap-2">
        <DialogHeader className="pb-0">
          <div className="flex items-center gap-3">
            {step === 2 && !editingId && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
              <DialogTitle className="font-display text-xl">
                {editingId
                  ? "Edit Paid Collab"
                  : isDiscountCode && step === 2
                    ? "Create Discount Code"
                    : step === 1
                      ? "New Paid Collab"
                      : "New Paid Collab"}
              </DialogTitle>
              {step === 2 && selectedType && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isDiscountCode
                    ? "Discount Code · Give creators an exclusive code to share: in addition to their sales commission"
                    : `${selectedType.label} · ${selectedType.description}`}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Set expectations before they type, rather than rejecting them at save. */}
        {lockCommercialTerms && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            A creator has already accepted this collab. You can still update the title, notes and attachments here, but
            the <strong>fee, deliverables, dates and terms</strong> are part of what they agreed to. Change those from
            the conversation so they can agree to the new offer.
          </div>
        )}

        <div className="py-2">
          {step === 1 ? (
            <CompensationPicker
              onSelect={handleCompensationSelect}
              onNavigate={(href) => {
                onOpenChange(false);
                navigate(href);
              }}
            />
          ) : isDiscountCode ? (
            <>
              <div className="space-y-5">
                <div className="flex gap-2 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <p>
                    For complex usage restrictions, create the discount code directly on your store. It will sync here
                    automatically.
                  </p>
                </div>

                {/* ── Code ── */}
                <section className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Code</p>
                  <div>
                    <Label className="text-xs">Discount Code *</Label>
                    <Input
                      className="mt-1 font-mono uppercase"
                      value={discountForm.code}
                      onChange={(e) => setDiscount("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
                      placeholder="e.g. RORI20"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Tip: use the creator's name or initials for a personal touch.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Discount Type</Label>
                      <Select value={discountForm.discountType} onValueChange={(v) => setDiscount("discountType", v)}>
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
                        {discountForm.discountType === "percentage" ? "Discount %" : "Amount off (ZAR)"} *
                      </Label>
                      <Input
                        type="number"
                        className="mt-1"
                        value={discountForm.discountValue}
                        onChange={(e) => setDiscount("discountValue", e.target.value)}
                        placeholder={discountForm.discountType === "percentage" ? "20" : "100"}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </section>

                {/* ── Restrictions ── */}
                <section className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Restrictions</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Min. Order Value (ZAR)</Label>
                      <Input
                        type="number"
                        className="mt-1"
                        value={discountForm.minOrder}
                        onChange={(e) => setDiscount("minOrder", e.target.value)}
                        placeholder="Optional"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Max Uses</Label>
                      <Input
                        type="number"
                        className="mt-1"
                        value={discountForm.usageLimit}
                        onChange={(e) => setDiscount("usageLimit", e.target.value)}
                        placeholder="Unlimited"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Expiry Date</Label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={discountForm.expiryDate}
                      onChange={(e) => setDiscount("expiryDate", e.target.value)}
                    />
                  </div>
                </section>

                {/* ── Assign to creator ── */}
                <section className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Assign to Creator
                  </p>
                  <Input
                    placeholder="Search creators..."
                    value={discountForm.creatorSearch}
                    onChange={(e) => setDiscount("creatorSearch", e.target.value)}
                  />
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-border">
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors ${!discountForm.creatorId ? "bg-secondary font-medium" : ""}`}
                      onClick={() => setDiscount("creatorId", "")}
                    >
                      No creator (unassigned)
                    </button>
                    {filteredDiscountCreators.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors flex items-center gap-2 ${discountForm.creatorId === c.id ? "bg-secondary font-medium" : ""}`}
                        onClick={() => setDiscount("creatorId", c.id)}
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={c.photo_url || undefined} />
                          <AvatarFallback className="text-[8px]">{(c.display_name || "?")[0]}</AvatarFallback>
                        </Avatar>
                        {c.display_name || c.username || "Unknown"}
                      </button>
                    ))}
                  </div>

                  {discountForm.creatorId && (
                    <div>
                      <Label className="text-xs">Message to Creator</Label>
                      <Textarea
                        className="mt-1 min-h-[80px] text-sm"
                        placeholder={discountDefaultMessage()}
                        value={discountForm.customMessage}
                        onChange={(e) => setDiscount("customMessage", e.target.value)}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Leave blank to use the default message. This is sent automatically when you create the code.
                      </p>
                    </div>
                  )}
                </section>

                {/* ── Internal notes ── */}
                <section>
                  <Label className="text-xs">Internal Notes</Label>
                  <Textarea
                    className="mt-1"
                    value={discountForm.notes}
                    onChange={(e) => setDiscount("notes", e.target.value)}
                    placeholder="e.g. For Heritage Day campaign, expires end of month"
                    rows={2}
                  />
                </section>
              </div>

              <div className="flex gap-2 pt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setDiscountForm({ ...EMPTY_DISCOUNT });
                    onOpenChange(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!discountForm.code.trim() || !discountForm.discountValue || saving}
                  onClick={handleDiscountSubmit}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Code
                </Button>
              </div>
            </>
          ) : (
            <>
              <CollabFormFields
                form={form}
                set={set}
                uploading={uploading}
                fileInputRef={fileInputRef}
                handleImageUpload={handleImageUpload}
                attachmentInputRef={attachmentInputRef}
                handleAttachmentUpload={handleAttachmentUpload}
                uploadingAttachment={uploadingAttachment}
              />
              <div className="flex gap-2 pt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!form.title.trim() || saving}
                  onClick={() => handleSave("draft")}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save as Draft
                </Button>
                <Button className="flex-1" disabled={!isValid || saving} onClick={() => handleSave("active")}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingId ? "Save & Activate" : "Create Collab"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BrandPaidCollabs() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { brand } = useBrandAccount();
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [loading, setLoading] = useState(true);
  type ActiveModal = "create" | null;
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<CollabForm | null>(null);
  const [editingGiftCampaignId, setEditingGiftCampaignId] = useState<string | null>(null);
  const [manageGiftCampaign, setManageGiftCampaign] = useState<any | null>(null);
  const [manageCollab, setManageCollab] = useState<Collab | null>(null);
  const [assignCollab, setAssignCollab] = useState<Collab | null>(null);
  const [collabsNeedingAttention, setCollabsNeedingAttention] = useState<Set<string>>(new Set());
  const [collabsNeedingShipment, setCollabsNeedingShipment] = useState<Set<string>>(new Set());
  const [editingHasAccepted, setEditingHasAccepted] = useState(false);

  const openEdit = async (id: string) => {
    const { data, error } = await supabase.from("paid_collabs").select("*").eq("id", id).maybeSingle();
    if (error || !data) {
      toast.error("Could not load collab");
      return;
    }
    setEditingForm({
      title: data.title || "",
      description: data.description || "",
      platforms: data.platforms || [],
      compensation_type: (data.compensation_type as CompensationType) || "",
      fee_amount: data.fee_amount ? String(data.fee_amount) : "",
      deliverables: data.deliverables || "",
      go_live_date: data.go_live_date || "",
      submission_deadline: data.submission_deadline || "",
      required_hashtags: data.required_hashtags || "",
      required_mentions: data.required_mentions || "",
      dos_and_donts: data.dos_and_donts || "",
      usage_rights: data.usage_rights || "",
      additional_notes: data.additional_notes || "",
      attachment_url: (data as any).attachment_url || "",
      attachment_name: (data as any).attachment_name || "",
      product_name: (data as any).product_name || "",
      product_value: (data as any).product_value ? String((data as any).product_value) : "",
      product_image_url: (data as any).product_image_url || "",
      request_shipping_address: (data as any).request_shipping_address ?? true,
      sizing_question: (data as any).sizing_question || "",
      max_drafts: String((data as any).max_drafts || 1),
      payment_terms: (data as any).payment_terms || "",
      exclusivity: (data as any).exclusivity_required ?? false,
      creator_ids: (data as any).creator_ids || [],
      other_platform: (data as any).other_platform || "",
    });
    // Once a creator has agreed to the terms, the brand can't quietly change
    // them here — the fee they accepted is the deal. Anything past the
    // pre-agreement statuses counts as accepted.
    const PRE_AGREEMENT = ["pending", "invited", "negotiating", "declined"];
    const { data: participants } = await supabase
      .from("paid_collab_participants" as any)
      .select("status")
      .eq("collab_id", id);
    setEditingHasAccepted(
      ((participants || []) as any[]).some((p) => p.status && !PRE_AGREEMENT.includes(String(p.status))),
    );

    setEditingGiftCampaignId((data as any).gift_campaign_id || null);
    setEditingId(id);
    setActiveModal("create");
  };

  const handleModalChange = (v: boolean) => {
    setActiveModal(v ? "create" : null);
    if (!v) {
      setEditingId(null);
      setEditingForm(null);
      setEditingGiftCampaignId(null);
      setEditingHasAccepted(false);
    }
  };

  const openManageGifting = async (collab: Collab) => {
    if (!collab.gift_campaign_id) {
      toast.error("This collab is not linked to a gift campaign yet. Save it as Active first.");
      return;
    }
    const { data, error } = await supabase
      .from("gift_campaigns")
      .select("*")
      .eq("id", collab.gift_campaign_id)
      .maybeSingle();
    if (error || !data) {
      toast.error("Could not load gift campaign");
      return;
    }
    setManageGiftCampaign(data);
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role && role !== "brand" && role !== "admin") navigate("/");
  }, [role, roleLoading, navigate]);

  // Paid Collabs beta: restricted to allowlisted brand-owner emails.
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!canAccessPaidCollabs(user.email)) navigate("/brand");
  }, [user, authLoading, navigate]);

  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});

  const fetchCreatorNames = async (ids: string[]) => {
    if (!ids.length) return;
    const { data } = await supabase.from("profiles").select("id, display_name, username").in("id", ids);
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((p: any) => {
        map[p.id] = p.display_name || p.username || "Unknown";
      });
      setCreatorNames((prev) => ({ ...prev, ...map }));
    }
  };

  const fetchCollabs = async () => {
    if (!brand) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("paid_collabs")
      .select(
        "id, brand_id, title, description, compensation_type, fee_amount, status, go_live_date, platforms, deliverables, creator_ids, created_at, gift_campaign_id, product_name, product_value, product_image_url, sizing_question, max_drafts",
      )
      .eq("brand_id", brand.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load collabs");
    const rows = (data as Collab[]) || [];
    setCollabs(rows);
    const allIds = [...new Set(rows.flatMap((r) => r.creator_ids || []))];
    if (allIds.length) fetchCreatorNames(allIds);

    // Check which collabs have participants needing brand attention
    const collabIds = rows.map((r) => r.id);
    if (collabIds.length > 0) {
      const [participantsRes, conversationsRes] = await Promise.all([
        supabase
          .from("paid_collab_participants" as any)
          .select("collab_id, status, verified_live_at")
          .in("collab_id", collabIds)
          .in("status", ["draft_submitted", "negotiating", "live", "accepted"]),
        supabase
          .from("conversations")
          .select("id, messages:messages:messages(brief_data)")
          .eq("brand_id", brand.id)
          .eq("messages.message_type", "paid_collab"),
      ]);
      const attentionSet = new Set<string>();
      const shippingSet = new Set<string>();
      for (const p of (participantsRes.data || []) as any[]) {
        if (p.status === "live" && p.verified_live_at) continue;
        if (p.status === "accepted") {
          const collab = rows.find((r) => r.id === p.collab_id);
          if (
            collab &&
            (collab.compensation_type === "Gifting" ||
              collab.compensation_type === "Gifting + Deliverables" ||
              collab.compensation_type === "Paid Campaign + Gifting")
          ) {
            shippingSet.add(p.collab_id);
          }
        }
        if (p.status !== "accepted") attentionSet.add(p.collab_id);
      }
      // Check message cards for creator proposed changes
      for (const conv of (conversationsRes.data || []) as any[]) {
        for (const msg of (conv.messages || []) as any[]) {
          const meta = msg.brief_data;
          if (
            meta?.status === "negotiating" &&
            meta?.creator_counter_note &&
            meta?.collab_id &&
            collabIds.includes(meta.collab_id)
          ) {
            attentionSet.add(meta.collab_id);
          }
        }
      }
      setCollabsNeedingAttention(attentionSet);
      setCollabsNeedingShipment(shippingSet);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (brand) fetchCollabs();
  }, [brand]);

  // Category order shown on the page. Anything with an unrecognised
  // compensation_type (legacy rows, renamed types) falls into "Other" rather
  // than disappearing from the list.
  const CATEGORY_ORDER = [
    "Paid Campaign",
    "Paid Campaign + Gifting",
    "Gifting + Deliverables",
    "Gifting",
    "Mention Request",
  ];

  const groupedCollabs = (() => {
    const groups = new Map<string, typeof collabs>();
    collabs.forEach((c) => {
      const key = CATEGORY_ORDER.includes(c.compensation_type || "") ? (c.compensation_type as string) : "Other";
      const bucket = groups.get(key);
      if (bucket) bucket.push(c);
      else groups.set(key, [c]);
    });
    const ordered = CATEGORY_ORDER.filter((k) => groups.has(k)).map((k) => [k, groups.get(k)!] as const);
    if (groups.has("Other")) ordered.push(["Other", groups.get("Other")!] as const);
    return ordered;
  })();

  const compensationIcon = (type: string) => {
    if (type === "Gifting") return <Gift className="h-4 w-4 text-muted-foreground" />;
    if (type.includes("fee")) return <Banknote className="h-4 w-4 text-muted-foreground" />;
    return <Package className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <BrandLayout brandName={brand?.name} brandStatus={brand?.status} brandPlan={brand?.plan_tier}>
      <div className="space-y-6">
        <TierBanner tier="premium" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1">Paid Collabs</h1>
            <p className="text-sm text-muted-foreground">Create and manage paid collaborations with creators.</p>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => {
              setEditingId(null);
              setEditingForm(null);
              setEditingGiftCampaignId(null);
              setActiveModal("create");
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> New Collab
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : collabs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Handshake className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium text-foreground">No paid collabs yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Create a collab and send it to creators to get started.
              </p>
              <Button
                onClick={() => {
                  setEditingId(null);
                  setEditingForm(null);
                  setEditingGiftCampaignId(null);
                  setActiveModal("create");
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> New Collab
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {groupedCollabs.map(([category, categoryCollabs]) => (
              <section key={category} className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <h2 className="font-display text-xl font-semibold text-foreground">{category}</h2>
                  <span className="text-sm text-muted-foreground">({categoryCollabs.length})</span>
                </div>
                {categoryCollabs.map((collab) => {
                  const isGifting = (collab.compensation_type || "").includes("Gifting");
                  return (
                    <Card key={collab.id} className="transition-colors">
                      <CardContent className="p-4 space-y-2">
                        {/* Title + badge */}
                        <div className="flex items-center gap-2 min-w-0">
                          {compensationIcon(collab.compensation_type)}
                          <h3 className="font-medium text-foreground truncate flex-1">{collab.title}</h3>
                          <Badge
                            className={`capitalize shrink-0 text-[10px] ${STATUS_COLOURS[collab.status] || "bg-muted text-muted-foreground"}`}
                          >
                            {collab.status}
                          </Badge>
                        </div>
                        {/* Creator names */}
                        <p className="text-sm text-muted-foreground">
                          {collab.creator_ids && collab.creator_ids.length > 0 ? (
                            <>{collab.creator_ids.map((id) => creatorNames[id] || "…").join(" · ")}</>
                          ) : (
                            <span className="italic">No creators assigned yet</span>
                          )}
                        </p>
                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {collab.compensation_type}
                            {collab.fee_amount ? ` · R${collab.fee_amount.toLocaleString("en-ZA")}` : ""}
                          </span>
                          {collab.deliverables && <span>{collab.deliverables}</span>}
                          {collab.go_live_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {formatDate(collab.go_live_date)}
                            </span>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <Button size="sm" variant="outline" onClick={() => openEdit(collab.id)}>
                            Edit
                          </Button>
                          <Button size="sm" className="relative" onClick={() => setManageCollab(collab)}>
                            Manage
                            {(collabsNeedingAttention.has(collab.id) || collabsNeedingShipment.has(collab.id)) && (
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                              </span>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="relative ml-auto"
                            onClick={() => setAssignCollab(collab)}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            <span className="hidden sm:inline">Assign Creator</span>
                            <span className="sm:hidden">Assign</span>
                            {(!collab.creator_ids || collab.creator_ids.length === 0) && (
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                              </span>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </section>
            ))}
          </div>
        )}

        {/* Discount codes live in their own table with store sync, so they get
              their own category section rather than a collab card. */}
        {brand && (
          <section className="space-y-3 pt-2">
            <DiscountCodesPanel
              brandId={brand.id}
              brandName={brand.name || ""}
              heading={
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground">Discount Codes</h2>
                  <p className="text-sm text-muted-foreground">Codes stay in sync with your connected store.</p>
                </div>
              }
              emptyMessage="No discount codes yet. Create one to share with a creator."
            />
          </section>
        )}
      </div>

      {brand && (
        <CollabFormModal
          open={activeModal === "create"}
          onOpenChange={handleModalChange}
          brandId={brand.id}
          brandName={brand.name || ""}
          onCreated={fetchCollabs}
          editingId={editingId}
          initialForm={editingForm}
          existingGiftCampaignId={editingGiftCampaignId}
          lockCommercialTerms={editingHasAccepted}
        />
      )}

      {brand && manageGiftCampaign && (
        <GiftCampaignDetailModal
          open={!!manageGiftCampaign}
          onOpenChange={(o) => !o && setManageGiftCampaign(null)}
          campaign={manageGiftCampaign}
          brandId={brand.id}
          onUpdated={fetchCollabs}
        />
      )}

      {manageCollab && (
        <CollabManageDrawer
          open={!!manageCollab}
          onOpenChange={(o) => {
            if (!o) {
              setManageCollab(null);
              fetchCollabs();
            }
          }}
          collab={manageCollab}
          brandName={brand?.name}
        />
      )}

      {brand && (
        <AssignCreatorModal
          open={!!assignCollab}
          onOpenChange={(o) => !o && setAssignCollab(null)}
          collab={assignCollab}
          brandId={brand.id}
          onAssigned={fetchCollabs}
        />
      )}
    </BrandLayout>
  );
}

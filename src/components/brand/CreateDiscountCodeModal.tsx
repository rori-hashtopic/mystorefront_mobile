import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Info, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildDiscountBriefData, emailCreatorOnDiscountAssigned } from "@/lib/discountEmails";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  brandId: string;
  brandName: string;
}

interface CreatorOption {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  username: string | null;
}

const EMPTY = {
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

export function CreateDiscountCodeModal({ isOpen, onClose, onCreated, brandId, brandName }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [creators, setCreators] = useState<CreatorOption[]>([]);

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!isOpen) return;
    // Every signup gets a profile row, so querying profiles alone would offer up
    // shoppers, brand owners and admins as "creators". Filter by role first.
    const load = async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "creator");
      const ids = (roles || []).map((r: any) => r.user_id);
      if (ids.length === 0) {
        setCreators([]);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, username")
        .in("id", ids)
        .order("display_name");
      if (data) setCreators(data as CreatorOption[]);
    };
    load();
  }, [isOpen]);

  const reset = () => setForm(EMPTY);

  const selectedCreator = creators.find((c) => c.id === form.creatorId) ?? null;

  const defaultMessage = () => {
    const discountText =
      form.discountType === "percentage"
        ? `${form.discountValue}% off`
        : `R${Number(form.discountValue).toFixed(0)} off`;
    return `Your exclusive discount code is ready: ${form.code.trim().toUpperCase()}. Share it with your audience for ${discountText} at ${brandName}.`;
  };

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.discountValue) return;
    setSaving(true);

    // Capture the inserted row id so the message card and the email idempotency
    // key can both point at this specific code.
    const { data: inserted, error } = await supabase
      .from("discount_codes" as any)
      .insert({
        brand_id: brandId,
        code: form.code.trim().toUpperCase(),
        discount_type: form.discountType,
        discount_value: parseFloat(form.discountValue),
        minimum_order_value: form.minOrder ? parseFloat(form.minOrder) : null,
        usage_limit: form.usageLimit ? parseInt(form.usageLimit) : null,
        expiry_date: form.expiryDate || null,
        creator_id: form.creatorId || null,
        notes: form.notes.trim() || null,
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

    if (form.creatorId) {
      await sendDiscountMessage(form.creatorId, discountCodeId);
      // Fire-and-forget: a failed email must not block the success toast.
      await emailCreatorOnDiscountAssigned({
        creatorUserId: form.creatorId,
        discountCodeId,
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        expiryDate: form.expiryDate || null,
        notes: form.notes.trim() || null,
        brandName,
      });
    }

    toast.success("Discount code created.");
    reset();
    onClose();
    onCreated();
    setSaving(false);
  };

  const sendDiscountMessage = async (targetCreatorId: string, discountCodeId: string | null) => {
    try {
      let { data: convo } = await supabase
        .from("conversations")
        .select("id")
        .eq("brand_id", brandId)
        .eq("creator_id", targetCreatorId)
        .maybeSingle();

      if (!convo) {
        const { data: newConvo } = await supabase
          .from("conversations")
          .insert({ brand_id: brandId, creator_id: targetCreatorId })
          .select("id")
          .single();
        convo = newConvo;
      }

      if (!convo) return;

      const messageText = form.customMessage.trim() || defaultMessage();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("messages").insert({
        conversation_id: convo.id,
        sender_id: user!.id,
        content: messageText,
        message_type: "discount_code",
        // Without brief_data ChatView renders this as plain text instead of a
        // DiscountCodeCard, and the creator never gets an Acknowledge button.
        brief_data: buildDiscountBriefData({
          code: form.code.trim().toUpperCase(),
          discountType: form.discountType,
          discountValue: parseFloat(form.discountValue),
          expiryDate: form.expiryDate || null,
          notes: form.notes.trim() || null,
          discountCodeId,
        }),
      });
    } catch (err) {
      console.error("Failed to send discount message:", err);
    }
  };

  const filteredCreators = creators.filter((c) => {
    const s = form.creatorSearch.toLowerCase();
    return !s || c.display_name?.toLowerCase().includes(s) || c.username?.toLowerCase().includes(s);
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Create Discount Code</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex gap-2 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              For complex usage restrictions, create the discount code directly on your store — it will sync here
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
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="e.g. RORI20"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tip: use the creator's name or initials for a personal touch.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Discount Type</Label>
                <Select value={form.discountType} onValueChange={(v) => set("discountType", v)}>
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
                  {form.discountType === "percentage" ? "Discount %" : "Amount off (ZAR)"} *
                </Label>
                <Input
                  type="number"
                  className="mt-1"
                  value={form.discountValue}
                  onChange={(e) => set("discountValue", e.target.value)}
                  placeholder={form.discountType === "percentage" ? "20" : "100"}
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
                  value={form.minOrder}
                  onChange={(e) => set("minOrder", e.target.value)}
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
                  value={form.usageLimit}
                  onChange={(e) => set("usageLimit", e.target.value)}
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
                value={form.expiryDate}
                onChange={(e) => set("expiryDate", e.target.value)}
              />
            </div>
          </section>

          {/* ── Assign to creator ── */}
          <section className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Assign to Creator</p>
            <Input
              placeholder="Search creators..."
              value={form.creatorSearch}
              onChange={(e) => set("creatorSearch", e.target.value)}
            />
            <div className="max-h-36 overflow-y-auto rounded-xl border border-border">
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors ${!form.creatorId ? "bg-secondary font-medium" : ""}`}
                onClick={() => set("creatorId", "")}
              >
                No creator (unassigned)
              </button>
              {filteredCreators.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors flex items-center gap-2 ${form.creatorId === c.id ? "bg-secondary font-medium" : ""}`}
                  onClick={() => set("creatorId", c.id)}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={c.photo_url || undefined} />
                    <AvatarFallback className="text-[8px]">{(c.display_name || "?")[0]}</AvatarFallback>
                  </Avatar>
                  {c.display_name || c.username || "Unknown"}
                </button>
              ))}
            </div>

            {/* Custom message — only shown when a creator is selected */}
            {form.creatorId && (
              <div>
                <Label className="text-xs">Message to Creator</Label>
                <Textarea
                  className="mt-1 min-h-[80px] text-sm"
                  placeholder={defaultMessage()}
                  value={form.customMessage}
                  onChange={(e) => set("customMessage", e.target.value)}
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
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="e.g. For Heritage Day campaign, expires end of month"
              rows={2}
            />
          </section>
        </div>

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!form.code.trim() || !form.discountValue || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

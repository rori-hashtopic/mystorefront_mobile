import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DiscountCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  minimum_order_value: number | null;
  expiry_date: string | null;
  usage_limit: number | null;
  is_active: boolean;
  notes: string | null;
  shopify_price_rule_id?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  code: DiscountCode;
  shopifySettings?: unknown;
}

export function EditDiscountCodeModal({ isOpen, onClose, onUpdated, code, shopifySettings }: Props) {
  const [discountType, setDiscountType] = useState(code.discount_type);
  const [discountValue, setDiscountValue] = useState(String(code.discount_value));
  const [minOrder, setMinOrder] = useState(code.minimum_order_value ? String(code.minimum_order_value) : "");
  const [usageLimit, setUsageLimit] = useState(code.usage_limit ? String(code.usage_limit) : "");
  const [expiryDate, setExpiryDate] = useState(code.expiry_date || "");
  const [isActive, setIsActive] = useState(code.is_active);
  const [notes, setNotes] = useState(code.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!discountValue) return;
    setSaving(true);

    console.log("Updating discount", { id: code.id, needs_sync: true });

    const { data, error } = await supabase.from("discount_codes").update({
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      minimum_order_value: minOrder ? parseFloat(minOrder) : null,
      usage_limit: usageLimit ? parseInt(usageLimit) : null,
      expiry_date: expiryDate || null,
      is_active: isActive,
      notes: notes.trim() || null,
      needs_sync: true,
    }).eq("id", code.id).select();

    console.log("Update result:", data, error);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Discount code updated.");
      onClose();
      onUpdated();
    }
    setSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Discount Code</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Code</label>
            <div className="mt-1">
              <Badge variant="secondary" className="font-mono text-base px-3 py-1">{code.code}</Badge>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Discount Type</label>
            <Select value={discountType} onValueChange={setDiscountType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed_amount">Fixed Amount (R)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              {discountType === "percentage" ? "Discount %" : "Amount off (ZAR)"}
            </label>
            <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} min="0" step="0.01" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Min. order value (ZAR)</label>
            <Input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="Optional" min="0" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Max uses</label>
            <Input type="number" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="Unlimited" min="0" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Expiry Date</label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Status</label>
            <Select value={isActive ? "active" : "inactive"} onValueChange={(v) => setIsActive(v === "active")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Notes (internal)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!discountValue || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

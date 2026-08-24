import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, X, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { DiscountCodeData } from "@/hooks/useMessages";
import { CollabSelector, assignCreatorToCollab } from "./CollabSelector";

interface DiscountCodeComposerProps {
  brandId: string;
  creatorId: string;
  onSend: (data: DiscountCodeData) => void;
  onCancel: () => void;
  sending: boolean;
}

export function DiscountCodeComposer({ brandId, creatorId, onSend, onCancel, sending }: DiscountCodeComposerProps) {
  const [collabId, setCollabId] = useState("none");
  const [codes, setCodes] = useState<any[]>([]);
  const [selectedCodeId, setSelectedCodeId] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!brandId) return;
    // Show unassigned codes AND ones already assigned to this creator. Filtering
    // to unassigned only meant a code created via Paid Collabs with a creator
    // selected could never be sent to that same creator in chat.
    supabase
      .from("discount_codes")
      .select("*")
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .or(`creator_id.is.null,creator_id.eq.${creatorId}`)
      .order("created_at", { ascending: false })
      .then(({ data }) => setCodes(data || []));
  }, [brandId, creatorId]);

  const selectedCode = codes.find((c) => c.id === selectedCodeId);

  const handleSubmit = async () => {
    await assignCreatorToCollab(collabId, creatorId);
    if (useCustom) {
      if (!code.trim() || !discountValue) return;
      onSend({
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        expiry_date: expiryDate || undefined,
        notes: notes.trim() || undefined,
        status: "assigned",
      });
    } else {
      if (!selectedCode) return;
      onSend({
        code: selectedCode.code,
        discount_type: selectedCode.discount_type,
        discount_value: selectedCode.discount_value,
        expiry_date: selectedCode.expiry_date || undefined,
        notes: selectedCode.notes || undefined,
        discount_code_id: selectedCode.id,
        status: "assigned",
      });
    }
  };

  return (
    <div className="border-t border-border bg-secondary/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-semibold text-sm text-foreground">Assign Discount Code</h4>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <CollabSelector brandId={brandId} creatorId={creatorId} value={collabId} onChange={setCollabId} />

      {codes.length > 0 && !useCustom ? (
        <div className="space-y-2">
          <Label className="text-xs">Select Unassigned Code</Label>
          <Select value={selectedCodeId} onValueChange={setSelectedCodeId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a code..." />
            </SelectTrigger>
            <SelectContent>
              {codes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} —{" "}
                  {c.discount_type === "percentage"
                    ? `${c.discount_value}%`
                    : `R${Number(c.discount_value).toFixed(0)}`}{" "}
                  off
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCode && (
            <div className="bg-secondary rounded-lg p-3 text-sm space-y-1">
              <p className="font-mono font-bold text-foreground">{selectedCode.code}</p>
              <p className="text-xs text-muted-foreground">
                {selectedCode.discount_type === "percentage"
                  ? `${selectedCode.discount_value}% off`
                  : `R${Number(selectedCode.discount_value).toFixed(2)} off`}
                {selectedCode.expiry_date && ` · Expires ${selectedCode.expiry_date}`}
              </p>
            </div>
          )}
          <button onClick={() => setUseCustom(true)} className="text-xs text-primary underline">
            Or create a new code
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {codes.length > 0 && (
            <button onClick={() => setUseCustom(false)} className="text-xs text-primary underline">
              ← Select from existing codes
            </button>
          )}
          <div>
            <Label className="text-xs">Code *</Label>
            <Input
              placeholder="e.g. CREATOR20"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="mt-1 font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (R)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Value *</Label>
              <Input
                type="number"
                placeholder={discountType === "percentage" ? "20" : "100"}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Expiry Date</Label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="mt-1" />
          </div>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={sending || (useCustom ? !code.trim() || !discountValue : !selectedCodeId)}
        className="w-full"
        size="sm"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
        Assign Code
      </Button>
    </div>
  );
}

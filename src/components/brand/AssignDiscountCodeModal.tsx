import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildDiscountBriefData, emailCreatorOnDiscountAssigned } from "@/lib/discountEmails";

interface CreatorProfile {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  username: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAssigned: () => void;
  code: { id: string; code: string; creator_id: string | null; discount_type: string; discount_value: number };
  brandId: string;
  brandName: string;
  currentCreator: CreatorProfile | null;
}

export function AssignDiscountCodeModal({
  isOpen,
  onClose,
  onAssigned,
  code,
  brandId,
  brandName,
  currentCreator,
}: Props) {
  const [selectedCreatorId, setSelectedCreatorId] = useState("");
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCreatorId("");
    setSearch("");
    const fetch = async () => {
      // Every signup gets a profile row, so querying profiles alone offers up
      // shoppers, brand owners and admins as "creators". Filter by role first.
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
      if (data) setCreators(data as CreatorProfile[]);
    };
    fetch();
  }, [isOpen]);

  const handleAssign = async () => {
    if (!selectedCreatorId) return;
    setSaving(true);

    // Return expiry/notes on the update so the message card and the email carry
    // the same detail the other assign surfaces send — the `code` prop does not
    // include them, and this avoids a second round trip.
    const { data: updated, error } = await supabase
      .from("discount_codes")
      .update({ creator_id: selectedCreatorId })
      .eq("id", code.id)
      .select("expiry_date, notes")
      .maybeSingle();

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    const expiryDate = (updated as any)?.expiry_date ?? null;
    const notes = (updated as any)?.notes ?? null;

    // Send notification message
    try {
      let { data: convo } = await supabase
        .from("conversations")
        .select("id")
        .eq("brand_id", brandId)
        .eq("creator_id", selectedCreatorId)
        .maybeSingle();

      if (!convo) {
        const { data: newConvo } = await supabase
          .from("conversations")
          .insert({ brand_id: brandId, creator_id: selectedCreatorId })
          .select("id")
          .single();
        convo = newConvo;
      }

      if (convo) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const discountText =
          code.discount_type === "percentage"
            ? `${code.discount_value}% off`
            : `R${Number(code.discount_value).toFixed(0)} off`;

        await supabase.from("messages").insert({
          conversation_id: convo.id,
          sender_id: user!.id,
          content: `Your exclusive discount code is ready: ${code.code}. Share it with your audience for ${discountText} at ${brandName}.`,
          message_type: "discount_code",
          // Without brief_data ChatView renders this as plain text instead of a
          // DiscountCodeCard, and the creator never gets an Acknowledge button.
          brief_data: buildDiscountBriefData({
            code: code.code,
            discountType: code.discount_type,
            discountValue: Number(code.discount_value),
            expiryDate,
            notes,
            discountCodeId: code.id,
          }),
        });
      }
    } catch (err) {
      console.error("Failed to send discount message:", err);
    }

    // Reassignment emails the NEW assignee only — the previous creator is not
    // notified that the code moved away from them.
    await emailCreatorOnDiscountAssigned({
      creatorUserId: selectedCreatorId,
      discountCodeId: code.id,
      code: code.code,
      discountType: code.discount_type,
      discountValue: Number(code.discount_value),
      expiryDate,
      notes,
      brandName,
    });

    toast.success("Code assigned to creator.");
    onClose();
    onAssigned();
    setSaving(false);
  };

  const filtered = creators.filter((c) => {
    const s = search.toLowerCase();
    return !s || c.display_name?.toLowerCase().includes(s) || c.username?.toLowerCase().includes(s);
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Assign Code to Creator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Code:</span>
            <Badge variant="secondary" className="font-mono text-base px-3 py-1">
              {code.code}
            </Badge>
          </div>

          {currentCreator && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This code is currently assigned to{" "}
                <strong>{currentCreator.display_name || currentCreator.username}</strong>. Reassigning will remove it
                from them.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <label className="text-sm font-medium text-foreground">Select Creator</label>
            <Input
              placeholder="Search creators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 mt-1"
            />
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors flex items-center gap-2 ${selectedCreatorId === c.id ? "bg-secondary font-medium" : ""}`}
                  onClick={() => setSelectedCreatorId(c.id)}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={c.photo_url || undefined} />
                    <AvatarFallback className="text-[8px]">{(c.display_name || "?")[0]}</AvatarFallback>
                  </Avatar>
                  {c.display_name || c.username || "Unknown"}
                </button>
              ))}
              {filtered.length === 0 && <p className="text-sm text-muted-foreground p-3">No creators found</p>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedCreatorId || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

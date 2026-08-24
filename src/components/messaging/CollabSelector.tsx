import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Collab {
  id: string;
  title: string;
  compensation_type: string;
  creator_ids: string[] | null;
}

interface CollabSelectorProps {
  brandId: string;
  creatorId: string;
  value: string;
  onChange: (collabId: string) => void;
}

export function CollabSelector({ brandId, creatorId, value, onChange }: CollabSelectorProps) {
  const [collabs, setCollabs] = useState<Collab[]>([]);

  useEffect(() => {
    if (!brandId) return;
    supabase
      .from("paid_collabs" as any)
      .select("id, title, compensation_type, creator_ids")
      .eq("brand_id", brandId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .then(({ data }) => setCollabs((data as unknown as Collab[]) || []));
  }, [brandId]);

  if (collabs.length === 0) return null;

  return (
    <div className="pb-3 border-b border-border mb-1">
      <Label className="text-xs">Link to Paid Collab</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="Select a collab (optional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {collabs.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.title}
              {(c.creator_ids || []).includes(creatorId) ? " ✓" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && value !== "none" && !(collabs.find((c) => c.id === value)?.creator_ids || []).includes(creatorId) && (
        <p className="text-xs text-muted-foreground mt-1">This creator will be added to the collab when you send.</p>
      )}
    </div>
  );
}

export async function assignCreatorToCollab(collabId: string, creatorId: string) {
  if (!collabId || collabId === "none" || !creatorId) return;
  const { data } = await supabase
    .from("paid_collabs" as any)
    .select("creator_ids")
    .eq("id", collabId)
    .single();
  const current = (data as any)?.creator_ids || [];
  if (current.includes(creatorId)) return;
  await supabase
    .from("paid_collabs" as any)
    .update({ creator_ids: [...current, creatorId] })
    .eq("id", collabId);
}

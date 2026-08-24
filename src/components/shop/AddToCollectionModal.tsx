import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Collection } from "@/pages/Shop";

interface AddToCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: { id: string; title: string } | null;
  collections: Collection[];
  /** The creator's existing products — used to count only products that still exist. */
  products?: { id: string }[];
  onSaved?: () => void;
  onCreateCollection?: () => void;
}

export function AddToCollectionModal({
  open,
  onOpenChange,
  product,
  collections,
  products = [],
  onSaved,
  onCreateCollection,
}: AddToCollectionModalProps) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!product) return;
    const current = new Set(collections.filter((c) => c.product_ids?.includes(product.id)).map((c) => c.id));
    setSelected(current);
    setInitial(new Set(current));
  }, [product, collections, open]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    try {
      const toAdd = [...selected].filter((id) => !initial.has(id));
      const toRemove = [...initial].filter((id) => !selected.has(id));

      const updates = [
        ...toAdd.map((id) => {
          const c = collections.find((x) => x.id === id);
          if (!c) return null;
          const ids = Array.from(new Set([...(c.product_ids || []), product.id]));
          return supabase.from("collections").update({ product_ids: ids }).eq("id", id);
        }),
        ...toRemove.map((id) => {
          const c = collections.find((x) => x.id === id);
          if (!c) return null;
          const ids = (c.product_ids || []).filter((p) => p !== product.id);
          return supabase.from("collections").update({ product_ids: ids }).eq("id", id);
        }),
      ].filter(Boolean) as any[];

      if (updates.length === 0) {
        onOpenChange(false);
        return;
      }

      const results = await Promise.all(updates);
      const firstError = results.find((r: any) => r?.error)?.error;
      if (firstError) throw firstError;

      toast({ title: "Collections updated" });
      onSaved?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to update",
        description: error?.message ?? "Please try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Count only products that still exist, so a removed/deleted product no longer
  // inflates the number (product_ids can retain ids of deleted products).
  const existingIds = new Set(products.map((p) => p.id));
  const productCount = (c: Collection) =>
    products.length ? (c.product_ids || []).filter((id) => existingIds.has(id)).length : (c.product_ids || []).length;

  const visible = collections.filter((c) => !c.is_archived);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight">Add to collection</DialogTitle>
          {product && <p className="text-sm text-muted-foreground line-clamp-1">{product.title}</p>}
        </DialogHeader>

        <div className="mt-2 max-h-[55vh] overflow-y-auto -mx-6 px-6">
          {visible.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">You don't have any collections yet.</p>
              {onCreateCollection && (
                <button
                  onClick={() => {
                    onOpenChange(false);
                    onCreateCollection();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-foreground group"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="border-b border-foreground group-hover:border-transparent transition-colors">
                    Create collection
                  </span>
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((c) => {
                const isChecked = selected.has(c.id);
                const wasIn = initial.has(c.id);
                return (
                  <li key={c.id}>
                    <label className="flex items-center justify-between py-3 cursor-pointer">
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox checked={isChecked} onCheckedChange={() => toggle(c.id)} />
                        <div className="min-w-0">
                          <p className="font-display text-base text-foreground truncate">{c.title}</p>
                          <p className="text-xs text-muted-foreground">{productCount(c)} products</p>
                        </div>
                      </div>
                      {wasIn && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                          <Check className="h-3 w-3" /> In
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {visible.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            {onCreateCollection ? (
              <button
                onClick={() => {
                  onOpenChange(false);
                  onCreateCollection();
                }}
                className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-foreground group"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="border-b border-foreground group-hover:border-transparent transition-colors">
                  New collection
                </span>
              </button>
            ) : (
              <span />
            )}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

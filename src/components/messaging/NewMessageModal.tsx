import { useEffect, useMemo, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface CreatorOption {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  username: string | null;
}

interface NewMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (creatorId: string) => void;
}

export function NewMessageModal({ open, onOpenChange, onSelect }: NewMessageModalProps) {
  const [creators, setCreators] = useState<CreatorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: creatorRoles } = await supabase.from("user_roles").select("user_id").eq("role", "creator");
      const ids = (creatorRoles || []).map((r: any) => r.user_id);
      if (ids.length === 0) {
        if (!cancelled) {
          setCreators([]);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, username")
        .in("id", ids)
        .eq("onboarding_completed", true)
        .order("display_name", { ascending: true });
      if (cancelled) return;
      setCreators((data as CreatorOption[]) || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return creators;
    return creators.filter(
      (c) => (c.display_name || "").toLowerCase().includes(q) || (c.username || "").toLowerCase().includes(q),
    );
  }, [creators, query]);

  const handleSelect = (id: string) => {
    onSelect(id);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="font-display text-2xl">New message</DialogTitle>
          <DialogDescription>Pick a creator to start a conversation.</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search creators"
              className="pl-9"
            />
          </div>
        </div>

        <div className="max-h-[360px] overflow-y-auto border-t border-border">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">No creators found.</div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(c.id)}
                    className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-muted transition-colors"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={c.photo_url || undefined} />
                      <AvatarFallback>{(c.display_name || c.username || "?")[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">
                        {c.display_name || c.username || "Creator"}
                      </div>
                      {c.username && <div className="text-xs text-muted-foreground truncate">@{c.username}</div>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

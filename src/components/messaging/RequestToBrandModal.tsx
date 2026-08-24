import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Send, AlertTriangle, X as XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { detectOffPlatform, logModerationFlag, OFF_PLATFORM_WARNING } from "@/lib/moderation";

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  category: string | null;
}

interface RequestToBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendRequest: (brandId: string, message: string) => Promise<{ error: string | null }>;
  existingRequestBrandIds: string[];
}

export function RequestToBrandModal({
  isOpen,
  onClose,
  onSendRequest,
  existingRequestBrandIds,
}: RequestToBrandModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    supabase
      .from("brand_accounts")
      .select("id, name, logo_url, category")
      .eq("status", "approved")
      .order("name")
      .then(({ data }) => {
        setBrands(data || []);
        setLoading(false);
      });
  }, [isOpen]);

  const filtered = brands.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.category || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = async () => {
    if (!selectedBrand || !message.trim()) return;
    const trimmed = message.trim();

    const moderation = detectOffPlatform(trimmed);
    if (moderation.flagged) {
      setModerationWarning(OFF_PLATFORM_WARNING);
      if (user) {
        await logModerationFlag({
          userId: user.id,
          content: trimmed,
          matchedPhrase: moderation.matchedPhrase!,
          context: "brand_request",
        });
      }
      return;
    }

    setSending(true);
    const result = await onSendRequest(selectedBrand.id, trimmed);
    if (result.error) {
      toast({ title: "Failed to send", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Request sent!" });
      setSelectedBrand(null);
      setMessage("");
      setModerationWarning(null);
      onClose();
    }
    setSending(false);
  };

  const handleBack = () => {
    setSelectedBrand(null);
    setMessage("");
    setModerationWarning(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">
            {selectedBrand ? `Message ${selectedBrand.name}` : "Request to Message a Brand"}
          </DialogTitle>
        </DialogHeader>

        {!selectedBrand ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="flex-1 max-h-[400px]">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No brands found</p>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map((brand) => {
                    const alreadyRequested = existingRequestBrandIds.includes(brand.id);
                    return (
                      <button
                        key={brand.id}
                        disabled={alreadyRequested}
                        onClick={() => setSelectedBrand(brand)}
                        className="w-full text-left p-3 hover:bg-secondary/50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={brand.logo_url || undefined} />
                          <AvatarFallback className="text-xs">{brand.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground">{brand.name}</span>
                          {brand.category && (
                            <p className="text-xs text-muted-foreground">{brand.category}</p>
                          )}
                        </div>
                        {alreadyRequested && (
                          <span className="text-xs text-muted-foreground">Requested</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedBrand.logo_url || undefined} />
                <AvatarFallback>{selectedBrand.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{selectedBrand.name}</p>
                {selectedBrand.category && (
                  <p className="text-xs text-muted-foreground">{selectedBrand.category}</p>
                )}
              </div>
            </div>
            <Textarea
              placeholder="Introduce yourself and explain why you'd like to connect with this brand..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (moderationWarning) setModerationWarning(null);
              }}
              rows={4}
              className="resize-none"
            />
            {moderationWarning && (
              <div
                role="alert"
                className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Message blocked</p>
                  <p className="mt-0.5 text-destructive/90">{moderationWarning}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModerationWarning(null)}
                  className="text-destructive/70 hover:text-destructive"
                  aria-label="Dismiss warning"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSend} disabled={!message.trim() || sending} className="flex-1">
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                Send Request
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

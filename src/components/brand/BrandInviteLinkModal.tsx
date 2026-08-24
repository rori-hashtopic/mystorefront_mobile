import { useEffect, useState } from "react";
import { Loader2, Copy, Check, Mail, X, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InviteRow {
  id: string;
  status: "active" | "redeemed" | "revoked" | "expired";
  welcome_message: string | null;
  expires_at: string;
  created_at: string;
  redeemed_at: string | null;
  redeemed_by_name: string | null;
  invited_email: string | null;
  invited_name: string | null;
  email_sent_at: string | null;
}

interface BrandInviteLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function callInvite(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("brand-creator-invite", { body });
  if (error) {
    const ctx = (error as any).context;
    const payload = await ctx
      ?.clone()
      .json()
      .catch(() => null);
    // The function returns a machine-readable `error` plus a human `message`
    // for the cases a brand can act on (already registered, already invited).
    return { data: null, error: payload?.message || payload?.error || error.message };
  }
  if (data?.error) return { data: null, error: (data.message as string) || (data.error as string) };
  return { data, error: null };
}

export function BrandInviteLinkModal({ open, onOpenChange }: BrandInviteLinkModalProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [welcome, setWelcome] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const fetchList = async () => {
    setLoadingList(true);
    const { data } = await callInvite({ action: "list" });
    setInvites((data?.invites as InviteRow[]) || []);
    setLoadingList(false);
  };

  useEffect(() => {
    if (open) {
      fetchList();
      setEmail("");
      setName("");
      setWelcome("");
      setSentTo(null);
      setCurrentUrl(null);
      setShowLink(false);
      setCopied(false);
    }
  }, [open]);

  const emailIsValid = EMAIL_RE.test(email.trim());

  const handleSend = async () => {
    setSending(true);
    const { data, error } = await callInvite({
      action: "create",
      invited_email: email.trim(),
      invited_name: name.trim(),
      welcome_message: welcome,
    });
    setSending(false);
    if (error) {
      toast({ title: "Couldn't send invite", description: error, variant: "destructive" });
      return;
    }
    setSentTo(data.invite.invited_email);
    setCurrentUrl(data.invite.url);
    setEmail("");
    setName("");
    setWelcome("");
    toast({ title: "Invite sent", description: `We've emailed ${data.invite.invited_email}.` });
    fetchList();
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link copied", description: "Share it via WhatsApp, email, or DM." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Select and copy the link manually.", variant: "destructive" });
    }
  };

  const handleRevoke = async (inviteId: string) => {
    const { error } = await callInvite({ action: "revoke", invite_id: inviteId });
    if (error) {
      toast({ title: "Couldn't revoke", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Invite revoked" });
    fetchList();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Invite a creator</DialogTitle>
        </DialogHeader>

        {/* DialogContent is a CSS grid; grid children default to min-width:auto,
            so without min-w-0 long content widens the whole dialog. */}
        <div className="min-w-0 space-y-5">
          <p className="text-sm text-muted-foreground">
            Enter a creator's email and we'll send them the invite. When they accept, they're connected to you
            automatically with your welcome message.
          </p>

          <div className="space-y-2">
            <Label htmlFor="invite-email">Creator email</Label>
            <Input
              id="invite-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="creator@example.com"
            />
            {email.trim().length > 0 && !emailIsValid && (
              <p className="text-xs text-destructive">That doesn't look like a valid email address.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-name">Their name (optional)</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sarah"
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">Personalises the email and labels the invite below.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcome">First message (optional)</Label>
            <Textarea
              id="welcome"
              value={welcome}
              onChange={(e) => setWelcome(e.target.value)}
              placeholder="Hey! We've been following your page and really enjoy what you're creating. Would love to explore a collab if you're open to it."
              rows={3}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-right text-xs text-muted-foreground">{welcome.length} / 1000</p>
          </div>

          <Button onClick={handleSend} disabled={sending || !emailIsValid} className="w-full">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send invite
          </Button>

          {sentTo && (
            <div className="space-y-3 border border-border bg-muted/30 p-4">
              <p className="text-sm text-foreground">
                Invite emailed to <span className="font-medium">{sentTo}</span>.
              </p>
              {currentUrl && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowLink((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform ${showLink ? "rotate-180" : ""}`} />
                    Or share the link yourself
                  </button>
                  {showLink && (
                    <div className="space-y-2">
                      <p className="break-all font-mono text-xs">{currentUrl}</p>
                      <Button size="sm" variant="outline" onClick={() => handleCopy(currentUrl)} className="w-full">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Copied" : "Copy link"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <h3 className="mb-3 text-sm font-medium text-foreground">Sent invites</h3>
            {loadingList ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : invites.length === 0 ? (
              <p className="text-xs text-muted-foreground">No invites yet.</p>
            ) : (
              <ul className="max-h-64 divide-y divide-border overflow-y-auto overflow-x-hidden border border-border">
                {invites.map((inv) => {
                  const recipient = inv.invited_name || inv.invited_email;
                  return (
                    <li key={inv.id} className="flex items-center justify-between gap-3 p-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {inv.status === "redeemed" ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                              ✓ {inv.redeemed_by_name || "Joined"}
                            </Badge>
                          ) : (
                            <Badge variant={inv.status === "active" ? "default" : "secondary"}>{inv.status}</Badge>
                          )}
                          <span className="text-muted-foreground">
                            {new Date(inv.redeemed_at || inv.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {recipient ? (
                          <p className="mt-1 truncate font-medium text-foreground">{recipient}</p>
                        ) : (
                          <p className="mt-1 truncate text-muted-foreground">Shared link</p>
                        )}
                        {inv.invited_name && inv.invited_email && (
                          <p className="truncate text-muted-foreground">{inv.invited_email}</p>
                        )}
                      </div>
                      {inv.status === "active" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRevoke(inv.id)}
                          className="shrink-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                          Revoke
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

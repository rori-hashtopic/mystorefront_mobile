import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Users,
  Download,
  Search,
  Send,
  RotateCw,
  Eye,
  MailX,
  Trash2,
  Bell,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppFooter } from "@/components/layout/AppFooter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Maps a `follower_range` label to its lower-bound follower count.
const getFollowerRangeMin = (range: string | null | undefined): number => {
  if (!range) return 0;
  const r = range.toLowerCase().replace(/[\s,]/g, "");
  if (r.includes("under1000") || r === "<1k" || r.includes("under1k")) return 0;
  if (r.includes("1000-5000") || r.includes("1–5k") || r.includes("1-5k")) return 1000;
  if (r.includes("1–10k") || r.includes("1-10k")) return 1000;
  if (r.includes("5–10k") || r.includes("5-10k") || r.includes("5000-10000")) return 5000;
  if (r.includes("10–25k") || r.includes("10-25k")) return 10000;
  if (r.includes("25–50k") || r.includes("25-50k")) return 25000;
  if (r.includes("50–100k") || r.includes("50-100k")) return 50000;
  if (r.includes("100–250k") || r.includes("100-250k")) return 100000;
  if (r.includes("250k+")) return 250000;
  return 0;
};

const FOLLOWER_FILTER_OPTIONS: { value: string; label: string; minFollowers: number | null }[] = [
  { value: "all", label: "All follower ranges", minFollowers: null },
  { value: "under_1k", label: "Under 1K", minFollowers: 0 },
  { value: "1_5k", label: "1K – 5K", minFollowers: 1000 },
  { value: "5_10k", label: "5K – 10K", minFollowers: 5000 },
  { value: "10_25k", label: "10K – 25K", minFollowers: 10000 },
  { value: "25_50k", label: "25K – 50K", minFollowers: 25000 },
  { value: "50_100k", label: "50K – 100K", minFollowers: 50000 },
  { value: "100_250k", label: "100K – 250K", minFollowers: 100000 },
  { value: "250k_plus", label: "250K+", minFollowers: 250000 },
];

const matchesFollowerFilter = (range: string, filter: string): boolean => {
  if (filter === "all") return true;
  const min = getFollowerRangeMin(range);
  if (filter === "under_1k") return min < 1000;
  if (filter === "1_5k") return min >= 1000 && min < 5000;
  if (filter === "5_10k") return min >= 5000 && min < 10000;
  if (filter === "10_25k") return min >= 10000 && min < 25000;
  if (filter === "25_50k") return min >= 25000 && min < 50000;
  if (filter === "50_100k") return min >= 50000 && min < 100000;
  if (filter === "100_250k") return min >= 100000 && min < 250000;
  if (filter === "250k_plus") return min >= 250000;
  return true;
};

type CreatorWaitlistStatus =
  | "pending_review"
  | "maybe"
  | "invite_sent"
  | "account_created"
  | "expired"
  | "not_accepting";
type CreatorEntrySource = "waitlist" | "application";

interface CreatorWaitlistEntry {
  id: string;
  source: CreatorEntrySource;
  application_id?: string;
  full_name: string;
  email: string;
  social_handle: string;
  primary_platform: string;
  niche: string;
  follower_range: string;
  referral_source: string;
  biggest_challenge: string | null;
  created_at: string;
  status: CreatorWaitlistStatus;
  last_invite_sent_at: string | null;
  invited_user_id: string | null;
  admin_notes: string | null;
}

const statusLabels: Record<CreatorWaitlistStatus, string> = {
  pending_review: "Applied",
  maybe: "Maybe",
  invite_sent: "Invited",
  account_created: "Activated",
  expired: "Expired",
  not_accepting: "Rejected",
};

const statusBadgeClass: Record<CreatorWaitlistStatus, string> = {
  pending_review: "border border-border bg-transparent text-foreground hover:bg-transparent",
  maybe: "bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-100",
  invite_sent: "bg-muted text-foreground hover:bg-muted",
  account_created: "bg-emerald-600 text-white hover:bg-emerald-600",
  expired: "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/10",
  not_accepting: "bg-destructive text-destructive-foreground hover:bg-destructive",
};

const getStatusLabel = (entry: Pick<CreatorWaitlistEntry, "source" | "status">) => {
  return statusLabels[entry.status];
};

const getSourceLabel = (entry: Pick<CreatorWaitlistEntry, "source">) => {
  return entry.source === "application" ? "Application" : "Waitlist";
};

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString() : "—");
const INVITE_COOLDOWN_MS = 65_000;

const getInviteCooldownSeconds = (lastInviteSentAt: string | null, now: number) => {
  if (!lastInviteSentAt) return 0;
  const remaining = INVITE_COOLDOWN_MS - (now - new Date(lastInviteSentAt).getTime());
  return Math.max(0, Math.ceil(remaining / 1000));
};

export default function AdminCreators() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [entries, setEntries] = useState<CreatorWaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [followerFilter, setFollowerFilter] = useState<string>("all");
  const [followerSort, setFollowerSort] = useState<"none" | "asc" | "desc">("none");
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<CreatorWaitlistEntry | null>(null);
  const [now, setNow] = useState(Date.now());
  const [entryToDelete, setEntryToDelete] = useState<CreatorWaitlistEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotesDraft(selectedEntry?.admin_notes ?? "");
  }, [selectedEntry?.id, selectedEntry?.admin_notes]);

  const saveNotes = async () => {
    if (!selectedEntry) return;
    setSavingNotes(true);
    try {
      const table = selectedEntry.source === "application" ? "creator_applications" : "creator_waitlist";
      const id = selectedEntry.source === "application" ? selectedEntry.application_id! : selectedEntry.id;
      const trimmed = notesDraft.trim();
      const { error } = await supabase
        .from(table as any)
        .update({ admin_notes: trimmed.length > 0 ? trimmed.slice(0, 5000) : null } as any)
        .eq("id", id);
      if (error) {
        toast({ title: "Could not save notes", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Notes saved" });
        const nextNotes = trimmed.length > 0 ? trimmed.slice(0, 5000) : null;
        setEntries((prev) => prev.map((e) => (e.id === selectedEntry.id ? { ...e, admin_notes: nextNotes } : e)));
        setSelectedEntry({ ...selectedEntry, admin_notes: nextNotes });
      }
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;
    setDeleting(true);
    try {
      const table = entryToDelete.source === "application" ? "creator_applications" : "creator_waitlist";
      const id = entryToDelete.source === "application" ? entryToDelete.application_id! : entryToDelete.id;
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq("id", id);
      if (error) {
        toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Entry deleted", description: entryToDelete.email });
        setEntryToDelete(null);
        if (selectedEntry?.id === entryToDelete.id) setSelectedEntry(null);
        await fetchEntries();
      }
    } finally {
      setDeleting(false);
    }
  };

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    await supabase.rpc("expire_creator_waitlist_invites");
    const [{ data: waitlistData, error: waitlistError }, { data: applicationData, error: applicationError }] =
      await Promise.all([
        supabase
          .from("creator_waitlist" as any)
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("creator_applications" as any)
          .select("*")
          .order("submitted_at", { ascending: false }),
      ]);

    const error = waitlistError || applicationError;
    if (error) {
      toast({ title: "Could not load creators", description: error.message, variant: "destructive" });
    } else {
      const applicationEmails = new Set(
        (applicationData || []).map((application: any) => String(application.email).toLowerCase()),
      );
      const waitlistByEmail = new Map(
        (waitlistData || []).map((entry: any) => [String(entry.email).toLowerCase(), entry]),
      );
      const waitlistEntries = (waitlistData || [])
        .filter((entry: any) => !applicationEmails.has(String(entry.email).toLowerCase()))
        .map((entry: any) => ({ ...entry, source: "waitlist" as const, admin_notes: entry.admin_notes ?? null }));
      const applicationEntries = (applicationData || []).map((application: any) => {
        const waitlistMatch = waitlistByEmail.get(String(application.email).toLowerCase());

        return {
          id: `application-${application.id}`,
          application_id: application.id,
          source: "application" as const,
          full_name: `${application.first_name} ${application.last_name}`.trim(),
          email: application.email,
          social_handle:
            application.instagram_handle ||
            application.tiktok_handle ||
            application.youtube_handle ||
            application.other_link ||
            "—",
          primary_platform: application.primary_platform,
          niche: application.about_content || "—",
          follower_range: application.follower_range,
          referral_source: "/become-a-creator",
          biggest_challenge: application.about_content,
          created_at: application.submitted_at,
          status:
            application.status === "declined"
              ? "not_accepting"
              : application.status === "approved"
                ? "invite_sent"
                : "pending_review",
          last_invite_sent_at: waitlistMatch?.last_invite_sent_at || null,
          invited_user_id: waitlistMatch?.invited_user_id || null,
          admin_notes: application.admin_notes ?? null,
        };
      });

      setEntries(
        [...waitlistEntries, ...applicationEntries].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );
    }
    setLoading(false);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const results = entries.filter((e) => {
      if (!matchesFollowerFilter(e.follower_range, followerFilter)) return false;
      if (!q) return true;
      return (
        e.full_name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.social_handle.toLowerCase().includes(q) ||
        e.niche.toLowerCase().includes(q) ||
        e.primary_platform.toLowerCase().includes(q) ||
        getStatusLabel(e).toLowerCase().includes(q)
      );
    });
    if (followerSort === "asc") {
      return [...results].sort((a, b) => getFollowerRangeMin(a.follower_range) - getFollowerRangeMin(b.follower_range));
    }
    if (followerSort === "desc") {
      return [...results].sort((a, b) => getFollowerRangeMin(b.follower_range) - getFollowerRangeMin(a.follower_range));
    }
    return results;
  }, [entries, search, followerFilter, followerSort]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role && role !== "admin") navigate("/");
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    if (user && role === "admin") fetchEntries();
  }, [user, role, fetchEntries]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const runAction = async (entry: CreatorWaitlistEntry, action: "send" | "resend" | "regret") => {
    const cooldownSeconds = getInviteCooldownSeconds(entry.last_invite_sent_at, Date.now());
    if ((action === "send" || action === "resend") && cooldownSeconds > 0) {
      toast({ title: "Please wait before resending", description: `Try again in ${cooldownSeconds} seconds.` });
      return;
    }

    setActionId(`${entry.id}-${action}`);
    try {
      const { data, error } = await supabase.functions.invoke("admin-creator-invites", {
        body:
          entry.source === "application"
            ? { action, applicationId: entry.application_id }
            : { action, waitlistId: entry.id },
      });

      if (error || data?.error) {
        let description = data?.error || (error as any)?.message || "Unknown error";
        try {
          const ctx: any = (error as any)?.context;
          if (ctx && typeof ctx.json === "function") {
            const b = await ctx.json();
            description = b?.error || description;
          } else if (ctx && typeof ctx.text === "function") {
            const t = await ctx.text();
            try {
              description = JSON.parse(t)?.error || t || description;
            } catch {
              description = t || description;
            }
          }
        } catch {
          /* noop */
        }
        toast({ title: "Action failed", description, variant: "destructive" });
      } else if ((action === "send" || action === "resend") && data?.status === "account_created") {
        toast({
          title: "Account already activated",
          description: `${entry.email} has already created their account — no new invite was sent. Ask them to sign in at /auth (or use password reset).`,
        });
        await fetchEntries();
      } else {
        if (action === "regret") {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "creator-waitlist-regret",
              recipientEmail: entry.email,
              idempotencyKey: `creator-waitlist-regret-${entry.id}-${Date.now()}`,
              templateData: { firstName: entry.full_name.trim().split(/\s+/)[0] || "there" },
            },
          });
        }
        const title =
          action === "regret" ? "Regret email queued" : action === "resend" ? "Invite resent" : "Invite sent";
        toast({ title, description: entry.email });
        await fetchEntries();
        if (selectedEntry?.id === entry.id) {
          setSelectedEntry({
            ...entry,
            status: action === "regret" ? "not_accepting" : "invite_sent",
            last_invite_sent_at: action === "regret" ? entry.last_invite_sent_at : new Date().toISOString(),
          });
        }
      }
    } finally {
      setActionId(null);
    }
  };

  const runNudge = async (entry: CreatorWaitlistEntry) => {
    setActionId(`${entry.id}-nudge`);
    try {
      const { data, error } = await supabase.functions.invoke("nudge-creator-magic-link", {
        body: { email: entry.email, fullName: entry.full_name },
      });
      if (error) {
        // Try to extract structured error message from the function response
        let description = error.message;
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            description = body?.error || description;
          } else if (ctx && typeof ctx.text === "function") {
            const text = await ctx.text();
            try {
              description = JSON.parse(text)?.error || text || description;
            } catch {
              description = text || description;
            }
          } else if (ctx?.json && typeof ctx.json !== "function") {
            description = ctx.json.error || description;
          }
        } catch {
          /* noop */
        }
        toast({ title: "Nudge failed", description, variant: "destructive" });
      } else if (data?.success) {
        toast({ title: "Nudge sent", description: entry.email });
      } else {
        toast({ title: "Nudge failed", description: data?.error || "Unknown error", variant: "destructive" });
      }
    } finally {
      setActionId(null);
    }
  };

  const renderDetail = (label: string, value: string | null | undefined) => (
    <div className="border-b border-border py-3 last:border-0">
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground break-words">{value || "—"}</p>
    </div>
  );

  const exportCsv = () => {
    const headers = [
      "Name",
      "Email",
      "Handle",
      "Platform",
      "Niche",
      "Followers",
      "Source",
      "Status",
      "Last Invite Sent",
      "Referral",
      "Challenge",
      "Date",
    ];
    const rows = entries.map((e) => [
      e.full_name,
      e.email,
      e.social_handle,
      e.primary_platform,
      e.niche,
      e.follower_range,
      getSourceLabel(e),
      getStatusLabel(e),
      e.last_invite_sent_at || "",
      e.referral_source,
      e.biggest_challenge || "",
      new Date(e.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "creator-waitlist.csv";
    a.click();
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Creator Waitlist</h1>
            <p className="text-muted-foreground">
              {entries.length} creator{entries.length !== 1 ? "s" : ""} signed up via the waitlist.
            </p>
          </div>
          {entries.length > 0 && (
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, handle, niche, status…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={followerFilter} onValueChange={setFollowerFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by followers" />
            </SelectTrigger>
            <SelectContent>
              {FOLLOWER_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={followerSort} onValueChange={(v) => setFollowerSort(v as "none" | "asc" | "desc")}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by followers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sort: Sign-up date</SelectItem>
              <SelectItem value="desc">Sort: Most followers first</SelectItem>
              <SelectItem value="asc">Sort: Fewest followers first</SelectItem>
            </SelectContent>
          </Select>
          {(followerFilter !== "all" || followerSort !== "none" || search) && (
            <button
              onClick={() => {
                setFollowerFilter("all");
                setFollowerSort("none");
                setSearch("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">{search ? "No matches" : "No signups yet"}</h3>
                <p className="text-muted-foreground">
                  {search ? "Try a different search term." : "Creator waitlist submissions will appear here."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Handle</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Niche</TableHead>
                      <TableHead
                        className="cursor-pointer select-none whitespace-nowrap"
                        onClick={() => setFollowerSort((s) => (s === "desc" ? "asc" : s === "asc" ? "none" : "desc"))}
                      >
                        <span className="flex items-center gap-1">
                          Followers
                          {followerSort === "desc" ? (
                            <ArrowDown className="h-3.5 w-3.5" />
                          ) : followerSort === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                          )}
                        </span>
                      </TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last invite sent</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((e) => {
                      const canSend = e.status === "pending_review" || e.status === "expired" || e.status === "maybe";
                      const canResend = e.status === "invite_sent";
                      const canRegret = e.status !== "account_created" && e.status !== "not_accepting";
                      const canNudge = e.status === "invite_sent";
                      const cooldownSeconds = getInviteCooldownSeconds(e.last_invite_sent_at, now);
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">{e.email}</TableCell>
                          <TableCell className="text-muted-foreground text-xs max-w-[220px]">
                            {e.admin_notes ? (
                              <span className="line-clamp-2 whitespace-pre-wrap" title={e.admin_notes}>
                                {e.admin_notes}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </TableCell>
                          <TableCell>{e.social_handle}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{e.primary_platform}</Badge>
                          </TableCell>
                          <TableCell>{e.niche}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{e.follower_range || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getSourceLabel(e)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusBadgeClass[e.status]}>{getStatusLabel(e)}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                            {formatDate(e.last_invite_sent_at)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                            {new Date(e.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              {canSend && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => runAction(e, "send")}
                                  disabled={actionId === `${e.id}-send` || cooldownSeconds > 0}
                                >
                                  {actionId === `${e.id}-send` ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Send className="h-3.5 w-3.5" />
                                  )}
                                  {cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : "Send invite"}
                                </Button>
                              )}
                              {canResend && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => runAction(e, "resend")}
                                  disabled={actionId === `${e.id}-resend` || cooldownSeconds > 0}
                                >
                                  {actionId === `${e.id}-resend` ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <RotateCw className="h-3.5 w-3.5" />
                                  )}
                                  {cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : "Resend invite"}
                                </Button>
                              )}
                              {canNudge && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => runNudge(e)}
                                  disabled={actionId === `${e.id}-nudge`}
                                >
                                  {actionId === `${e.id}-nudge` ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Bell className="h-3.5 w-3.5" />
                                  )}
                                  Nudge
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => setSelectedEntry(e)}>
                                <Eye className="h-3.5 w-3.5" />
                                View profile
                              </Button>
                              {(e.status === "pending_review" || e.status === "maybe") && (
                                <Button
                                  size="sm"
                                  variant={e.status === "maybe" ? "secondary" : "outline"}
                                  onClick={async () => {
                                    const newStatus = e.status === "maybe" ? "pending_review" : "maybe";
                                    const table =
                                      e.source === "application" ? "creator_applications" : "creator_waitlist";
                                    const col = e.source === "application" ? "status" : "status";
                                    const val =
                                      e.source === "application"
                                        ? newStatus === "maybe"
                                          ? "maybe"
                                          : "pending"
                                        : newStatus;
                                    await supabase
                                      .from(table as any)
                                      .update({ [col]: val })
                                      .eq("id", e.source === "application" ? e.application_id : e.id);
                                    await fetchEntries();
                                  }}
                                  className={
                                    e.status === "maybe" ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : ""
                                  }
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  {e.status === "maybe" ? "Maybe ✓" : "Maybe"}
                                </Button>
                              )}
                              {canRegret && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => runAction(e, "regret")}
                                  disabled={actionId === `${e.id}-regret`}
                                >
                                  {actionId === `${e.id}-regret` ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <MailX className="h-3.5 w-3.5" />
                                  )}
                                  Send reject email
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEntryToDelete(e)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={Boolean(selectedEntry)} onOpenChange={(open) => !open && setSelectedEntry(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            {selectedEntry &&
              (() => {
                const canSend = selectedEntry.status === "pending_review" || selectedEntry.status === "expired";
                const canResend = selectedEntry.status === "invite_sent";
                const canRegret =
                  selectedEntry.status !== "account_created" && selectedEntry.status !== "not_accepting";
                const cooldownSeconds = getInviteCooldownSeconds(selectedEntry.last_invite_sent_at, now);

                return (
                  <>
                    <DialogHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
                        <div>
                          <DialogTitle className="font-display text-2xl">{selectedEntry.full_name}</DialogTitle>
                          <DialogDescription>{selectedEntry.email}</DialogDescription>
                        </div>
                        <Badge className={statusBadgeClass[selectedEntry.status]}>
                          {getStatusLabel(selectedEntry)}
                        </Badge>
                      </div>
                    </DialogHeader>

                    <div className="grid gap-x-8 sm:grid-cols-2">
                      {renderDetail("Social handle", selectedEntry.social_handle)}
                      {renderDetail("Primary platform", selectedEntry.primary_platform)}
                      {renderDetail("Niche", selectedEntry.niche)}
                      {renderDetail("Follower range", selectedEntry.follower_range)}
                      {renderDetail("Source", getSourceLabel(selectedEntry))}
                      {renderDetail("Referral source", selectedEntry.referral_source)}
                      {renderDetail("Submitted", new Date(selectedEntry.created_at).toLocaleString())}
                      {renderDetail(
                        "Last invite sent",
                        selectedEntry.last_invite_sent_at
                          ? new Date(selectedEntry.last_invite_sent_at).toLocaleString()
                          : null,
                      )}
                      {renderDetail("Challenge", selectedEntry.biggest_challenge)}
                    </div>

                    <div className="border-t border-border pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                          Admin notes
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={saveNotes}
                          disabled={savingNotes || notesDraft.trim() === (selectedEntry.admin_notes ?? "").trim()}
                        >
                          {savingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save notes"}
                        </Button>
                      </div>
                      <Textarea
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="Private notes about this creator (visible only to admins)…"
                        rows={4}
                        maxLength={5000}
                      />
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                      <div>
                        {selectedEntry.status === "account_created" && selectedEntry.invited_user_id && (
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/admin/users?user=${selectedEntry.invited_user_id}`)}
                          >
                            <Eye className="h-4 w-4" />
                            Open user profile
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        {canRegret && (
                          <Button
                            variant="ghost"
                            onClick={() => runAction(selectedEntry, "regret")}
                            disabled={actionId === `${selectedEntry.id}-regret`}
                          >
                            {actionId === `${selectedEntry.id}-regret` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MailX className="h-4 w-4" />
                            )}
                            Send reject email
                          </Button>
                        )}
                        {canResend && (
                          <Button
                            onClick={() => runAction(selectedEntry, "resend")}
                            disabled={actionId === `${selectedEntry.id}-resend` || cooldownSeconds > 0}
                          >
                            {actionId === `${selectedEntry.id}-resend` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCw className="h-4 w-4" />
                            )}
                            {cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : "Resend magic link"}
                          </Button>
                        )}
                        {canSend && (
                          <Button
                            onClick={() => runAction(selectedEntry, "send")}
                            disabled={actionId === `${selectedEntry.id}-send` || cooldownSeconds > 0}
                          >
                            {actionId === `${selectedEntry.id}-send` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            {cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : "Send magic link"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={Boolean(entryToDelete)}
          onOpenChange={(open) => !open && !deleting && setEntryToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes {entryToDelete?.full_name} ({entryToDelete?.email}) from the{" "}
                {entryToDelete?.source === "application" ? "creator applications" : "creator waitlist"}. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AppFooter />
      </div>
    </AdminLayout>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface AdminPayoutRequest {
  id: string;
  creator_id: string;
  amount: number;
  currency: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  payout_account_id: string;
}

interface CreatorBankInfo {
  bank_name: string | null;
  account_holder: string | null;
  account_number_masked: string | null;
  branch_code: string | null;
  account_type: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function AdminPayouts() {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [requests, setRequests] = useState<AdminPayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [creatorBanks, setCreatorBanks] = useState<Record<string, CreatorBankInfo>>({});
  const [revealedNumbers, setRevealedNumbers] = useState<Record<string, string>>({});
  const [revealing, setRevealing] = useState<string | null>(null);

  const hideAccountNumber = (creatorId: string) => {
    setRevealedNumbers((prev) => {
      const next = { ...prev };
      delete next[creatorId];
      return next;
    });
  };

  /**
   * Decrypts one creator's account number via an admin-only RPC. Kept on-demand
   * on purpose: the numbers are not fetched with the table, so a casual glance
   * at this page does not expose anyone's banking details, and every reveal is
   * recorded in admin_logs by the function itself.
   */
  const revealAccountNumber = async (creatorId: string) => {
    setRevealing(creatorId);
    const { data, error } = await supabase.rpc("get_payout_account_number" as any, {
      p_user_id: creatorId,
    });
    setRevealing(null);

    if (error) {
      toast({ title: "Could not reveal account number", description: error.message, variant: "destructive" });
      return;
    }
    if (!data) {
      toast({
        title: "No account number on file",
        description: "This creator saved their details before secure storage existed. Ask them to re-enter them.",
      });
      return;
    }
    setRevealedNumbers((prev) => ({ ...prev, [creatorId]: data as string }));

    // Auto-hide, so working through a queue doesn't leave a screenful of bank
    // details sitting in the page (and in memory) for the life of the tab.
    window.setTimeout(() => hideAccountNumber(creatorId), 60_000);
  };

  // Match every other admin page: bounce non-admins. The data itself is already
  // protected by RLS (payout_requests is admin-only for SELECT/UPDATE), so this
  // is defence in depth — without it a non-admin loads an admin screen where
  // every action silently fails.
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Covers a null role too (user with no role row), so nobody gets stranded on
  // the loading state below.
  useEffect(() => {
    if (!roleLoading && role !== "admin") navigate("/");
  }, [role, roleLoading, navigate]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("payout_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error:", error);
    } else {
      const reqs = (data as AdminPayoutRequest[]) || [];
      setRequests(reqs);

      // Fetch creator names and bank details
      const creatorIds = [...new Set(reqs.map((r) => r.creator_id))];
      if (creatorIds.length > 0) {
        const [profilesRes, banksRes] = await Promise.all([
          supabase.rpc("get_all_profiles_admin").then((r) => r.data || []),
          supabase
            .from("payout_accounts")
            .select("user_id, bank_name, account_holder, account_number_masked, branch_code, account_type")
            .eq("type", "EFT")
            .in("user_id", creatorIds),
        ]);

        // This lookup returned nothing for months because payout_accounts had no
        // admin RLS policy — and the error was discarded, so the column simply
        // read "Not provided" for every creator. A blocked read and a creator
        // who genuinely hasn't added details must not look identical.
        if (banksRes.error) {
          console.error("AdminPayouts: could not read creator bank details", banksRes.error);
          toast({
            title: "Could not load bank details",
            description: `${banksRes.error.message} — the Bank Details column may show "Not provided" incorrectly.`,
            variant: "destructive",
          });
        }

        const nameMap: Record<string, string> = {};
        for (const p of profilesRes as any[]) {
          nameMap[p.id] = p.display_name || p.email || p.id.slice(0, 8);
        }
        setCreatorNames(nameMap);

        const bankMap: Record<string, CreatorBankInfo> = {};
        for (const b of (banksRes.data || []) as any[]) {
          bankMap[b.user_id] = {
            bank_name: b.bank_name,
            account_holder: b.account_holder,
            account_number_masked: b.account_number_masked,
            branch_code: b.branch_code,
            account_type: b.account_type,
          };
        }
        setCreatorBanks(bankMap);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const updateData: any = {
      status,
      processed_by: user?.id,
      processed_at: new Date().toISOString(),
    };
    if (notes[id]) {
      updateData.admin_note = notes[id];
    }

    const { error } = await supabase.from("payout_requests").update(updateData).eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `Payout marked as ${status}.` });
      fetchRequests();
    }
  };

  // Never paint the admin UI for a non-admin. The redirect above runs in an
  // effect, i.e. AFTER render — without this guard the page flashes on screen
  // for a frame before navigating away.
  if (authLoading || roleLoading || role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminLayout displayName={profile?.display_name || undefined}>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground">Payout Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and process creator payout requests.</p>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Creator</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  Bank Details
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Source</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Note</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No payout requests.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="border-b">
                    <td className="px-4 py-4 text-foreground">{format(new Date(req.created_at), "dd MMM yyyy")}</td>
                    <td className="px-4 py-4 text-foreground text-sm">
                      {creatorNames[req.creator_id] || req.creator_id.slice(0, 8) + "…"}
                    </td>
                    <td className="px-4 py-4">
                      {creatorBanks[req.creator_id] ? (
                        <div className="text-xs space-y-0.5">
                          <p className="text-foreground font-medium">{creatorBanks[req.creator_id].bank_name}</p>
                          <p className="text-muted-foreground">{creatorBanks[req.creator_id].account_holder}</p>
                          <p className="text-muted-foreground font-mono">
                            {creatorBanks[req.creator_id].account_number_masked}
                          </p>
                          {(creatorBanks[req.creator_id].branch_code || creatorBanks[req.creator_id].account_type) && (
                            <p className="text-muted-foreground">
                              {[
                                creatorBanks[req.creator_id].account_type,
                                creatorBanks[req.creator_id].branch_code
                                  ? `Branch ${creatorBanks[req.creator_id].branch_code}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                          {/* Revealed one creator at a time, on demand. Loading
                              every account number into the page just to render a
                              table would put a screenful of bank details on
                              screen — and in memory — for no reason. Each reveal
                              is written to admin_logs by the RPC. */}
                          {revealedNumbers[req.creator_id] ? (
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-foreground">{revealedNumbers[req.creator_id]}</p>
                              <button
                                type="button"
                                onClick={() => hideAccountNumber(req.creator_id)}
                                className="text-muted-foreground hover:underline"
                              >
                                Hide
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => revealAccountNumber(req.creator_id)}
                              disabled={revealing === req.creator_id}
                              className="text-primary hover:underline disabled:opacity-50"
                            >
                              {revealing === req.creator_id ? "Revealing…" : "Reveal full number"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not provided</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-foreground font-medium">R{Number(req.amount).toFixed(2)}</td>
                    <td className="px-4 py-4">
                      <Badge variant="secondary" className={statusColors[req.status] || ""}>
                        {req.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      {req.admin_note && req.admin_note.startsWith("Auto-generated from") ? (
                        <span className="text-xs text-muted-foreground">
                          {req.admin_note.replace("Auto-generated from ", "").split(" — ")[0]}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Manual</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {req.admin_note ? (
                        <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={req.admin_note}>
                          {req.admin_note}
                        </p>
                      ) : req.status === "pending" ? (
                        <Input
                          placeholder="Admin note..."
                          className="h-8 text-xs"
                          value={notes[req.id] || ""}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">–</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {req.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => updateStatus(req.id, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 text-destructive"
                            onClick={() => updateStatus(req.id, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      {req.status === "approved" && (
                        <Button size="sm" className="text-xs h-7" onClick={() => updateStatus(req.id, "paid")}>
                          Mark Paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

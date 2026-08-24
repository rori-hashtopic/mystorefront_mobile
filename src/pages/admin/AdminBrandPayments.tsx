import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Settings2,
  FileText,
  Eye,
  Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

/**
 * Outcome of generateCreatorPayouts. Declared here rather than inferred with
 * `typeof`, because the function is defined after its first caller and a
 * forward type query on a block-scoped const is not reliably allowed.
 */
type PayoutGenerationResult = {
  ok: boolean;
  created: number;
  alreadyExisted: number;
  error?: string;
};

interface BrandPaymentRow {
  id: string;
  brand_id: string;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  proof_of_payment_url: string | null;
  notes: string | null;
  status: string;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  brand_name?: string;
}

interface CommissionRow {
  id: string;
  brand_id: string;
  brand_name: string;
  platform_fee_percent: number;
  creator_payout_percent: number;
}

export default function AdminBrandPayments() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const openProof = async (value: string) => {
    if (/^https?:\/\//i.test(value)) {
      window.open(value, "_blank", "noopener");
      return;
    }
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(value, 60 * 10);
    if (error || !data?.signedUrl) {
      toast({ title: "Couldn't open proof", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const [payments, setPayments] = useState<BrandPaymentRow[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string; commission_percent: number | null }[]>([]);
  const [brandBalances, setBrandBalances] = useState<
    { brand_id: string; brand_name: string; total_commissions: number; total_paid: number; outstanding: number }[]
  >([]);
  const [brandPrompts, setBrandPrompts] = useState<Record<string, { last_sent: string; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Review modal
  const [reviewPayment, setReviewPayment] = useState<BrandPaymentRow | null>(null);
  const [reviewAction, setReviewAction] = useState<string>("");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [creatorPayoutPreview, setCreatorPayoutPreview] = useState<{ name: string; amount: number }[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Commission settings modal
  const [editCommission, setEditCommission] = useState<{ brandId: string; brandName: string } | null>(null);
  const [editPlatformFee, setEditPlatformFee] = useState("");
  const [editCreatorPayout, setEditCreatorPayout] = useState("");
  const [savingCommission, setSavingCommission] = useState(false);

  // Payment prompt modal
  const [promptBrand, setPromptBrand] = useState<{ brandId: string; brandName: string; outstanding: number } | null>(
    null,
  );
  const [promptMessage, setPromptMessage] = useState("");
  const [sendingPrompt, setSendingPrompt] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role !== "admin") navigate("/");
  }, [role, roleLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [brandsRes, paymentsRes, commissionsRes, ordersRes, promptsRes] = await Promise.all([
      supabase.from("brand_accounts").select("id, name, commission_percent").order("name"),
      supabase.from("brand_payments").select("*").order("created_at", { ascending: false }),
      supabase.from("brand_commission_settings").select("*"),
      supabase.from("affiliate_orders").select("brand_id, commission_amount, status"),
      supabase
        .from("payment_prompts" as any)
        .select("brand_id, created_at")
        .order("created_at", { ascending: false }),
    ]);

    const brandsData = brandsRes.data || [];
    setBrands(brandsData);

    const paymentsData = (paymentsRes.data || []) as BrandPaymentRow[];

    // Enrich payments with brand name
    const enrichedPayments = paymentsData.map((p: any) => ({
      ...p,
      brand_name: brandsData.find((b) => b.id === p.brand_id)?.name || "Unknown",
    }));
    setPayments(enrichedPayments);

    // Enrich commissions with brand name
    const enrichedCommissions = (commissionsRes.data || []).map((c: any) => ({
      ...c,
      brand_name: brandsData.find((b) => b.id === c.brand_id)?.name || "Unknown",
    }));
    setCommissions(enrichedCommissions);

    // Calculate outstanding balances per brand
    const orders = ordersRes.data || [];
    const balances = brandsData.map((brand) => {
      const brandOrders = orders.filter((o: any) => o.brand_id === brand.id);
      const totalCommissions = brandOrders
        .filter((o: any) => o.status === "confirmed" || o.status === "pending")
        .reduce((sum: number, o: any) => sum + Number(o.commission_amount || 0), 0);
      const totalPaid = paymentsData
        .filter((p) => p.brand_id === brand.id && p.status === "verified")
        .reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        brand_id: brand.id,
        brand_name: brand.name,
        total_commissions: totalCommissions,
        total_paid: totalPaid,
        outstanding: Math.max(0, totalCommissions - totalPaid),
      };
    });
    setBrandBalances(balances);

    // Build prompt history per brand
    const promptHistory: Record<string, { last_sent: string; count: number }> = {};
    for (const p of (promptsRes.data || []) as any[]) {
      if (!promptHistory[p.brand_id]) {
        promptHistory[p.brand_id] = { last_sent: p.created_at, count: 1 };
      } else {
        promptHistory[p.brand_id].count += 1;
      }
    }
    setBrandPrompts(promptHistory);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user && role === "admin") fetchData();
  }, [user, role, fetchData]);

  useEffect(() => {
    if (!reviewPayment) {
      setCreatorPayoutPreview([]);
      return;
    }
    const fetchPreview = async () => {
      setLoadingPreview(true);
      const { data: orders } = await supabase
        .from("affiliate_orders")
        .select("creator_id, commission_amount")
        .eq("brand_id", reviewPayment.brand_id)
        .in("status", ["confirmed", "pending"])
        .gte("created_at", reviewPayment.period_start)
        // Must match generateCreatorPayouts exactly. period_end is a DATE, so
        // comparing a timestamptz against it bare means "<= midnight on the last
        // day" — silently excluding everything that happened on the final day of
        // the period. The admin would then approve against a preview showing
        // less than what actually gets generated.
        .lte("created_at", reviewPayment.period_end + "T23:59:59");

      // Group by creator, calculate 80% share
      const totals: Record<string, number> = {};
      for (const o of (orders as any[]) || []) {
        if (!o.creator_id) continue;
        totals[o.creator_id] = (totals[o.creator_id] || 0) + Number(o.commission_amount || 0) * 0.8;
      }

      // Paid collab fees — mirrors generateCreatorPayouts exactly. Kept in step
      // deliberately: the admin approves against this preview, so any difference
      // between the two means they approved a number that never gets paid.
      const { data: feeCollabs } = await supabase
        .from("paid_collabs")
        .select("id, fee_amount")
        .eq("brand_id", reviewPayment.brand_id)
        .not("fee_amount", "is", null);

      if (feeCollabs && feeCollabs.length > 0) {
        const feeByCollabId = new Map<string, number>(
          (feeCollabs as any[]).map((c) => [c.id as string, Number(c.fee_amount)]),
        );
        const { data: liveParticipants } = await supabase
          .from("paid_collab_participants" as any)
          .select("collab_id, creator_id, verified_live_at")
          .in("collab_id", Array.from(feeByCollabId.keys()))
          .not("verified_live_at", "is", null)
          .gte("verified_live_at", reviewPayment.period_start)
          .lte("verified_live_at", reviewPayment.period_end + "T23:59:59");

        for (const p of (liveParticipants as any[]) || []) {
          const fee = feeByCollabId.get(p.collab_id);
          if (!fee || !p.creator_id) continue;
          totals[p.creator_id] = (totals[p.creator_id] || 0) + fee;
        }
      }

      // Resolve names from profiles
      const ids = Object.keys(totals);
      if (ids.length === 0) {
        setCreatorPayoutPreview([]);
        setLoadingPreview(false);
        return;
      }
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, username").in("id", ids);

      const nameMap: Record<string, string> = {};
      for (const p of (profiles || []) as any[]) {
        nameMap[p.id] = p.display_name || p.username || p.id.slice(0, 8);
      }

      const preview = Object.entries(totals)
        .filter(([, amount]) => amount > 0)
        .map(([id, amount]) => ({ name: nameMap[id] || id.slice(0, 8), amount: Math.round(amount * 100) / 100 }))
        .sort((a, b) => b.amount - a.amount);

      setCreatorPayoutPreview(preview);
      setLoadingPreview(false);
    };
    fetchPreview();
  }, [reviewPayment]);

  const handleReview = async () => {
    if (!reviewPayment || !reviewAction || !user) return;
    setReviewing(true);

    const { error } = await supabase
      .from("brand_payments")
      .update({
        status: reviewAction as any,
        admin_note: reviewNote || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reviewPayment.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setReviewing(false);
      return;
    }

    // Auto-generate creator payouts when verified. The payment itself is
    // already marked verified above and that is correct — but if the payouts
    // fail, say so loudly rather than claiming they were generated. Creators
    // being silently owed money with no record is the whole bug being fixed.
    let payoutResult: PayoutGenerationResult | null = null;
    if (reviewAction === "verified") {
      payoutResult = await generateCreatorPayouts(reviewPayment);
    }

    if (payoutResult && !payoutResult.ok) {
      toast({
        title: "Payment verified — but creator payouts FAILED",
        description: `${payoutResult.error} — ${reviewPayment.brand_name}, ${reviewPayment.period_start} to ${reviewPayment.period_end}. Use "Generate Payouts" on this payment to retry.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: `Payment ${reviewAction === "verified" ? "verified" : "rejected"}`,
        description:
          reviewAction === "verified"
            ? payoutResult
              ? `${payoutResult.created} creator payout${payoutResult.created === 1 ? "" : "s"} generated.`
              : undefined
            : undefined,
      });
    }
    setReviewPayment(null);
    setReviewNote("");
    setReviewAction("");
    fetchData();
    setReviewing(false);
  };

  /**
   * Creates the payout_requests rows a verified brand payment owes to creators.
   *
   * Returns a result so the caller can tell the truth. It previously returned
   * void and swallowed both its read and its write errors, so both call sites
   * announced "creator payouts generated" no matter what happened — and every
   * insert was in fact failing on payout_account_id NOT NULL, so not one payout
   * row had ever been created.
   */
  const generateCreatorPayouts = async (payment: BrandPaymentRow): Promise<PayoutGenerationResult> => {
    // A failed read returns undefined, which is indistinguishable from "this
    // brand had no sales" — and silently produced zero payouts under a success
    // message. Capture it.
    const { data: orders, error: ordersError } = await supabase
      .from("affiliate_orders")
      // link_id was in this select and does not exist on affiliate_orders (the
      // column is click_id) — so this read failed with "column does not exist"
      // on every single call. The error was discarded, `orders` came back
      // undefined, and the function returned silently, which is the real reason
      // no payout has ever been generated. Nothing here used link_id anyway.
      .select("creator_id, commission_amount")
      .eq("brand_id", payment.brand_id)
      .in("status", ["confirmed", "pending"])
      .gte("created_at", payment.period_start)
      .lte("created_at", payment.period_end + "T23:59:59");

    if (ordersError) {
      console.error("generateCreatorPayouts: could not read affiliate orders", ordersError);
      return {
        ok: false,
        created: 0,
        alreadyExisted: 0,
        error: `Could not read this brand's orders: ${ordersError.message}`,
      };
    }

    // NOTE: no early return on empty orders any more — a brand can owe a creator
    // a paid-collab fee in a period with no affiliate sales at all, and that fee
    // was still billed to them. Returning here skipped those creators entirely.

    // Group by creator and sum their 80% share
    const creatorTotals: Record<string, number> = {};
    for (const order of (orders as any[]) || []) {
      if (!order.creator_id) continue;
      const creatorShare = Number(order.commission_amount || 0) * 0.8;
      creatorTotals[order.creator_id] = (creatorTotals[order.creator_id] || 0) + creatorShare;
    }

    // ── Paid collab fees ────────────────────────────────────────────────────
    // Previously omitted entirely, so a creator who completed a paid collab was
    // billed to the brand and never paid. Basis must match the brand's invoice
    // exactly (BrandPayments groups collab fees by the MONTH of verified_live_at
    // and bills the full fee_amount) or we would pay out something never billed.
    // No platform cut is applied: every creator-facing screen shows them the
    // full fee, so taking a percentage here would make that a lie.
    const { data: feeCollabs, error: feeCollabsError } = await supabase
      .from("paid_collabs")
      .select("id, fee_amount")
      .eq("brand_id", payment.brand_id)
      .not("fee_amount", "is", null);

    if (feeCollabsError) {
      console.error("generateCreatorPayouts: could not read paid collabs", feeCollabsError);
      return {
        ok: false,
        created: 0,
        alreadyExisted: 0,
        error: `Could not read this brand's paid collabs: ${feeCollabsError.message}`,
      };
    }

    if (feeCollabs && feeCollabs.length > 0) {
      const feeByCollabId = new Map<string, number>(
        (feeCollabs as any[]).map((c) => [c.id as string, Number(c.fee_amount)]),
      );

      const { data: liveParticipants, error: participantsError } = await supabase
        .from("paid_collab_participants" as any)
        .select("collab_id, creator_id, verified_live_at")
        .in("collab_id", Array.from(feeByCollabId.keys()))
        .not("verified_live_at", "is", null)
        .gte("verified_live_at", payment.period_start)
        .lte("verified_live_at", payment.period_end + "T23:59:59");

      if (participantsError) {
        console.error("generateCreatorPayouts: could not read collab participants", participantsError);
        return {
          ok: false,
          created: 0,
          alreadyExisted: 0,
          error: `Could not read this brand's collab participants: ${participantsError.message}`,
        };
      }

      for (const p of (liveParticipants as any[]) || []) {
        const fee = feeByCollabId.get(p.collab_id);
        if (!fee || !p.creator_id) continue;
        creatorTotals[p.creator_id] = (creatorTotals[p.creator_id] || 0) + fee;
      }
    }

    // Which creators already have a payout from THIS brand payment? Checking
    // first — rather than blind-inserting or upserting — makes re-running safe
    // without ever touching a row that has since been approved or paid.
    // The "Generate Payouts" button on an already-verified payment would
    // otherwise create a second full set for the same period.
    // `as any` because src/integrations/supabase/types.ts is generated from the
    // schema and does not yet know about brand_payment_id. Same escape hatch the
    // rest of the codebase uses for tables added after the last type gen.
    const { data: existing, error: existingError } = await (supabase.from("payout_requests") as any)
      .select("creator_id")
      .eq("brand_payment_id", payment.id);

    if (existingError) {
      console.error("generateCreatorPayouts: could not read existing payouts", existingError);
      return {
        ok: false,
        created: 0,
        alreadyExisted: 0,
        error: `Could not check for existing payouts: ${existingError.message}`,
      };
    }

    const alreadyPaidOut = new Set((existing || []).map((r: any) => r.creator_id));

    const payoutInserts = Object.entries(creatorTotals)
      .filter(([creatorId, amount]) => amount > 0 && !alreadyPaidOut.has(creatorId))
      .map(([creatorId, amount]) => ({
        creator_id: creatorId,
        amount: Math.round(amount * 100) / 100,
        currency: "ZAR",
        status: "pending" as const,
        admin_note: `Auto-generated from ${payment.brand_name} payment — ${new Date(payment.period_start).toLocaleString("en-ZA", { month: "long", year: "numeric" })}`,
        // Deliberately null. The Payouts screen resolves banking details from
        // the creator directly and never reads this column, so requiring it
        // would mean a creator who hasn't filled in their bank form yet gets no
        // payout row at all — silently under-recording money genuinely owed.
        payout_account_id: null,
        brand_payment_id: payment.id,
      }));

    const alreadyExisted = Object.keys(creatorTotals).filter((id) => alreadyPaidOut.has(id)).length;

    if (payoutInserts.length === 0) {
      return { ok: true, created: 0, alreadyExisted };
    }

    // Same reason as the select above: the generated types still declare
    // payout_account_id as a required string and have no brand_payment_id.
    const { error: insertError } = await (supabase.from("payout_requests") as any).insert(payoutInserts);
    if (insertError) {
      console.error("generateCreatorPayouts: payout insert failed", insertError);
      return {
        ok: false,
        created: 0,
        alreadyExisted,
        error: `Creator payouts could not be created: ${insertError.message}`,
      };
    }

    return { ok: true, created: payoutInserts.length, alreadyExisted };
  };

  const handleSaveCommission = async () => {
    if (!editCommission) return;
    setSavingCommission(true);

    const { error } = await supabase.from("brand_commission_settings").upsert(
      {
        brand_id: editCommission.brandId,
        platform_fee_percent: parseFloat(editPlatformFee) || 5,
        creator_payout_percent: parseFloat(editCreatorPayout) || 10,
      },
      { onConflict: "brand_id" },
    );

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Commission settings saved" });
      setEditCommission(null);
      fetchData();
    }
    setSavingCommission(false);
  };

  const handleSendPrompt = async () => {
    if (!promptBrand || !user) return;
    setSendingPrompt(true);

    const { error } = await supabase.from("payment_prompts" as any).insert({
      brand_id: promptBrand.brandId,
      amount_due: promptBrand.outstanding,
      message: promptMessage || "You have an outstanding balance. Please submit your EFT payment.",
      period_start: null,
      period_end: null,
      sent_by: user.id,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Payment prompt sent",
        description: `${promptBrand.brandName} will see the prompt on their Payments page.`,
      });
      setPromptBrand(null);
      setPromptMessage("");
      fetchData();
    }
    setSendingPrompt(false);
  };

  const filteredPayments = statusFilter === "all" ? payments : payments.filter((p) => p.status === statusFilter);

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    pending: { icon: Clock, color: "text-amber-600", label: "Pending" },
    under_review: { icon: AlertCircle, color: "text-blue-600", label: "Under Review" },
    verified: { icon: CheckCircle, color: "text-emerald-600", label: "Verified" },
    rejected: { icon: XCircle, color: "text-destructive", label: "Rejected" },
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
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Brand Payments</h1>
          <p className="text-muted-foreground">Review brand EFT payments and manage commission settings.</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-1">Pending Review</p>
              <p className="text-2xl font-bold text-foreground">
                {payments.filter((p) => p.status === "under_review" || p.status === "pending").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-1">Verified Total</p>
              <p className="text-2xl font-bold text-foreground">
                R
                {payments
                  .filter((p) => p.status === "verified")
                  .reduce((s, p) => s + Number(p.amount), 0)
                  .toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-1">Total Outstanding</p>
              <p className="text-2xl font-bold text-foreground">
                R{brandBalances.reduce((s, b) => s + b.outstanding, 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-1">Total Brands</p>
              <p className="text-2xl font-bold text-foreground">{brands.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Outstanding Balances by Brand */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Outstanding Balances by Brand</CardTitle>
          </CardHeader>
          <CardContent>
            {brandBalances.filter((b) => b.total_commissions > 0 || b.outstanding > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No commission data yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Total Commissions</TableHead>
                    <TableHead>Verified Payments</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Prompted</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brandBalances
                    .filter((b) => b.total_commissions > 0 || b.outstanding > 0)
                    .sort((a, b) => b.outstanding - a.outstanding)
                    .map((b) => (
                      <TableRow key={b.brand_id}>
                        <TableCell className="font-medium">{b.brand_name}</TableCell>
                        <TableCell>R{b.total_commissions.toFixed(2)}</TableCell>
                        <TableCell>R{b.total_paid.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">R{b.outstanding.toFixed(2)}</TableCell>
                        <TableCell>
                          {b.outstanding === 0 ? (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="text-sm">Paid up</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                              <span className="text-sm">Owes R{b.outstanding.toFixed(2)}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const history = brandPrompts[b.brand_id];
                            if (!history) return <span className="text-xs text-muted-foreground">Never</span>;
                            const daysSince = Math.floor(
                              (Date.now() - new Date(history.last_sent).getTime()) / (1000 * 60 * 60 * 24),
                            );
                            return (
                              <div>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(history.last_sent), "dd MMM yyyy")}
                                </span>
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({history.count}× sent{daysSince === 0 ? ", today" : `, ${daysSince}d ago`})
                                </span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {b.outstanding > 0 &&
                            (() => {
                              const history = brandPrompts[b.brand_id];
                              const recentlySent =
                                history && Date.now() - new Date(history.last_sent).getTime() < 7 * 24 * 60 * 60 * 1000;
                              return (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  disabled={!!recentlySent}
                                  title={recentlySent ? "Prompt already sent within the last 7 days" : ""}
                                  onClick={() => {
                                    setPromptBrand({
                                      brandId: b.brand_id,
                                      brandName: b.brand_name,
                                      outstanding: b.outstanding,
                                    });
                                    setPromptMessage(
                                      `You have an outstanding balance of R${b.outstanding.toFixed(2)}. Please submit your EFT payment as soon as possible.`,
                                    );
                                  }}
                                >
                                  <Send className="h-3.5 w-3.5 mr-1" />
                                  {recentlySent ? "Prompted" : "Prompt"}
                                </Button>
                              );
                            })()}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display">Commission Settings by Brand</CardTitle>
          </CardHeader>
          <CardContent>
            {brands.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No brands yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Brand Commission %</TableHead>
                    <TableHead>Platform Fee %</TableHead>
                    <TableHead>Creator Payout %</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brands.map((brand) => {
                    const c = commissions.find((cs) => cs.brand_id === brand.id);
                    const brandRate = brand.commission_percent;
                    return (
                      <TableRow key={brand.id}>
                        <TableCell className="font-medium">{brand.name}</TableCell>
                        <TableCell>
                          {brandRate != null ? `${brandRate}%` : <span className="text-muted-foreground">Not set</span>}
                        </TableCell>
                        <TableCell>
                          {c ? `${c.platform_fee_percent}%` : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {c ? `${c.creator_payout_percent}%` : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              setEditCommission({ brandId: brand.id, brandName: brand.name });
                              setEditPlatformFee(String(c?.platform_fee_percent ?? 5));
                              setEditCreatorPayout(String(c?.creator_payout_percent ?? brandRate ?? 10));
                            }}
                          >
                            <Settings2 className="h-3.5 w-3.5 mr-1" />
                            Configure
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display">Payment Submissions</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No payments found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Proof</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => {
                    const config = statusConfig[payment.status] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.brand_name}</TableCell>
                        <TableCell className="text-sm">{format(new Date(payment.created_at), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-sm">{format(new Date(payment.period_start), "MMMM yyyy")}</TableCell>
                        <TableCell className="font-medium">R{Number(payment.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          {payment.proof_of_payment_url ? (
                            <button
                              onClick={() => openProof(payment.proof_of_payment_url!)}
                              className="text-xs underline text-foreground"
                            >
                              View
                            </button>
                          ) : (
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
                              No Proof Uploaded
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className={`h-3.5 w-3.5 ${config.color}`} />
                            <span className="text-sm">{config.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(payment.status === "pending" || payment.status === "under_review") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                setReviewPayment(payment);
                                setReviewAction("");
                                setReviewNote("");
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Review
                            </Button>
                          )}
                          {payment.status === "verified" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={async () => {
                                const res = await generateCreatorPayouts(payment);
                                if (!res.ok) {
                                  toast({
                                    title: "Creator payouts failed",
                                    description: res.error,
                                    variant: "destructive",
                                  });
                                } else if (res.created === 0 && res.alreadyExisted > 0) {
                                  // Safe to press twice — this is the guard working, not a failure.
                                  toast({
                                    title: "Already generated",
                                    description: `${res.alreadyExisted} creator payout${res.alreadyExisted === 1 ? " was" : "s were"} already created for this payment.`,
                                  });
                                } else if (res.created === 0) {
                                  toast({
                                    title: "No payouts to generate",
                                    description: "No commissionable orders were found for this brand in that period.",
                                  });
                                } else {
                                  toast({
                                    title: `${res.created} creator payout${res.created === 1 ? "" : "s"} generated`,
                                    description: "Check the Payouts tab.",
                                  });
                                }
                                fetchData();
                              }}
                            >
                              Generate Payouts
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Payment Modal */}
      <Dialog open={!!reviewPayment} onOpenChange={(open) => !open && setReviewPayment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Review Payment</DialogTitle>
          </DialogHeader>
          {reviewPayment && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Brand:</span>{" "}
                  <span className="font-medium">{reviewPayment.brand_name}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Amount:</span>{" "}
                  <span className="font-medium">R{Number(reviewPayment.amount).toFixed(2)}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Period:</span>{" "}
                  {format(new Date(reviewPayment.period_start), "MMMM yyyy")}
                </p>
                {reviewPayment.notes && (
                  <p>
                    <span className="text-muted-foreground">Brand notes:</span> {reviewPayment.notes}
                  </p>
                )}
                {reviewPayment.proof_of_payment_url && (
                  <button
                    onClick={() => openProof(reviewPayment.proof_of_payment_url!)}
                    className="underline text-foreground inline-flex items-center gap-1"
                  >
                    <FileText className="h-3.5 w-3.5" /> View Proof
                  </button>
                )}
              </div>
              {/* Creator payout preview */}
              <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Creator Payouts to be Generated
                </p>
                {loadingPreview ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Calculating...
                  </div>
                ) : creatorPayoutPreview.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No creator earnings found for this period.</p>
                ) : (
                  <>
                    {creatorPayoutPreview.map((c) => (
                      <div key={c.name} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{c.name}</span>
                        <span className="font-medium text-foreground">R{c.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-border pt-2 mt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total to creators</span>
                        <span className="font-medium">
                          R{creatorPayoutPreview.reduce((s, c) => s + c.amount, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Decision</label>
                <div className="flex gap-2 mt-1">
                  <Button
                    size="sm"
                    variant={reviewAction === "verified" ? "default" : "outline"}
                    onClick={() => setReviewAction("verified")}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Verify
                  </Button>
                  <Button
                    size="sm"
                    variant={reviewAction === "rejected" ? "destructive" : "outline"}
                    onClick={() => setReviewAction("rejected")}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Admin Note (optional)</label>
                <Textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={2}
                  placeholder="Reason for decision..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewPayment(null)}>
              Cancel
            </Button>
            <Button onClick={handleReview} disabled={reviewing || !reviewAction}>
              {reviewing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Prompt Modal */}
      <Dialog open={!!promptBrand} onOpenChange={(open) => !open && setPromptBrand(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Send Payment Prompt</DialogTitle>
          </DialogHeader>
          {promptBrand && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Send a payment prompt to <span className="font-medium text-foreground">{promptBrand.brandName}</span>.
                They owe <span className="font-medium text-foreground">R{promptBrand.outstanding.toFixed(2)}</span>.
              </p>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={promptMessage}
                  onChange={(e) => setPromptMessage(e.target.value)}
                  rows={3}
                  placeholder="Payment reminder message..."
                />
              </div>
              <div className="rounded-md border bg-muted/50 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outstanding Invoice</p>
                <p className="text-sm font-medium">
                  {format(new Date(), "MMMM yyyy")} —{" "}
                  <span className="text-foreground">R{promptBrand.outstanding.toFixed(2)}</span>
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromptBrand(null)}>
              Cancel
            </Button>
            <Button onClick={handleSendPrompt} disabled={sendingPrompt}>
              {sendingPrompt && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Send className="h-4 w-4 mr-1" />
              Send Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commission Settings Modal */}
      <Dialog open={!!editCommission} onOpenChange={(open) => !open && setEditCommission(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Commission Settings</DialogTitle>
          </DialogHeader>
          {editCommission && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure commission split for{" "}
                <span className="font-medium text-foreground">{editCommission.brandName}</span>
              </p>
              <div>
                <label className="text-sm font-medium">Platform Fee (%)</label>
                <Input
                  type="number"
                  value={editPlatformFee}
                  onChange={(e) => setEditPlatformFee(e.target.value)}
                  min="0"
                  max="100"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground mt-1">% of order total kept by platform</p>
              </div>
              <div>
                <label className="text-sm font-medium">Creator Payout (%)</label>
                <Input
                  type="number"
                  value={editCreatorPayout}
                  onChange={(e) => setEditCreatorPayout(e.target.value)}
                  min="0"
                  max="100"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground mt-1">% of order total paid to creator</p>
              </div>
              <div className="bg-secondary rounded-xl p-3">
                <p className="text-sm font-medium">
                  Total brand commission:{" "}
                  {((parseFloat(editPlatformFee) || 0) + (parseFloat(editCreatorPayout) || 0)).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  The brand pays this total % on each order. You keep {editPlatformFee || 0}%, creators get{" "}
                  {editCreatorPayout || 0}%.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCommission(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCommission} disabled={savingCommission}>
              {savingCommission && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

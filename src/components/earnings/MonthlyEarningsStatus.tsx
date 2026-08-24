import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, endOfMonth, addDays, isBefore } from "date-fns";
import { Loader2, Clock, CheckCircle2, ArrowRightCircle, ShieldCheck, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";

interface MonthGroup {
  monthKey: string; // "2026-01"
  monthLabel: string; // "January 2026"
  totalCommission: number;
  currency: string;
  brandId: string;
  brandName: string;
  refundBufferDays: number;
  bufferEndDate: Date;
  brandPaymentVerified: boolean;
  creatorPaid: boolean;
}

export function MonthlyEarningsStatus() {
  const { user } = useAuth();
  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch all commission orders for this creator
      const { data: orders } = await (supabase.from("affiliate_orders") as any)
        .select("id, brand_id, commission_amount, currency, created_at, status")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (!orders || orders.length === 0) {
        setMonthGroups([]);
        setLoading(false);
        return;
      }

      // Get unique brand IDs
      const brandIds = [...new Set((orders as any[]).map((o: any) => o.brand_id))] as string[];

      // Fetch brand info (name + refund_buffer_days)
      const { data: brands } = await (supabase.from("brand_accounts") as any)
        .select("id, name, refund_buffer_days")
        .in("id", brandIds);

      const brandMap: Record<string, { name: string; refundBufferDays: number }> = {};
      for (const b of (brands || []) as any[]) {
        brandMap[b.id] = { name: b.name, refundBufferDays: b.refund_buffer_days ?? 30 };
      }

      // Fetch brand payments for these brands
      const { data: brandPayments } = await (supabase.from("brand_payments") as any)
        .select("brand_id, period_start, period_end, status")
        .in("brand_id", brandIds);

      // Fetch payout requests for this creator
      const { data: payoutReqs } = await (supabase.from("payout_requests") as any)
        .select("amount, status, created_at")
        .eq("creator_id", user.id)
        .eq("status", "paid");

      const totalPaid = (payoutReqs || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);

      // Group orders by brand + month
      const groupMap: Record<string, { totalCommission: number; currency: string; brandId: string }> = {};
      for (const order of orders as any[]) {
        const d = new Date(order.created_at);
        const monthKey = `${order.brand_id}__${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!groupMap[monthKey]) {
          groupMap[monthKey] = { totalCommission: 0, currency: order.currency || "ZAR", brandId: order.brand_id };
        }
        groupMap[monthKey].totalCommission += Number(order.commission_amount || 0);
      }

      // Build month groups
      const groups: MonthGroup[] = [];
      const now = new Date();

      for (const [key, val] of Object.entries(groupMap)) {
        const [brandId, yearMonth] = key.split("__");
        const [year, month] = yearMonth.split("-").map(Number);
        const brand = brandMap[brandId];
        if (!brand) continue;

        const monthEnd = endOfMonth(new Date(year, month - 1));
        const bufferEndDate = addDays(monthEnd, brand.refundBufferDays);

        // Check if brand payment for this month is verified
        const matchingPayment = (brandPayments || []).find((bp: any) => {
          const pStart = new Date(bp.period_start);
          const pEnd = new Date(bp.period_end);
          return bp.brand_id === brandId &&
            pStart.getFullYear() === year && pStart.getMonth() === month - 1 &&
            bp.status === "verified";
        });

        groups.push({
          monthKey: yearMonth,
          monthLabel: format(new Date(year, month - 1), "MMMM yyyy"),
          totalCommission: val.totalCommission,
          currency: val.currency,
          brandId,
          brandName: brand.name,
          refundBufferDays: brand.refundBufferDays,
          bufferEndDate,
          brandPaymentVerified: !!matchingPayment,
          creatorPaid: false, // determined below
        });
      }

      // Sort by month descending
      groups.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

      // Simple paid tracking: mark oldest months as paid based on total paid amount
      let remainingPaid = totalPaid;
      const sortedAsc = [...groups].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
      for (const g of sortedAsc) {
        if (remainingPaid >= g.totalCommission && g.brandPaymentVerified && isBefore(g.bufferEndDate, now)) {
          g.creatorPaid = true;
          remainingPaid -= g.totalCommission;
        }
      }

      setMonthGroups(groups);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const getStatus = (group: MonthGroup) => {
    const now = new Date();
    if (group.creatorPaid) {
      return { label: "Paid", icon: CheckCircle2, style: "text-green-600 bg-green-50 dark:bg-green-950/30", isBuffer: false };
    }
    // Brand payment not yet verified → Pending
    if (!group.brandPaymentVerified) {
      return { label: "Pending", icon: Clock, style: "text-muted-foreground bg-muted", isBuffer: false };
    }
    // Brand payment verified but still in refund buffer
    if (!isBefore(group.bufferEndDate, now)) {
      return {
        label: `In Refund Buffer – payable after ${format(group.bufferEndDate, "dd MMM yyyy")}`,
        icon: Clock,
        style: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
        isBuffer: true,
      };
    }
    // Buffer ended and brand payment verified → Payment Processing
    return { label: "Payment Processing", icon: ArrowRightCircle, style: "text-blue-600 bg-blue-50 dark:bg-blue-950/30", isBuffer: false };
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === "ZAR" ? "R" : currency === "USD" ? "$" : currency;
    return `${symbol}${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Overview</p>
          <h2 className="font-display text-xl sm:text-2xl text-foreground">Monthly Earnings Status</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (monthGroups.length === 0) return null;

  return (
    <section className="space-y-4 sm:space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Overview</p>
        <h2 className="font-display text-xl sm:text-2xl text-foreground">Monthly Earnings Status</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Track the status of your earnings for each month as they move through the refund buffer and payment process.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {monthGroups.map((group, i) => {
          const status = getStatus(group);
          const StatusIcon = status.icon;
          return (
            <motion.div
              key={`${group.brandId}-${group.monthKey}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="border border-border rounded-xl p-4 sm:p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display font-semibold text-foreground">{group.monthLabel}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{group.brandName}</p>
                </div>
                <p className="text-lg font-semibold text-foreground whitespace-nowrap">
                  {formatCurrency(group.totalCommission, group.currency)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.style}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {status.label}
                </div>
                {status.isBuffer && (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-sm">
                        This brand has a {group.refundBufferDays} day refund buffer period. We hold your commission during this time to protect against customer refunds. Your commission for this month will be available after {format(group.bufferEndDate, "dd MMM yyyy")}.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

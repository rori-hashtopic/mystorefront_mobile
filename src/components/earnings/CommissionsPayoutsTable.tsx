import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EarningsTable, TableEmptyRow } from "./EarningsTable";
import {
  Loader2,
  Download,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle2,
  ArrowRightCircle,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, endOfMonth, addDays, isBefore } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface OrderRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  orderTotal: number;
  currency: string;
  status: string;
  orderId: string;
  brandId: string;
}

interface MonthGroup {
  monthKey: string; // "2026-01"
  monthLabel: string;
  orders: OrderRow[];
  totalCommission: number;
  orderCount: number;
  currency: string;
  brandId: string;
  brandName: string;
  refundBufferDays: number;
  bufferEndDate: Date;
  brandPaymentVerified: boolean;
  creatorPaid: boolean;
}

const DEFAULT_REFUND_BUFFER_DAYS = 30;
const FALLBACK_BRAND_NAME = "Brand";

export function CommissionsPayoutsTable() {
  const { user } = useAuth();

  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([]);
  const [commissionsLoading, setCommissionsLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const fetchCommissions = async () => {
      setCommissionsLoading(true);

      const { data: orders, error } = await (supabase.from("affiliate_orders") as any)
        .select(
          `id, click_id, order_id, order_total, commission_amount, currency, status, created_at, metadata, brand_id`,
        )
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load commissions:", error.message);
        setCommissionsLoading(false);
        return;
      }

      // Enrich with product titles
      const enrichedOrders: OrderRow[] = [];
      for (const order of orders || []) {
        let productTitle = "—";

        const { data: click } = await (supabase.from("affiliate_clicks") as any)
          .select("link_id")
          .eq("click_id", order.click_id || order.id)
          .maybeSingle();

        if (click?.link_id) {
          const { data: link } = await supabase
            .from("links")
            .select("product_title")
            .eq("id", click.link_id)
            .maybeSingle();
          if (link?.product_title) productTitle = link.product_title;
        }

        if (productTitle === "—" && order.metadata?.order_number) {
          productTitle = `Order ${order.metadata.order_number}`;
        }

        const merchant = order.metadata?.store?.site_url?.replace("https://", "") || "";

        enrichedOrders.push({
          id: order.id,
          date: order.created_at,
          description: merchant ? `${productTitle} · ${merchant}` : productTitle,
          // MyStorefront takes a 20% platform fee; creators see their net (80%) commission.
          amount: Number(order.commission_amount || 0) * 0.8,
          orderTotal: Number(order.order_total || 0),
          currency: order.currency || "ZAR",
          status: order.status || "pending",
          orderId: order.metadata?.order_number || order.order_id || "—",
          brandId: order.brand_id,
        });
      }

      // Get unique brand IDs
      const brandIds = [...new Set(enrichedOrders.map((o) => o.brandId))];

      const [publicBrandsResult, brandAccountsResult, brandPaymentsResult, payoutReqsResult] = await Promise.all([
        brandIds.length > 0
          ? supabase.from("brands").select("id, name").in("id", brandIds)
          : Promise.resolve({ data: [] }),
        brandIds.length > 0
          ? (supabase.from("brand_accounts") as any).select("id, name, refund_buffer_days").in("id", brandIds)
          : Promise.resolve({ data: [], error: null }),
        brandIds.length > 0
          ? (supabase.from("brand_payments") as any)
              .select("brand_id, period_start, period_end, status")
              .in("brand_id", brandIds)
          : Promise.resolve({ data: [] }),
        (supabase.from("payout_requests") as any)
          .select("amount, status")
          .eq("creator_id", user.id)
          .eq("status", "paid"),
      ]);

      if (brandAccountsResult.error) {
        console.warn("Failed to load brand refund buffer settings for commissions:", brandAccountsResult.error.message);
      }

      const publicBrandsData = (publicBrandsResult.data || []) as { id: string; name: string | null }[];
      const brandsData = (brandAccountsResult.data || []) as any[];
      const brandPayments = (brandPaymentsResult.data || []) as any[];
      const payoutReqs = (payoutReqsResult.data || []) as any[];

      const totalPaid = payoutReqs.reduce((sum: number, p: any) => sum + Number(p.amount), 0);

      // Build brand info map
      const brandMap: Record<string, { name: string; refundBufferDays: number }> = {};
      for (const b of publicBrandsData) {
        brandMap[b.id] = {
          name: b.name || FALLBACK_BRAND_NAME,
          refundBufferDays: DEFAULT_REFUND_BUFFER_DAYS,
        };
      }
      for (const b of brandsData) {
        brandMap[b.id] = {
          name: b.name || brandMap[b.id]?.name || FALLBACK_BRAND_NAME,
          refundBufferDays: b.refund_buffer_days ?? brandMap[b.id]?.refundBufferDays ?? DEFAULT_REFUND_BUFFER_DAYS,
        };
      }
      for (const brandId of brandIds) {
        if (!brandMap[brandId]) {
          brandMap[brandId] = {
            name: FALLBACK_BRAND_NAME,
            refundBufferDays: DEFAULT_REFUND_BUFFER_DAYS,
          };
        }
      }

      // Update order descriptions with brand names
      for (const order of enrichedOrders) {
        const brand = brandMap[order.brandId];
        if (brand && brand.name !== FALLBACK_BRAND_NAME && !order.description.includes(brand.name)) {
          order.description = order.description === "—" ? brand.name : `${order.description} · ${brand.name}`;
        }
      }

      // Group orders by brand + month
      const groupMap: Record<string, OrderRow[]> = {};
      for (const order of enrichedOrders) {
        const d = new Date(order.date);
        const key = `${order.brandId}__${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!groupMap[key]) groupMap[key] = [];
        groupMap[key].push(order);
      }

      const now = new Date();
      const groups: MonthGroup[] = [];

      for (const [key, orderList] of Object.entries(groupMap)) {
        const [brandId, yearMonth] = key.split("__");
        const [year, month] = yearMonth.split("-").map(Number);
        const brand = brandMap[brandId] || {
          name: FALLBACK_BRAND_NAME,
          refundBufferDays: DEFAULT_REFUND_BUFFER_DAYS,
        };

        const monthEnd = endOfMonth(new Date(year, month - 1));
        const bufferEndDate = addDays(monthEnd, brand.refundBufferDays);

        const matchingPayment = (brandPayments || []).find((bp: any) => {
          const pStart = new Date(bp.period_start);
          return (
            bp.brand_id === brandId &&
            pStart.getFullYear() === year &&
            pStart.getMonth() === month - 1 &&
            bp.status === "verified"
          );
        });

        const totalCommission = orderList.reduce((sum, o) => sum + o.amount, 0);

        groups.push({
          monthKey: yearMonth,
          monthLabel: format(new Date(year, month - 1), "MMMM yyyy"),
          orders: orderList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          totalCommission,
          orderCount: orderList.length,
          currency: orderList[0]?.currency || "ZAR",
          brandId,
          brandName: brand.name,
          refundBufferDays: brand.refundBufferDays,
          bufferEndDate,
          brandPaymentVerified: !!matchingPayment,
          creatorPaid: false,
        });
      }

      // Sort by month descending
      groups.sort((a, b) => b.monthKey.localeCompare(a.monthKey) || a.brandName.localeCompare(b.brandName));

      // Mark oldest months as paid
      let remainingPaid = totalPaid;
      const sortedAsc = [...groups].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
      for (const g of sortedAsc) {
        if (remainingPaid >= g.totalCommission && g.brandPaymentVerified && isBefore(g.bufferEndDate, now)) {
          g.creatorPaid = true;
          remainingPaid -= g.totalCommission;
        }
      }

      setMonthGroups(groups);
      setCommissionsLoading(false);
    };

    fetchCommissions();
  }, [user]);

  const loading = commissionsLoading;

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === "ZAR" ? "R" : currency === "USD" ? "$" : currency;
    return `${symbol}${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "confirmed":
      case "paid":
        return "text-green-600 bg-green-50 dark:bg-green-950/30";
      case "pending":
        return "text-amber-600 bg-amber-50 dark:bg-amber-950/30";
      case "approved":
      case "processing":
        return "text-blue-600 bg-blue-50 dark:bg-blue-950/30";
      case "rejected":
        return "text-red-600 bg-red-50 dark:bg-red-950/30";
      case "buffer":
        return "text-amber-600 bg-amber-50 dark:bg-amber-950/30";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const getMonthStatus = (group: MonthGroup) => {
    const now = new Date();
    if (group.creatorPaid) {
      return { label: "Paid", statusKey: "paid", icon: CheckCircle2, isBuffer: false };
    }
    if (!group.brandPaymentVerified) {
      return { label: "Pending", statusKey: "pending", icon: Clock, isBuffer: false };
    }
    if (!isBefore(group.bufferEndDate, now)) {
      return {
        label: `In Refund Buffer`,
        statusKey: "buffer",
        icon: Clock,
        isBuffer: true,
      };
    }
    return { label: "Payment Processing", statusKey: "processing", icon: ArrowRightCircle, isBuffer: false };
  };

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDownload = () => {
    const allOrders = monthGroups.flatMap((g) => g.orders);
    if (allOrders.length === 0) return;

    const csvRows = [
      ["Date", "Description", "Amount", "Status"].join(","),
      ...allOrders.map((o) =>
        [formatDate(o.date), `"${o.description.replace(/"/g, '""')}"`, o.amount.toFixed(2), o.status].join(","),
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = ["", "Month", "Brand", "Orders", "Total Commission", "Status"];

  // Mobile card for a month group
  const MobileMonthCard = ({ group, index }: { group: MonthGroup; index: number }) => {
    const status = getMonthStatus(group);
    const expanded = expandedMonths.has(`${group.brandId}-${group.monthKey}`);
    const groupKey = `${group.brandId}-${group.monthKey}`;

    return (
      <motion.div
        key={groupKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.03 }}
        className="border border-border rounded-xl overflow-hidden"
      >
        <button
          onClick={() => toggleMonth(groupKey)}
          className="w-full p-4 flex items-start justify-between gap-2 text-left hover:bg-muted/30 transition-colors"
        >
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-sm font-semibold text-foreground">{group.monthLabel}</p>
            <p className="text-xs text-muted-foreground">{group.brandName}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(status.statusKey)}`}
              >
                <status.icon className="h-3 w-3" />
                {status.label}
              </span>
              {status.isBuffer && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-sm">
                      This brand has a {group.refundBufferDays} day refund buffer period. Your commission for this month
                      will be available after {format(group.bufferEndDate, "dd MMM yyyy")}.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(group.totalCommission, group.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {group.orderCount} order{group.orderCount !== 1 ? "s" : ""}
            </p>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground mt-1 ml-auto" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 ml-auto" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border divide-y divide-border">
                {group.orders.map((order) => (
                  <div key={order.id} className="px-4 py-3 space-y-1.5 bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-foreground truncate flex-1">{order.description}</p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${getStatusStyle(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDate(order.date)}</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(order.amount, order.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Details</p>
          <h2 className="font-display text-xl sm:text-2xl text-foreground">Commissions</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Commissions are grouped by month. Click a row to see individual orders.
          </p>
        </div>
        {monthGroups.length > 0 && (
          <button
            onClick={handleDownload}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        )}
      </div>

      {/* Mobile */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : monthGroups.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No commissions yet.</p>
        ) : (
          monthGroups.map((group, i) => (
            <MobileMonthCard key={`${group.brandId}-${group.monthKey}`} group={group} index={i} />
          ))
        )}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block">
        <EarningsTable title="" columns={columns} hideTitle>
          {loading ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              </td>
            </tr>
          ) : monthGroups.length === 0 ? (
            <TableEmptyRow colSpan={6} message="No commissions yet." />
          ) : (
            <>
              {monthGroups.map((group) => {
                const groupKey = `${group.brandId}-${group.monthKey}`;
                const expanded = expandedMonths.has(groupKey);
                const status = getMonthStatus(group);

                return (
                  <>
                    <tr
                      key={groupKey}
                      onClick={() => toggleMonth(groupKey)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-3 sm:px-4 py-4 w-8">
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-4 text-foreground font-semibold whitespace-nowrap">
                        {group.monthLabel}
                      </td>
                      <td className="px-3 sm:px-4 py-4 text-muted-foreground">{group.brandName}</td>
                      <td className="px-3 sm:px-4 py-4 text-muted-foreground">
                        {group.orderCount} order{group.orderCount !== 1 ? "s" : ""}
                      </td>
                      <td className="px-3 sm:px-4 py-4 text-foreground font-medium whitespace-nowrap">
                        +{formatCurrency(group.totalCommission, group.currency)}
                      </td>
                      <td className="px-3 sm:px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(status.statusKey)}`}
                          >
                            <status.icon className="h-3 w-3" />
                            {status.label}
                          </span>
                          {status.isBuffer && (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-sm">
                                  This brand has a {group.refundBufferDays} day refund buffer period. Your commission
                                  for this month will be available after {format(group.bufferEndDate, "dd MMM yyyy")}.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded &&
                      group.orders.map((order) => (
                        <tr key={order.id} className="bg-muted/20">
                          <td className="px-3 sm:px-4 py-3"></td>
                          <td className="px-3 sm:px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                            {formatDate(order.date)}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-foreground text-sm max-w-[200px] truncate">
                            {order.description}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-muted-foreground text-xs font-mono">
                            #{order.orderId}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-foreground text-sm whitespace-nowrap">
                            {formatCurrency(order.amount, order.currency)}
                          </td>
                          <td className="px-3 sm:px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusStyle(order.status)}`}
                            >
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </>
                );
              })}
            </>
          )}
        </EarningsTable>
      </div>
    </section>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EarningsTable, TableEmptyRow } from "./EarningsTable";
import { Loader2, Download } from "lucide-react";
import { motion } from "framer-motion";

interface CommissionRow {
  id: string;
  created_at: string;
  product_title: string;
  merchant: string;
  order_total: number;
  commission_amount: number;
  currency: string;
  order_id: string;
  status: string;
}

export function CommissionsTable() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const columns = ["Date", "Product", "Merchant", "Order Total", "Commission", "Order", "Status"];

  useEffect(() => {
    if (!user) return;

    const fetchCommissions = async () => {
      setLoading(true);

      const { data: orders, error } = await (supabase.from("affiliate_orders") as any)
        .select(
          `
          id, click_id, order_id, order_total, commission_amount, currency, status, created_at, metadata,
          brand_accounts(name)
        `,
        )
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Failed to load commissions:", error.message);
        setLoading(false);
        return;
      }

      const enriched: CommissionRow[] = [];

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

          if (link?.product_title) {
            productTitle = link.product_title;
          }
        }

        if (productTitle === "—" && order.metadata?.order_number) {
          productTitle = `Order ${order.metadata.order_number}`;
        }

        const merchant = order.brand_accounts?.name || order.metadata?.store?.site_url?.replace("https://", "") || "—";

        enriched.push({
          id: order.id,
          created_at: order.created_at,
          product_title: productTitle,
          merchant,
          order_total: Number(order.order_total || 0),
          commission_amount: Number(order.commission_amount || 0),
          currency: order.currency || "ZAR",
          order_id: order.metadata?.order_number || order.order_id || "—",
          status: order.status || "pending",
        });
      }

      setCommissions(enriched);
      setLoading(false);
    };

    fetchCommissions();
  }, [user]);

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === "ZAR" ? "R" : currency === "USD" ? "$" : currency;
    return `${symbol}${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "confirmed":
        return "text-green-600 bg-green-50 dark:bg-green-950/30";
      case "pending":
        return "text-amber-600 bg-amber-50 dark:bg-amber-950/30";
      case "rejected":
        return "text-red-600 bg-red-50 dark:bg-red-950/30";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const totals = commissions.reduce(
    (acc, c) => ({
      orderTotal: acc.orderTotal + c.order_total,
      commission: acc.commission + c.commission_amount,
    }),
    { orderTotal: 0, commission: 0 },
  );

  const currency = commissions[0]?.currency || "ZAR";

  const handleDownload = () => {
    if (commissions.length === 0) return;

    const csvRows = [
      ["Date", "Product", "Merchant", "Order Total", "Commission", "Order", "Status"].join(","),
      ...commissions.map((c) =>
        [
          formatDate(c.created_at),
          `"${c.product_title.replace(/"/g, '""')}"`,
          `"${c.merchant.replace(/"/g, '""')}"`,
          c.order_total.toFixed(2),
          c.commission_amount.toFixed(2),
          c.order_id,
          c.status,
        ].join(","),
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

  // Mobile card view
  const MobileCards = () => (
    <div className="sm:hidden space-y-3">
      {loading ? (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading commissions...</span>
        </div>
      ) : commissions.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No commissions yet. When shoppers purchase through your links, they'll appear here.
        </p>
      ) : (
        <>
          {commissions.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
              className="border border-border rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.product_title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.merchant}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${getStatusStyle(c.status)}`}
                >
                  {c.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{formatDate(c.created_at)}</span>
                <span className="font-mono text-xs text-muted-foreground">#{c.order_id}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Order Total</p>
                  <p className="text-sm text-foreground">{formatCurrency(c.order_total, c.currency)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Commission</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(c.commission_amount, c.currency)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Mobile totals */}
          <div className="border-t-2 border-foreground/10 pt-4 mt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                {commissions.length} order{commissions.length !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-foreground">{formatCurrency(totals.orderTotal, currency)} total</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Commission</p>
              <p className="text-sm font-medium text-foreground">{formatCurrency(totals.commission, currency)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Details</p>
          <h2 className="font-display text-xl sm:text-2xl text-foreground">Commissions</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Pending commissions are awaiting brand verification and payment. Once approved and received, they become
            available to 'Request Payout' in your next eligible weekly payout.
          </p>
        </div>
        {commissions.length > 0 && (
          <button
            onClick={handleDownload}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        )}
      </div>

      {/* Mobile: card layout */}
      <MobileCards />

      {/* Desktop: table layout */}
      <div className="hidden sm:block">
        <EarningsTable title="" columns={columns} hideTitle>
          {loading ? (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading commissions...</span>
                </div>
              </td>
            </tr>
          ) : commissions.length === 0 ? (
            <TableEmptyRow
              colSpan={7}
              message="No commissions yet. When shoppers purchase through your links, they'll appear here."
            />
          ) : (
            <>
              {commissions.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 sm:px-4 py-4 text-muted-foreground whitespace-nowrap">
                    {formatDate(c.created_at)}
                  </td>
                  <td className="px-3 sm:px-4 py-4 text-foreground max-w-[200px] truncate">{c.product_title}</td>
                  <td className="px-3 sm:px-4 py-4 text-muted-foreground">{c.merchant}</td>
                  <td className="px-3 sm:px-4 py-4 text-foreground whitespace-nowrap">
                    {formatCurrency(c.order_total, c.currency)}
                  </td>
                  <td className="px-3 sm:px-4 py-4 text-foreground font-medium whitespace-nowrap">
                    {formatCurrency(c.commission_amount, c.currency)}
                  </td>
                  <td className="px-3 sm:px-4 py-4 text-muted-foreground text-xs font-mono">{c.order_id}</td>
                  <td className="px-3 sm:px-4 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusStyle(c.status)}`}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="font-medium bg-muted/50 border-t-2 border-foreground/10">
                <td className="px-3 sm:px-4 py-4 text-foreground">Total</td>
                <td className="px-3 sm:px-4 py-4 text-muted-foreground">
                  {commissions.length} order{commissions.length !== 1 ? "s" : ""}
                </td>
                <td className="px-3 sm:px-4 py-4"></td>
                <td className="px-3 sm:px-4 py-4 text-foreground whitespace-nowrap">
                  {formatCurrency(totals.orderTotal, currency)}
                </td>
                <td className="px-3 sm:px-4 py-4 text-foreground font-medium whitespace-nowrap">
                  {formatCurrency(totals.commission, currency)}
                </td>
                <td className="px-3 sm:px-4 py-4"></td>
                <td className="px-3 sm:px-4 py-4"></td>
              </tr>
            </>
          )}
        </EarningsTable>
      </div>
    </section>
  );
}

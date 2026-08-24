import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { EarningsTable, TableEmptyRow, MobileEmptyState } from "./EarningsTable";
import { Badge } from "@/components/ui/badge";
import { Lock, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { hasTierAccess } from "@/lib/creatorTiers";
import { motion } from "framer-motion";

const formatZAR = (v: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(v);

interface BrandPaymentRow {
  id: string;
  date: string;
  brand: string;
  description: string;
  type: "Paid Collab" | "Mention Fee";
  amount: number;
  status: string;
}

const statusClass = (s: string) => {
  switch (s) {
    case "paid":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "approved":
    case "completed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const statusLabel = (s: string) => {
  switch (s) {
    case "paid":
      return "Paid";
    case "approved":
    case "completed":
      return "Approved";
    default:
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
};

interface OpportunityPaymentsTableProps {
  tier?: string;
}

export function OpportunityPaymentsTable({ tier = "enthusiast" }: OpportunityPaymentsTableProps) {
  const isLocked = !hasTierAccess(tier, "ambassador");
  const { user } = useAuth();
  const [rows, setRows] = useState<BrandPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || isLocked) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      const combined: BrandPaymentRow[] = [];

      // 1. Paid collab payments
      const { data: participants } = await (supabase.from("paid_collab_participants") as any)
        .select(
          "id, payment_amount, payment_status, paid_at, collab:paid_collabs(title, compensation_type, brand:brand_accounts(name))",
        )
        .eq("creator_id", user.id)
        .in("payment_status", ["approved", "paid"]);

      for (const p of (participants || []) as any[]) {
        const collab = p.collab;
        combined.push({
          id: `collab-${p.id}`,
          date: p.paid_at || "",
          brand: collab?.brand?.name || "—",
          description: collab?.title || "Paid Collab",
          type: "Paid Collab",
          amount: Number(p.payment_amount || 0),
          status: p.payment_status,
        });
      }

      // 2. Mention fee payments
      const { data: mentions } = await supabase
        .from("mention_requests" as any)
        .select("id, fee_amount, status, approved_at, campaign:mention_campaigns(title), brand:brand_accounts(name)")
        .eq("creator_id", user.id)
        .in("status", ["approved", "paid"]);

      for (const m of (mentions || []) as any[]) {
        combined.push({
          id: `mention-${m.id}`,
          date: m.approved_at || "",
          brand: m.brand?.name || "—",
          description: m.campaign?.title || "Mention Fee",
          type: "Mention Fee",
          amount: Number(m.fee_amount || 0),
          status: m.status,
        });
      }

      // Sort newest first
      combined.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setRows(combined);
      setLoading(false);
    };

    fetchAll();
  }, [user, isLocked]);

  if (isLocked) {
    return (
      <section className="space-y-4 sm:space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Details</p>
          <h2 className="font-display text-xl sm:text-2xl text-foreground">Brand Payments</h2>
        </div>
        <div className="flex items-center gap-3 py-8 text-muted-foreground">
          <Lock className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">
            Brand collaboration payments unlock at the <span className="text-foreground font-medium">Featured</span>{" "}
            tier.
          </p>
        </div>
      </section>
    );
  }

  const handleDownload = () => {
    if (rows.length === 0) return;
    const csvRows = [
      ["Date", "Brand", "Description", "Type", "Amount", "Status"].join(","),
      ...rows.map((r) =>
        [
          r.date ? format(new Date(r.date), "dd MMM yyyy") : "—",
          `"${r.brand.replace(/"/g, '""')}"`,
          `"${r.description.replace(/"/g, '""')}"`,
          r.type,
          r.amount.toFixed(2),
          r.status,
        ].join(","),
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brand-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = ["Date", "Brand", "Description", "Type", "Amount", "Status"];

  const mobileContent = loading ? (
    <div className="flex justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ) : rows.length === 0 ? (
    <MobileEmptyState message="Payments from brand collaborations will appear here." />
  ) : (
    <>
      {rows.map((r, i) => (
        <motion.div
          key={r.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.03 }}
          className="border border-border rounded-xl p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{r.description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.brand}</p>
            </div>
            <Badge className={statusClass(r.status)}>{statusLabel(r.status)}</Badge>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {r.date ? format(new Date(r.date), "dd MMM yyyy") : "—"}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                {r.type}
              </span>
            </div>
            <span className="text-sm font-semibold text-foreground">{formatZAR(r.amount)}</span>
          </div>
        </motion.div>
      ))}
    </>
  );

  return (
    <EarningsTable
      title="Brand Payments"
      columns={columns}
      showDownload={rows.length > 0}
      onDownload={handleDownload}
      mobileContent={mobileContent}
    >
      {loading ? (
        <tr>
          <td colSpan={6} className="px-4 py-12 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </div>
          </td>
        </tr>
      ) : rows.length === 0 ? (
        <TableEmptyRow colSpan={6} message="Payments from brand collaborations will appear here." />
      ) : (
        rows.map((r) => (
          <tr key={r.id} className="border-b">
            <td className="px-4 py-4 text-sm text-muted-foreground">
              {r.date ? format(new Date(r.date), "dd MMM yyyy") : "—"}
            </td>
            <td className="px-4 py-4 text-sm font-medium">{r.brand}</td>
            <td className="px-4 py-4 text-sm">{r.description}</td>
            <td className="px-4 py-4">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                {r.type}
              </span>
            </td>
            <td className="px-4 py-4 text-sm font-medium">{formatZAR(r.amount)}</td>
            <td className="px-4 py-4">
              <Badge className={statusClass(r.status)}>{statusLabel(r.status)}</Badge>
            </td>
          </tr>
        ))
      )}
    </EarningsTable>
  );
}

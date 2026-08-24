import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { EarningsTable, TableEmptyRow, MobileEmptyState } from "./EarningsTable";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const formatZAR = (v: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(v);

interface MentionPayment {
  id: string;
  fee_amount: number;
  status: string;
  approved_at: string | null;
  campaign?: { title: string } | null;
  brand?: { name: string } | null;
}

const statusClass = (s: string) => (s === "paid" ? "bg-teal-100 text-teal-700" : "bg-emerald-100 text-emerald-700");

export function MentionPaymentsTable() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<MentionPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from("mention_requests" as any)
        .select("id, fee_amount, status, approved_at, campaign:mention_campaigns(title), brand:brand_accounts(name)")
        .eq("creator_id", user.id)
        .in("status", ["approved", "paid"])
        .order("approved_at", { ascending: false });
      if (data) setPayments(data as any);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const columns = ["Date", "Brand", "Campaign", "Amount", "Status"];

  // ── Mobile card layout ────────────────────────────────────────────────────
  const mobileContent = loading ? (
    <div className="flex justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ) : payments.length === 0 ? (
    <MobileEmptyState message="Paid mention fees will appear here." />
  ) : (
    <>
      {payments.map((p) => (
        <div key={p.id} className="border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{p.campaign?.title || "Mention Fee"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p.brand?.name || "—"}</p>
            </div>
            <Badge className={statusClass(p.status)}>{p.status === "paid" ? "Paid" : "Approved"}</Badge>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {p.approved_at ? format(new Date(p.approved_at), "dd MMM yyyy") : "—"}
            </span>
            <span className="text-sm font-semibold text-foreground">{formatZAR(Number(p.fee_amount))}</span>
          </div>
        </div>
      ))}
    </>
  );

  return (
    <EarningsTable title="Mention Fees" columns={columns} mobileContent={mobileContent}>
      {loading ? (
        <tr>
          <td colSpan={5} className="px-4 py-12 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </div>
          </td>
        </tr>
      ) : payments.length === 0 ? (
        <TableEmptyRow colSpan={5} message="Paid mention fees will appear here." />
      ) : (
        payments.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="text-sm text-muted-foreground">
              {p.approved_at ? format(new Date(p.approved_at), "dd MMM yyyy") : "—"}
            </TableCell>
            <TableCell className="text-sm font-medium">{p.brand?.name || "—"}</TableCell>
            <TableCell className="text-sm">{p.campaign?.title || "Mention Fee"}</TableCell>
            <TableCell className="text-sm font-medium">{formatZAR(Number(p.fee_amount))}</TableCell>
            <TableCell>
              <Badge className={statusClass(p.status)}>{p.status === "paid" ? "Paid" : "Approved"}</Badge>
            </TableCell>
          </TableRow>
        ))
      )}
    </EarningsTable>
  );
}

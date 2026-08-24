import { useState } from "react";
import { EarningsTable, TableEmptyRow } from "./EarningsTable";
import { usePayoutRequests } from "@/hooks/usePayoutRequests";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { motion } from "framer-motion";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

type FilterTab = "all" | "pending" | "approved" | "paid" | "rejected";

const TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Paid", value: "paid" },
  { label: "Rejected", value: "rejected" },
];

export function PayoutRequestsTable() {
  const { requests, loading } = usePayoutRequests();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const columns = ["Requested", "Amount", "Status", "Note"];

  const filtered = activeTab === "all" ? requests : requests.filter((r) => r.status === activeTab);

  const emptyMessage = activeTab === "all" ? "No payout requests yet." : `No ${activeTab} payouts.`;

  // Mobile card view
  const MobileCards = () => (
    <div className="sm:hidden space-y-3">
      {loading ? (
        <p className="text-center text-muted-foreground py-12">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">{emptyMessage}</p>
      ) : (
        filtered.map((req, i) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
            className="border border-border rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-lg font-display text-foreground">R{Number(req.amount).toFixed(2)}</p>
              <Badge variant="secondary" className={statusColors[req.status] || ""}>
                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{format(new Date(req.created_at), "dd MMM yyyy")}</span>
            </div>
            {req.admin_note && (
              <p className="text-xs text-muted-foreground border-t border-border pt-2">{req.admin_note}</p>
            )}
          </motion.div>
        ))
      )}
    </div>
  );

  return (
    <section className="space-y-4 sm:space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Details</p>
        <h2 className="font-display text-xl sm:text-2xl text-foreground">Payouts</h2>
      </div>

      {/* Filter tabs - scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {TABS.map((tab) => {
          const count = tab.value === "all" ? requests.length : requests.filter((r) => r.status === tab.value).length;

          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
              {count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Mobile: card layout */}
      <MobileCards />

      {/* Desktop: table layout */}
      <div className="hidden sm:block">
        <EarningsTable title="" columns={columns} hideTitle>
          {loading ? (
            <TableEmptyRow colSpan={4} message="Loading..." />
          ) : filtered.length === 0 ? (
            <TableEmptyRow colSpan={4} message={emptyMessage} />
          ) : (
            filtered.map((req) => (
              <tr key={req.id} className="border-b">
                <td className="px-4 py-4 text-foreground">{format(new Date(req.created_at), "dd MMM yyyy")}</td>
                <td className="px-4 py-4 text-foreground font-medium">R{Number(req.amount).toFixed(2)}</td>
                <td className="px-4 py-4">
                  <Badge variant="secondary" className={statusColors[req.status] || ""}>
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </Badge>
                </td>
                <td className="px-4 py-4 text-muted-foreground text-sm">{req.admin_note || "–"}</td>
              </tr>
            ))
          )}
        </EarningsTable>
      </div>
    </section>
  );
}

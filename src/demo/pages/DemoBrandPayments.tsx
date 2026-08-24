import { DemoBrandLayout } from "@/demo/DemoBrandLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, CheckCircle, Clock, AlertCircle, Receipt, CalendarDays, ShoppingBag, TrendingUp } from "lucide-react";
import { demoPayments, formatZAR } from "@/demo/mockData";
import { useDemoMode } from "@/demo/DemoModeContext";
import { DemoTierBanner } from "@/demo/DemoTierBanner";

const statusMeta: Record<string, { label: string; icon: any; color: string }> = {
  due: { label: "Due", icon: AlertCircle, color: "bg-amber-100 text-amber-700" },
  submitted: { label: "Under review", icon: Clock, color: "bg-blue-100 text-blue-700" },
  verified: { label: "Verified", icon: CheckCircle, color: "bg-emerald-100 text-emerald-700" },
};

export default function DemoBrandPayments() {
  const { demoAction } = useDemoMode();
  const current = demoPayments.find((p) => p.status === "due") || demoPayments[0];
  const totalOutstanding = demoPayments
    .filter((p) => p.status === "due")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <DemoBrandLayout>
      <div className="space-y-6">
        <DemoTierBanner tier="free" />
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Payments</h1>
          <p className="text-muted-foreground">
            Pay creator commissions to MyStorefront on a monthly cycle.
          </p>
        </div>

        {/* Current invoice */}
        <div id="tour-payments-current-invoice" data-tour="payments-current-invoice">
        <Card className="overflow-hidden border-2">
          {/* Header strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-secondary/30 px-6 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground ring-1 ring-border">
                <CalendarDays className="h-3 w-3" />
                Current invoice · {current.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                <AlertCircle className="h-3 w-3" /> Due
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Reference: <span className="font-mono text-foreground">DEMO-{current.id}</span>
            </p>
          </div>

          <CardContent className="space-y-6 p-6">
            {/* Hero: total sales */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Total sales made by creators
              </p>
              <div className="mt-1 flex items-baseline gap-3">
                <p className="font-display text-4xl font-bold tracking-tight text-foreground">
                  {formatZAR(current.total_sales)}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <TrendingUp className="h-3 w-3" /> {current.order_count} orders
                </span>
              </div>
            </div>

            {/* Breakdown row */}
            <div className="grid grid-cols-3 items-center gap-2 rounded-lg border bg-secondary/20 px-4 py-4 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sales</p>
                <p className="mt-0.5 text-base font-semibold text-foreground">
                  {formatZAR(current.total_sales)}
                </p>
              </div>
              <div className="border-x">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your rate</p>
                <p className="mt-0.5 text-base font-semibold text-foreground">10%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount due</p>
                <p className="mt-0.5 text-base font-bold text-foreground">
                  {formatZAR(current.commission_owed)}
                </p>
              </div>
            </div>

            {/* Pay action */}
            <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <Receipt className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Pay via EFT to MyStorefront
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bank details emailed to your account. We pay creators on your behalf.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="sm:shrink-0"
                onClick={() => demoAction("Demo — proof upload disabled.")}
              >
                <Upload className="h-4 w-4 mr-2" /> Submit proof of payment
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatZAR(totalOutstanding)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lifetime paid</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatZAR(
                  demoPayments
                    .filter((p) => p.status === "verified")
                    .reduce((s, p) => s + p.amount, 0)
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Commission rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">10%</p>
              <p className="text-xs text-muted-foreground">Your set rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment history */}
        <div>
          <h2 className="font-display text-xl font-semibold mb-4">Payment history</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Total Sales</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoPayments.map((p) => {
                  const meta = statusMeta[p.status];
                  const Icon = meta.icon;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.label}</TableCell>
                      <TableCell>{formatZAR(p.total_sales)}</TableCell>
                      <TableCell>{p.order_count}</TableCell>
                      <TableCell className="font-semibold">{formatZAR(p.commission_owed)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}
                        >
                          <Icon className="h-3 w-3" /> {meta.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {p.proof_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => demoAction("Demo — proof preview disabled.")}
                          >
                            View proof
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </DemoBrandLayout>
  );
}

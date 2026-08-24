import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DemoBrandLayout } from "@/demo/DemoBrandLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MousePointerClick,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  ArrowUpDown,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { demoOrders, demoClicks, getCreator, formatZAR } from "@/demo/mockData";
import { DemoTierBanner } from "@/demo/DemoTierBanner";

type DateRange = "7" | "30" | "90" | "all";
const DATE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "All time", value: "all" },
];

type SortKey = "clicks" | "orders" | "gmv" | "commission";

export default function DemoBrandAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange>("30");
  const [sortKey, setSortKey] = useState<SortKey>("gmv");
  const [sortAsc, setSortAsc] = useState(false);

  const cutoff = useMemo(
    () => (dateRange === "all" ? null : subDays(new Date(), Number(dateRange)).getTime()),
    [dateRange]
  );

  const filteredOrders = useMemo(
    () => (cutoff ? demoOrders.filter((o) => new Date(o.created_at).getTime() >= cutoff) : demoOrders),
    [cutoff]
  );
  const filteredClicks = useMemo(
    () => (cutoff ? demoClicks.filter((c) => new Date(c.created_at).getTime() >= cutoff) : demoClicks),
    [cutoff]
  );

  const totals = useMemo(() => {
    return {
      clicks: filteredClicks.length,
      orders: filteredOrders.length,
      gmv: filteredOrders.reduce((s, o) => s + o.order_total, 0),
      commission: filteredOrders.reduce((s, o) => s + o.commission_amount, 0),
    };
  }, [filteredOrders, filteredClicks]);

  const creatorRows = useMemo(() => {
    const map = new Map<
      string,
      { creator_id: string; clicks: number; orders: number; gmv: number; commission: number }
    >();
    filteredClicks.forEach((c) => {
      const e = map.get(c.creator_id) || { creator_id: c.creator_id, clicks: 0, orders: 0, gmv: 0, commission: 0 };
      e.clicks += 1;
      map.set(c.creator_id, e);
    });
    filteredOrders.forEach((o) => {
      const e = map.get(o.creator_id) || { creator_id: o.creator_id, clicks: 0, orders: 0, gmv: 0, commission: 0 };
      e.orders += 1;
      e.gmv += o.order_total;
      e.commission += o.commission_amount;
      map.set(o.creator_id, e);
    });
    const arr = [...map.values()].sort((a, b) => {
      const diff = (a as any)[sortKey] - (b as any)[sortKey];
      return sortAsc ? diff : -diff;
    });
    return arr.slice(0, 10);
  }, [filteredOrders, filteredClicks, sortKey, sortAsc]);

  const recentOrders = useMemo(() => filteredOrders.slice(0, 20), [filteredOrders]);

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc);
    else {
      setSortKey(k);
      setSortAsc(false);
    }
  };

  const statusColor: Record<string, string> = {
    confirmed: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    refunded: "bg-muted text-muted-foreground",
  };

  return (
    <DemoBrandLayout>
      <div className="space-y-8">
        <DemoTierBanner tier="free" />
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Analytics</h1>
          <p className="text-muted-foreground">
            Track clicks, orders, and top performing creators.
          </p>
        </div>

        <div id="tour-analytics-kpis" data-tour="analytics-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Clicks" value={totals.clicks.toLocaleString()} icon={<MousePointerClick className="h-4 w-4 text-muted-foreground" />} />
          <KpiCard label="Total Orders" value={totals.orders.toLocaleString()} icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />} />
          <KpiCard label="Total Sales" value={formatZAR(totals.gmv)} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
          <KpiCard label="Commission Paid" value={formatZAR(totals.commission)} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
        </div>

        <div className="flex flex-wrap gap-2">
          {DATE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={dateRange === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        <div data-tour="analytics-top-creators">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Top Creators
          </h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <SortHeader label="Clicks" sortKey="clicks" current={sortKey} onClick={handleSort} />
                  <SortHeader label="Orders" sortKey="orders" current={sortKey} onClick={handleSort} />
                  <SortHeader label="Total Sales" sortKey="gmv" current={sortKey} onClick={handleSort} />
                  <SortHeader label="Commission" sortKey="commission" current={sortKey} onClick={handleSort} />
                  <TableHead>Conv. Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creatorRows.map((row) => {
                  const c = getCreator(row.creator_id);
                  return (
                    <TableRow key={row.creator_id}>
                      <TableCell>
                        <Link
                          to={`/demo/brand/creator-analytics/${row.creator_id}`}
                          className="flex items-center gap-3 hover:underline"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={c?.photo_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {c?.display_name[0] || "C"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">
                            {c?.display_name || "Creator"}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>{row.clicks.toLocaleString()}</TableCell>
                      <TableCell>{row.orders.toLocaleString()}</TableCell>
                      <TableCell>{formatZAR(row.gmv)}</TableCell>
                      <TableCell>{formatZAR(row.commission)}</TableCell>
                      <TableCell>
                        {row.clicks > 0 ? ((row.orders / row.clicks) * 100).toFixed(1) + "%" : "0%"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> Recent Orders
          </h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Order Total</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => {
                  const c = getCreator(o.creator_id);
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">{o.order_id}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={c?.photo_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {c?.display_name[0] || "C"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{c?.display_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatZAR(o.order_total)}</TableCell>
                      <TableCell>{formatZAR(o.commission_amount)}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            statusColor[o.status] || "bg-muted text-muted-foreground"
                          }`}
                        >
                          {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(o.created_at), "dd MMM yyyy")}
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

function KpiCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function SortHeader({
  label,
  sortKey,
  current,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  onClick: (k: SortKey) => void;
}) {
  return (
    <TableHead className="cursor-pointer select-none" onClick={() => onClick(sortKey)}>
      <span className="flex items-center gap-1">
        {label} <ArrowUpDown className={`h-3 w-3 ${current === sortKey ? "text-foreground" : ""}`} />
      </span>
    </TableHead>
  );
}

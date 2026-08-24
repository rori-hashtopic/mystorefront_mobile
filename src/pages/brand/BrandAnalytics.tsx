import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useBrandAccount } from "@/hooks/useBrandAccount";
import { BrandLayout } from "@/components/layout/BrandLayout";
import { TierBanner } from "@/components/brand/TierBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, MousePointerClick, ShoppingCart, TrendingUp, DollarSign, ArrowUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

const formatZAR = (v: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(v);

type DateRange = "7" | "30" | "90" | "all";
const DATE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "All time", value: "all" },
];

type SortKey = "clicks" | "orders" | "gmv" | "commission";

interface CreatorRow {
  creator_id: string;
  display_name: string | null;
  photo_url: string | null;
  clicks: number;
  orders: number;
  gmv: number;
  commission: number;
}

interface OrderRow {
  id: string;
  order_id: string;
  creator_id: string;
  order_total: number;
  commission_amount: number;
  status: string;
  created_at: string;
  display_name: string | null;
  photo_url: string | null;
}

export default function BrandAnalytics() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { brand } = useBrandAccount();

  const [dateRange, setDateRange] = useState<DateRange>("30");
  const [loading, setLoading] = useState(true);

  const [totals, setTotals] = useState({ clicks: 0, orders: 0, gmv: 0, commission: 0 });
  const [creatorRows, setCreatorRows] = useState<CreatorRow[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);

  const [sortKey, setSortKey] = useState<SortKey>("gmv");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role && role !== "brand" && role !== "admin") navigate("/");
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    if (!brand) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const dateFilter = dateRange !== "all" ? subDays(new Date(), Number(dateRange)).toISOString() : null;

      let clicksQuery = supabase.from("affiliate_clicks").select("creator_id").eq("brand_id", brand.id);
      if (dateFilter) clicksQuery = clicksQuery.gte("created_at", dateFilter);

      let ordersQuery = supabase.from("affiliate_orders").select("*").eq("brand_id", brand.id);
      if (dateFilter) ordersQuery = ordersQuery.gte("created_at", dateFilter);

      const [clicksRes, ordersRes] = await Promise.all([clicksQuery, ordersQuery]);
      if (cancelled) return;

      const clicks = clicksRes.data || [];
      const orders = ordersRes.data || [];

      setTotals({
        clicks: clicks.length,
        orders: orders.length,
        gmv: orders.reduce((s: number, o: any) => s + Number(o.order_total), 0),
        commission: orders.reduce((s: number, o: any) => s + Number(o.commission_amount), 0),
      });

      const clicksByCreator = new Map<string, number>();
      clicks.forEach((c: any) => clicksByCreator.set(c.creator_id, (clicksByCreator.get(c.creator_id) || 0) + 1));
      const ordersByCreator = new Map<string, { orders: number; gmv: number; commission: number }>();
      orders.forEach((o: any) => {
        const e = ordersByCreator.get(o.creator_id) || { orders: 0, gmv: 0, commission: 0 };
        e.orders += 1;
        e.gmv += Number(o.order_total);
        e.commission += Number(o.commission_amount);
        ordersByCreator.set(o.creator_id, e);
      });

      const allIds = [...new Set([...clicksByCreator.keys(), ...ordersByCreator.keys()])];
      let profileMap = new Map<string, any>();
      if (allIds.length > 0) {
        const { data } = await supabase.from("profiles").select("id, display_name, photo_url").in("id", allIds);
        profileMap = new Map((data || []).map((p: any) => [p.id, p]));
      }

      setCreatorRows(
        allIds.map((cid) => ({
          creator_id: cid,
          display_name: profileMap.get(cid)?.display_name || null,
          photo_url: profileMap.get(cid)?.photo_url || null,
          clicks: clicksByCreator.get(cid) || 0,
          ...(ordersByCreator.get(cid) || { orders: 0, gmv: 0, commission: 0 }),
        })),
      );

      let recentQ = supabase
        .from("affiliate_orders")
        .select("*")
        .eq("brand_id", brand.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (dateFilter) recentQ = recentQ.gte("created_at", dateFilter);
      const { data: recent } = await recentQ;
      const recentIds = [...new Set((recent || []).map((o: any) => o.creator_id))];
      let recentProfileMap = new Map<string, any>();
      if (recentIds.length > 0) {
        const { data } = await supabase.from("profiles").select("id, display_name, photo_url").in("id", recentIds);
        recentProfileMap = new Map((data || []).map((p: any) => [p.id, p]));
      }
      setRecentOrders(
        (recent || []).map((o: any) => ({
          ...o,
          display_name: recentProfileMap.get(o.creator_id)?.display_name || null,
          photo_url: recentProfileMap.get(o.creator_id)?.photo_url || null,
        })),
      );

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [brand, dateRange]);

  const sortedCreators = useMemo(() => {
    const sorted = [...creatorRows].sort((a, b) => {
      const diff = (a as any)[sortKey] - (b as any)[sortKey];
      return sortAsc ? diff : -diff;
    });
    return sorted.slice(0, 10);
  }, [creatorRows, sortKey, sortAsc]);

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc);
    else {
      setSortKey(k);
      setSortAsc(false);
    }
  };

  const statusColor: Record<string, string> = {
    confirmed: "bg-emerald-100 text-emerald-700",
    paid: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-700",
    refunded: "bg-muted text-muted-foreground",
  };

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <BrandLayout brandName={brand?.name} brandStatus={brand?.status} brandPlan={brand?.plan_tier}>
      <div className="space-y-5">
        <TierBanner tier="free" />
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1">Analytics</h1>
          <p className="text-sm text-muted-foreground">Track clicks, orders, and top performing creators.</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {DATE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={dateRange === opt.value ? "default" : "outline"}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => setDateRange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total Clicks"
            value={totals.clicks.toLocaleString()}
            icon={<MousePointerClick className="h-4 w-4 text-muted-foreground" />}
          />
          <KpiCard
            label="Total Orders"
            value={totals.orders.toLocaleString()}
            icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
          />
          <KpiCard
            label="Total Sales"
            value={formatZAR(totals.gmv)}
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          />
          <KpiCard
            label="Commission Paid"
            value={formatZAR(totals.commission)}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Top Creators
          </h2>
          <Card>
            {loading ? (
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            ) : sortedCreators.length === 0 ? (
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-muted-foreground max-w-md">
                  No sales data yet. Share your affiliate links with creators to start tracking performance.
                </p>
              </CardContent>
            ) : (
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
                  {sortedCreators.map((row) => (
                    <TableRow key={row.creator_id}>
                      <TableCell>
                        <Link
                          to={`/brand/creator-analytics/${row.creator_id}`}
                          className="flex items-center gap-3 hover:underline"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={row.photo_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {row.display_name?.[0]?.toUpperCase() || "C"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{row.display_name || "Creator"}</span>
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
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> Recent Orders
          </h2>
          <Card>
            {recentOrders.length === 0 ? (
              <CardContent className="flex flex-col items-center justify-center py-16">
                <p className="text-muted-foreground">No orders recorded yet.</p>
              </CardContent>
            ) : (
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
                  {recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">{o.order_id?.slice(0, 8)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={o.photo_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {o.display_name?.[0]?.toUpperCase() || "C"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{o.display_name || "Creator"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatZAR(Number(o.order_total))}</TableCell>
                      <TableCell>{formatZAR(Number(o.commission_amount))}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </BrandLayout>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="text-xl sm:text-2xl font-bold">{value}</div>
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

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useBrandAccount } from "@/hooks/useBrandAccount";
import { BrandLayout } from "@/components/layout/BrandLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, BarChart3, Bookmark, Clock, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const formatZAR = (v: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(v);

interface DashboardStats {
  totalCreators: number;
  savedCreators: number;
  activeCampaigns: number;
  last30Sales: number;
  last30Orders: number;
}

export default function BrandDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { brand, loading: brandLoading } = useBrandAccount();
  const [stats, setStats] = useState<DashboardStats | null>(null);

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
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [creatorsRes, savedRes, mentionsRes, giftsRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("onboarding_completed", true),
        supabase
          .from("brand_saved_list_items")
          .select("creator_id, brand_saved_lists!inner(brand_id)")
          .eq("brand_saved_lists.brand_id", brand.id),
        supabase
          .from("mention_campaigns" as any)
          .select("id", { count: "exact", head: true })
          .eq("brand_id", brand.id)
          .eq("status", "active"),
        supabase
          .from("gift_campaigns")
          .select("id", { count: "exact", head: true })
          .eq("brand_id", brand.id)
          .eq("status", "active"),
        supabase.from("affiliate_orders").select("order_total").eq("brand_id", brand.id).gte("created_at", since),
      ]);

      if (cancelled) return;

      const savedUnique = new Set((savedRes.data || []).map((r: any) => r.creator_id)).size;
      const orders = ordersRes.data || [];
      const sales = orders.reduce((s: number, o: any) => s + Number(o.order_total || 0), 0);

      setStats({
        totalCreators: creatorsRes.count || 0,
        savedCreators: savedUnique,
        activeCampaigns: (mentionsRes.count || 0) + (giftsRes.count || 0),
        last30Sales: sales,
        last30Orders: orders.length,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [brand]);

  if (authLoading || roleLoading || brandLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (brand?.status === "pending") {
    return (
      <BrandLayout brandName={brand.name} brandStatus={brand.status} brandPlan={brand.plan_tier}>
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-yellow-500" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4">Account Pending Approval</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Your brand account is being reviewed. You'll receive an email once it's approved.
          </p>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Brand Name: <span className="font-medium text-foreground">{brand.name}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </BrandLayout>
    );
  }

  return (
    <BrandLayout brandName={brand?.name} brandStatus={brand?.status} brandPlan={brand?.plan_tier}>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Welcome, {brand?.name || "Brand"}
          </h1>
          <p className="text-muted-foreground">Discover and connect with creators that match your brand.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Discoverable Creators</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCreators ?? "—"}</div>
              <p className="text-xs text-muted-foreground">In your reach</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saved Creators</CardTitle>
              <Bookmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.savedCreators ?? "—"}</div>
              <p className="text-xs text-muted-foreground">Across your lists</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeCampaigns ?? "—"}</div>
              <p className="text-xs text-muted-foreground">Paid collaborations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 30d Sales</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats ? formatZAR(stats.last30Sales) : "—"}</div>
              <p className="text-xs text-muted-foreground">{stats?.last30Orders ?? 0} orders</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Discover Creators</CardTitle>
              <CardDescription>Search and filter creators by niche, location, and engagement metrics.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/brand/creators">Browse Creators</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>Track clicks, orders, and top performing creators.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link to="/brand/analytics">View Analytics</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </BrandLayout>
  );
}

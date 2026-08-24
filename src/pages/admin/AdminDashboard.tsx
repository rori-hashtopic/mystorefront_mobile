import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Building2, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { AppFooter } from "@/components/layout/AppFooter";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalUsers: number | null;
  creators: number | null;
  brands: number | null;
  pendingReview: number | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: null,
    creators: null,
    brands: null,
    pendingReview: null,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role && role !== "admin") {
      navigate("/");
    }
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    if (!user || role !== "admin") return;

    async function fetchStats() {
      setStatsLoading(true);
      try {
        const [profilesRes, creatorsRes, brandsRes, pendingWaitlistRes, pendingApplicationsRes] = await Promise.all([
          // Total users: count all profiles
          supabase.rpc("get_all_profiles_admin"),

          // Creators: count user_roles where role = 'creator'
          supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "creator"),

          // Brands: count all brand_accounts
          supabase.rpc("get_all_brand_accounts"),

          // Pending review: waitlist entries with status 'pending' or 'invited'
          supabase
            .from("creator_waitlist" as any)
            .select("*", { count: "exact", head: true })
            .in("status", ["pending", "invited"]),

          // Pending review: applications with status 'pending'
          supabase
            .from("creator_applications" as any)
            .select("*", { count: "exact", head: true })
            .eq("status", "pending"),
        ]);

        const totalUsers = profilesRes.data ? (profilesRes.data as any[]).length : 0;
        const creators = creatorsRes.count ?? 0;
        const brands = brandsRes.data ? (brandsRes.data as any[]).length : 0;
        const pendingReview = (pendingWaitlistRes.count ?? 0) + (pendingApplicationsRes.count ?? 0);

        setStats({ totalUsers, creators, brands, pendingReview });
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      } finally {
        setStatsLoading(false);
      }
    }

    fetchStats();
  }, [user, role]);

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderStat = (value: number | null) => {
    if (statsLoading) {
      return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    }
    return value ?? 0;
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, creators, brands, and platform settings.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/admin/users">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{renderStat(stats.totalUsers)}</div>
                <p className="text-xs text-muted-foreground">All registered users</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/creators">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Creators</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{renderStat(stats.creators)}</div>
                <p className="text-xs text-muted-foreground">Active creators</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/brands">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Brands</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{renderStat(stats.brands)}</div>
                <p className="text-xs text-muted-foreground">Registered brands</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/moderation">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{renderStat(stats.pendingReview)}</div>
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <AppFooter />
      </div>
    </AdminLayout>
  );
}

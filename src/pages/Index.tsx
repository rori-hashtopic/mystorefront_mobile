import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { role, loading: roleLoading, assignRole } = useUserRole();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [handlingPendingRole, setHandlingPendingRole] = useState(false);

  useEffect(() => {
    const hasAuthRedirect =
      window.location.hash.includes("access_token=") || window.location.hash.includes("refresh_token=");
    if (authLoading || user) return;
    if (hasAuthRedirect) return;

    // Don't bounce to /landing on a momentary null user — verify with the SDK
    // first so a transient token refresh doesn't look like a sign-out.
    let cancelled = false;
    const verifyAndRedirect = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        navigate("/landing");
      }
    };
    const timer = window.setTimeout(verifyAndRedirect, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user, authLoading, navigate]);

  // Handle pending role from email verification redirect
  useEffect(() => {
    const pendingRole = searchParams.get("pending_role") as "creator" | "shopper" | null;

    if (!authLoading && !roleLoading && user && role === null && pendingRole) {
      setHandlingPendingRole(true);

      const setupRole = async () => {
        try {
          await assignRole(pendingRole);

          if (pendingRole === "shopper") {
            // Create shopper profile
            await supabase.from("shopper_profiles").upsert(
              {
                user_id: user.id,
                name: user.user_metadata?.display_name || "",
                marketing_consent: true,
              },
              { onConflict: "user_id" },
            );

            navigate("/explore", { replace: true });
          } else if (pendingRole === "creator") {
            // Will show onboarding via the existing logic below
            navigate("/", { replace: true });
            window.location.reload();
          }
        } catch (error) {
          console.error("Error assigning pending role:", error);
          navigate("/role-selection");
        } finally {
          setHandlingPendingRole(false);
        }
      };

      setupRole();
      return;
    }
  }, [user, role, authLoading, roleLoading, searchParams]);

  // Redirect based on role
  useEffect(() => {
    if (handlingPendingRole) return;
    if (!roleLoading && role) {
      if (role === "creator") {
        navigate("/shop");
      } else if (role === "brand") {
        navigate("/brand");
      } else if (role === "admin") {
        navigate("/admin");
      } else if (role === "shopper") {
        navigate("/explore");
      }
    }
  }, [role, roleLoading, navigate, handlingPendingRole]);

  // If no role assigned and no pending role, redirect to role selection
  useEffect(() => {
    if (handlingPendingRole) return;
    const pendingRole = searchParams.get("pending_role");
    if (!authLoading && !roleLoading && user && role === null && !pendingRole) {
      navigate("/role-selection");
    }
  }, [user, role, authLoading, roleLoading, navigate, handlingPendingRole, searchParams]);

  useEffect(() => {
    if (profile && !profile.onboarding_completed && role === "creator") {
      setShowOnboarding(true);
    }
  }, [profile, role]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (authLoading || profileLoading || roleLoading || handlingPendingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // If role is brand or admin, they'll be redirected above
  if (role && role !== "creator") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show onboarding if not completed (for creators)
  if (showOnboarding && profile) {
    return (
      <OnboardingWizard
        userId={user.id}
        displayName={profile.display_name || user.email?.split("@")[0] || ""}
        initialStep={profile.onboarding_step || 0}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-6">Welcome to MyStorefront</h1>
        <p className="text-muted-foreground text-lg">
          Start creating affiliate links and earning from your product recommendations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="card-elevated p-6">
            <h3 className="font-semibold text-foreground mb-2">Quick Stats</h3>
            <p className="text-3xl font-bold text-primary">$0.00</p>
            <p className="text-sm text-muted-foreground">Total Earnings</p>
          </div>
          <div className="card-elevated p-6">
            <h3 className="font-semibold text-foreground mb-2">Links Created</h3>
            <p className="text-3xl font-bold text-foreground">0</p>
            <p className="text-sm text-muted-foreground">Affiliate Links</p>
          </div>
          <div className="card-elevated p-6">
            <h3 className="font-semibold text-foreground mb-2">Total Clicks</h3>
            <p className="text-3xl font-bold text-foreground">0</p>
            <p className="text-sm text-muted-foreground">Link Clicks</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;

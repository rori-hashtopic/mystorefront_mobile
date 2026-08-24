import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "creator" | "shopper" | "brand" | "admin";

const roleRedirects: Record<AppRole, string> = {
  creator: "/shop",
  shopper: "/explore",
  brand: "/brand",
  admin: "/admin",
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    const finishAuth = async () => {
      const pendingRole = (searchParams.get("pending_role") || searchParams.get("role")) as AppRole | null;

      const waitForSession = async () => {
        const existing = await supabase.auth.getSession();
        if (existing.data.session) return existing.data.session;

        return new Promise<typeof existing.data.session>((resolve) => {
          const timeout = window.setTimeout(() => {
            subscription.unsubscribe();
            resolve(null);
          }, 4000);

          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
              window.clearTimeout(timeout);
              subscription.unsubscribe();
              resolve(session);
            }
          });
        });
      };

      const session = await waitForSession();
      if (cancelled) return;

      if (!session?.user) {
        navigate("/auth", { replace: true });
        return;
      }

      if (pendingRole === "shopper") {
        await supabase
          .from("user_roles")
          .upsert({ user_id: session.user.id, role: "shopper" }, { onConflict: "user_id" });

        await supabase.from("shopper_profiles").upsert(
          {
            user_id: session.user.id,
            name: session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "",
            marketing_consent: true,
          },
          { onConflict: "user_id" },
        );

        navigate(roleRedirects["shopper"], { replace: true });
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const role = roleData?.role as AppRole | undefined;
      navigate(role ? roleRedirects[role] || "/" : "/role-selection", { replace: true });
    };

    finishAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

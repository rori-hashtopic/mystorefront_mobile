import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "creator" | "brand" | "admin" | "shopper";

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user role:", error);
          setRole(null);
        } else if (data) {
          setRole(data.role as AppRole);
        } else {
          // No role assigned yet - default to creator
          setRole(null);
        }
      } catch (err) {
        console.error("Error in useUserRole:", err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchRole();
    }
  }, [user, authLoading]);

  const assignRole = async (newRole: AppRole) => {
    if (!user) return { error: new Error("No user logged in") };

    const { error } = await supabase
      .from("user_roles")
      .upsert({
        user_id: user.id,
        role: newRole,
      }, {
        onConflict: "user_id"
      });

    if (!error) {
      setRole(newRole);
    }

    return { error };
  };

  return {
    role,
    loading: authLoading || loading,
    assignRole,
  };
}

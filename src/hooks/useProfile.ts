import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { TierKey } from "@/lib/creatorTiers";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  bio: string | null;
  photo_url: string | null;
  tier: TierKey;
  onboarding_completed: boolean | null;
  onboarding_step: number | null;
  instagram_connected: boolean | null;
  tiktok_connected: boolean | null;
  username: string | null;
  is_discoverable: boolean | null;
  niche_tags: string[] | null;
  location_tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data: rpcData, error } = await supabase
        .rpc("get_own_profile");
      const data = rpcData?.[0] ?? null;

      if (error) throw error;
      setProfile(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const handleSocialConnectionChanged = () => {
      fetchProfile();
    };

    window.addEventListener("social-connection-changed", handleSocialConnectionChanged);
    return () => window.removeEventListener("social-connection-changed", handleSocialConnectionChanged);
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;
      
      setProfile((prev) => prev ? { ...prev, ...updates } : null);
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  return { profile, loading, error, updateProfile, refetch: fetchProfile };
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CreatorSocials {
  id: string;
  user_id: string;
  instagram_handle: string | null;
  instagram_connected: boolean;
  tiktok_handle: string | null;
  tiktok_connected: boolean;
  youtube_url: string | null;
  other_urls: string[] | null;
}

export function useSocials() {
  const { user } = useAuth();
  const [socials, setSocials] = useState<CreatorSocials | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSocials = async () => {
    if (!user) {
      setSocials(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch creator_socials, instagram_connections, and tiktok_connections
      const [socialsResult, igConnectionResult, tkConnectionResult] = await Promise.all([
        supabase.from("creator_socials").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("instagram_connections").select("username, status").eq("creator_id", user.id).maybeSingle(),
        supabase.from("tiktok_connections").select("username, status").eq("creator_id", user.id).maybeSingle(),
      ]);

      if (socialsResult.error) throw socialsResult.error;

      const baseSocials: CreatorSocials = socialsResult.data ?? {
        id: "temp",
        user_id: user.id,
        instagram_handle: null,
        instagram_connected: false,
        tiktok_handle: null,
        tiktok_connected: false,
        youtube_url: null,
        other_urls: null,
      };

      const finalSocials: CreatorSocials = {
        ...baseSocials,
        instagram_handle:
          igConnectionResult.data?.status === "connected"
            ? igConnectionResult.data.username
            : baseSocials.instagram_handle || null,
        instagram_connected: igConnectionResult.data?.status === "connected",
        tiktok_handle:
          tkConnectionResult.data?.status === "connected"
            ? tkConnectionResult.data.username
            : baseSocials.tiktok_handle || null,
        tiktok_connected: tkConnectionResult.data?.status === "connected",
      };

      setSocials(finalSocials);
    } catch (err) {
      console.error("Error fetching socials:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocials();
  }, [user]);

  useEffect(() => {
    const handleSocialConnectionChanged = () => {
      fetchSocials();
    };

    window.addEventListener("social-connection-changed", handleSocialConnectionChanged);
    return () => window.removeEventListener("social-connection-changed", handleSocialConnectionChanged);
  }, [user]);

  return { socials, loading, refetch: fetchSocials };
}

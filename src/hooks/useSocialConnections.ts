import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { detectInAppBrowser } from "@/lib/inAppBrowser";

export type ConnectionStatus = "connected" | "disconnected" | "error" | "token_expired";

export interface InstagramConnection {
  id: string;
  username: string;
  follower_count: number;
  following_count: number;
  profile_picture_url: string | null;
  last_sync_at: string | null;
  status: ConnectionStatus;
  sync_error: string | null;
  connected_at: string;
  reach: number | null;
  impressions: number | null;
  engagement_rate: number | null;
}

export interface TikTokConnection {
  id: string;
  username: string;
  display_name: string | null;
  follower_count: number;
  following_count: number;
  video_count: number;
  likes_count: number;
  profile_picture_url: string | null;
  last_sync_at: string | null;
  status: ConnectionStatus;
  sync_error: string | null;
  connected_at: string;
}

export function useSocialConnections() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [instagramConnection, setInstagramConnection] = useState<InstagramConnection | null>(null);
  const [tiktokConnection, setTiktokConnection] = useState<TikTokConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState<{ instagram: boolean; tiktok: boolean }>({
    instagram: false,
    tiktok: false,
  });

  const fetchConnections = useCallback(async () => {
    if (!user) {
      setInstagramConnection(null);
      setTiktokConnection(null);
      setLoading(false);
      return;
    }

    try {
      const [igResult, ttResult] = await Promise.all([
        supabase
          .from("instagram_connections")
          .select(
            "id, creator_id, username, follower_count, following_count, profile_picture_url, last_sync_at, status, sync_error, connected_at, reach, impressions, engagement_rate",
          )
          .eq("creator_id", user.id)
          .maybeSingle(),
        supabase
          .from("tiktok_connections")
          .select(
            "id, creator_id, username, display_name, follower_count, following_count, video_count, likes_count, profile_picture_url, last_sync_at, status, sync_error, connected_at, bio_description",
          )
          .eq("creator_id", user.id)
          .maybeSingle(),
      ]);

      setInstagramConnection(!igResult.error ? (igResult.data as InstagramConnection | null) : null);
      setTiktokConnection(!ttResult.error ? (ttResult.data as TikTokConnection | null) : null);
    } catch (err) {
      console.error("Error fetching social connections:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Connect Instagram via Meta OAuth — redirects to Instagram's auth page
  const connectInstagram = useCallback(
    async (origin?: string) => {
      if (!user) return;

      // In-app webviews (Instagram, Facebook, TikTok, the Google app, etc.)
      // reliably break Meta OAuth. Short-circuit and guide the user to open
      // the page in a real browser instead of redirecting into a dead end.
      const inApp = detectInAppBrowser();
      if (inApp.isInApp) {
        // Best-effort: copy the current URL so the user can paste it into Safari/Chrome.
        try {
          await navigator.clipboard?.writeText(window.location.href);
        } catch {
          // Clipboard may be unavailable in some webviews — safe to ignore.
        }

        const host = inApp.appLabel ?? "this app";
        const browser = inApp.platform === "ios" ? "Safari" : "your browser";
        toast({
          title: "Open in your browser to connect",
          description: `Instagram login doesn't work inside ${host}. Tap the menu and choose "Open in ${browser}", then try again. The link has been copied.`,
          variant: "destructive",
        });
        return;
      }

      try {
        toast({
          title: "Connecting Instagram...",
          description: "Redirecting to Instagram.",
        });

        const { data, error } = await supabase.functions.invoke("instagram-oauth-start", {
          body: { origin: origin || window.location.pathname },
        });

        if (error || !data?.url) {
          console.error("Error starting Instagram OAuth:", error);
          toast({
            title: "Connection Failed",
            description: "Could not start Instagram connection. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Full page redirect — Meta OAuth does not support popups on mobile
        window.location.href = data.url;
      } catch (err: any) {
        console.error("Error connecting Instagram:", err);
        toast({
          title: "Connection Failed",
          description: err.message || "Failed to connect Instagram",
          variant: "destructive",
        });
      }
    },
    [user, toast],
  );

  // TikTok connection — placeholder until TikTok OAuth is implemented
  const connectTikTok = useCallback(async () => {
    toast({
      title: "Coming Soon",
      description: "TikTok connection will be available shortly.",
    });
  }, [toast]);

  // Disconnect Instagram
  const disconnectInstagram = useCallback(async () => {
    if (!user || !instagramConnection) return;

    try {
      const { error } = await supabase.from("instagram_connections").delete().eq("id", instagramConnection.id);

      if (error) throw error;

      setInstagramConnection(null);

      await supabase.from("profiles").update({ instagram_connected: false }).eq("id", user.id);

      await supabase.from("creator_socials").update({ instagram_connected: false }).eq("user_id", user.id);

      toast({
        title: "Disconnected",
        description: "Your Instagram account has been disconnected.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to disconnect Instagram",
        variant: "destructive",
      });
    }
  }, [user, instagramConnection, toast]);

  // Disconnect TikTok
  const disconnectTikTok = useCallback(async () => {
    if (!user || !tiktokConnection) return;

    try {
      const { error } = await supabase.from("tiktok_connections").delete().eq("id", tiktokConnection.id);

      if (error) throw error;

      setTiktokConnection(null);

      await supabase.from("profiles").update({ tiktok_connected: false }).eq("id", user.id);

      await supabase.from("creator_socials").update({ tiktok_connected: false }).eq("user_id", user.id);

      toast({
        title: "Disconnected",
        description: "Your TikTok account has been disconnected.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to disconnect TikTok",
        variant: "destructive",
      });
    }
  }, [user, tiktokConnection, toast]);

  // Refresh Instagram — re-fetches profile data using stored Meta access token
  const refreshInstagram = useCallback(async () => {
    if (!instagramConnection) return;

    setIsSyncing((prev) => ({ ...prev, instagram: true }));
    try {
      toast({
        title: "Syncing Instagram...",
        description: "Fetching latest data from Instagram.",
      });

      const { error: syncError } = await supabase.functions.invoke("instagram-sync", {
        body: { connectionId: instagramConnection.id },
      });

      // Also run the full profile refresh so post thumbnails are cached into
      // private storage (instagram-sync only touches stats). Best-effort: if
      // this fails we still fall through with the stats update from sync.
      const { data: refreshData, error: refreshInvokeError } = await supabase.functions.invoke(
        "instagram-refresh-profile",
        { body: {} },
      );
      const refreshError =
        refreshInvokeError || ((refreshData as any)?.error ? new Error((refreshData as any).error) : null);

      await fetchConnections();

      if (syncError || refreshError) {
        const anyError = syncError || refreshError;
        console.error("Sync error:", anyError);
        const { data: fresh } = await supabase
          .from("instagram_connections")
          .select("status, sync_error")
          .eq("id", instagramConnection.id)
          .maybeSingle();

        const expired = (fresh as any)?.status === "token_expired";
        toast({
          title: expired ? "Reconnect Instagram" : "Sync Failed",
          description: expired
            ? "Your Instagram session has expired (this usually happens after a password change). Please reconnect your Instagram account to sync again."
            : (fresh as any)?.sync_error || "Couldn't fetch data from Instagram. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sync Complete",
        description: "Your Instagram data has been updated.",
      });
    } catch (err: any) {
      toast({
        title: "Sync Failed",
        description: err.message || "Failed to refresh Instagram data",
        variant: "destructive",
      });
    } finally {
      setIsSyncing((prev) => ({ ...prev, instagram: false }));
    }
  }, [instagramConnection, toast, fetchConnections]);

  // Refresh TikTok — placeholder until TikTok OAuth is implemented
  const refreshTikTok = useCallback(async () => {
    if (!tiktokConnection) return;

    setIsSyncing((prev) => ({ ...prev, tiktok: true }));
    try {
      toast({
        title: "Syncing TikTok...",
        description: "Fetching latest data.",
      });

      await fetchConnections();

      toast({
        title: "Sync Complete",
        description: "Your TikTok data has been updated.",
      });
    } catch (err: any) {
      toast({
        title: "Sync Failed",
        description: err.message || "Failed to refresh TikTok data",
        variant: "destructive",
      });
    } finally {
      setIsSyncing((prev) => ({ ...prev, tiktok: false }));
    }
  }, [tiktokConnection, toast, fetchConnections]);

  return {
    instagramConnection,
    tiktokConnection,
    loading,
    isSyncing,
    connectInstagram,
    connectTikTok,
    disconnectInstagram,
    disconnectTikTok,
    refreshInstagram,
    refreshTikTok,
    refetch: fetchConnections,
  };
}

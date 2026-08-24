import { Instagram, RefreshCw, Users, Eye, BarChart3, TrendingUp, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { InstagramConnection } from "@/hooks/useSocialConnections";

interface InstagramAnalyticsCardProps {
  connection: InstagramConnection | null;
  loading: boolean;
  isSyncing: boolean;
  onConnect: () => void;
  onRefresh: () => void;
  instagramHandleFromOnboarding?: string | null;
}

export function InstagramAnalyticsCard({
  connection,
  loading,
  isSyncing,
  onConnect,
  onRefresh,
  instagramHandleFromOnboarding,
}: InstagramAnalyticsCardProps) {
  if (loading) {
    return (
      <div className="border border-border p-6 sm:p-8 mb-8 sm:mb-12">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="h-8 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!connection) {
    // Creator connected Instagram during onboarding but OAuth/sync hasn't completed yet
    if (instagramHandleFromOnboarding) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="border border-border p-6 sm:p-8 mb-8 sm:mb-12"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Instagram className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">Instagram Analytics</p>
                <p className="text-sm text-muted-foreground">
                  @{instagramHandleFromOnboarding.replace(/^@+/, "")} · Sync in progress — analytics will appear
                  shortly.
                </p>
              </div>
            </div>
            <button
              onClick={onConnect}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 self-start"
            >
              Reconnect
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      );
    }

    // Never connected
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border border-border p-6 sm:p-8 mb-8 sm:mb-12"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Instagram className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">Instagram Analytics</p>
              <p className="text-sm text-muted-foreground">
                Connect your Instagram to see followers, reach, impressions & engagement.
              </p>
            </div>
          </div>
          <button
            onClick={onConnect}
            className="text-sm text-foreground hover:text-muted-foreground transition-colors inline-flex items-center gap-1.5 border-b border-foreground pb-1 self-start"
          >
            Connect Instagram
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  const stats = [
    {
      label: "Followers",
      value: formatNumber(connection.follower_count || 0),
      icon: Users,
    },
    {
      label: "Reach",
      value: formatNumber(connection.reach || 0),
      icon: Eye,
    },
    {
      label: "Impressions",
      value: formatNumber(connection.impressions || 0),
      icon: BarChart3,
    },
    {
      label: "Engagement",
      // engagement_rate is already stored as a percentage (the sync multiplies by
      // 100), so don't multiply again. Clamp to 100% so tiny-follower accounts
      // can't show absurd values.
      value: `${Math.min(connection.engagement_rate || 0, 100).toFixed(2)}%`,
      icon: TrendingUp,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border border-border p-6 sm:p-8 mb-8 sm:mb-12"
    >
      {(connection.status === "token_expired" || connection.status === "error") && (
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            Your Instagram connection expired — these numbers may be out of date. Reconnect to resume syncing.
          </p>
          <button
            onClick={onConnect}
            className="inline-flex items-center gap-1.5 self-start whitespace-nowrap border-b border-foreground pb-0.5 text-sm font-medium text-foreground transition-opacity hover:opacity-70"
          >
            Reconnect
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Instagram className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Instagram Analytics</p>
            <p className="text-sm text-muted-foreground">
              @{connection.username}
              {connection.last_sync_at && (
                <span className="ml-2 text-xs">· Synced {new Date(connection.last_sync_at).toLocaleDateString()}</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={isSyncing}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 min-h-[44px] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">{stat.label}</p>
            <p className="font-display text-2xl sm:text-3xl text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

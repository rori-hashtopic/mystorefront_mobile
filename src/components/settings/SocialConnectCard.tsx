import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertTriangle, Instagram, Info, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InAppBrowserNotice } from "@/components/InAppBrowserNotice";
import type { ConnectionStatus } from "@/hooks/useSocialConnections";

// TikTok icon component
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  );
}

interface ConnectionData {
  id: string;
  username: string;
  displayName?: string | null;
  followerCount: number;
  followingCount: number;
  profilePictureUrl: string | null;
  lastSyncAt: string | null;
  status: ConnectionStatus;
  syncError: string | null;
  extraMetrics?: { label: string; value: string | number }[];
}

interface SocialConnectCardProps {
  platform: "instagram" | "tiktok";
  connection: ConnectionData | null;
  isConnecting?: boolean;
  isSyncing?: boolean;
  collapsed?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}

const platformConfig = {
  instagram: {
    name: "Instagram",
    icon: Instagram,
    iconClass: "text-pink-500",
    bgClass: "bg-pink-500/10",
    gradientClass: "from-purple-500 to-pink-500",
    description: "Connect your Instagram professional account to share analytics with brands.",
  },
  tiktok: {
    name: "TikTok",
    icon: TikTokIcon,
    iconClass: "text-foreground",
    bgClass: "bg-foreground/10",
    gradientClass: "from-cyan-400 via-pink-500 to-red-500",
    description: "Connect your TikTok account to share your content metrics with brands.",
  },
};

const statusConfig: Record<ConnectionStatus, { color: string; icon: typeof CheckCircle }> = {
  connected: { color: "bg-green-500/20 text-green-500", icon: CheckCircle },
  disconnected: { color: "bg-muted text-muted-foreground", icon: XCircle },
  error: { color: "bg-destructive/20 text-destructive", icon: XCircle },
  token_expired: { color: "bg-yellow-500/20 text-yellow-500", icon: AlertTriangle },
};

export function SocialConnectCard({
  platform,
  connection,
  isConnecting = false,
  isSyncing = false,
  collapsed = false,
  onConnect,
  onDisconnect,
  onRefresh,
}: SocialConnectCardProps) {
  const config = platformConfig[platform];
  const Icon = config.icon;
  const isComingSoon = platform === "tiktok";

  if (collapsed) {
    return (
      <Card className="opacity-70">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.iconClass}`} />
            {config.name} Connection
            <span className="ml-2 text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              Coming Soon
            </span>
          </CardTitle>
          <CardDescription>TikTok integration is coming soon.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={isComingSoon ? "opacity-60 pointer-events-none" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${config.iconClass}`} />
          {config.name} Connection
          {isComingSoon && (
            <span className="ml-2 text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              Coming Soon
            </span>
          )}
        </CardTitle>
        <CardDescription>{isComingSoon ? "TikTok integration is coming soon." : config.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {connection ? (
          <>
            {/* Connected State */}
            <div className="flex items-center justify-between gap-2 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4 min-w-0">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={connection.profilePictureUrl || undefined} />
                  <AvatarFallback className={`bg-gradient-to-br ${config.gradientClass} text-white`}>
                    <Icon className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    @{connection.username}
                    {connection.displayName && (
                      <span className="text-muted-foreground ml-2 font-normal">({connection.displayName})</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {connection.followerCount.toLocaleString()} followers
                    {connection.extraMetrics?.map((m) => (
                      <span key={m.label}>
                        {" "}
                        · {m.value.toLocaleString()} {m.label}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
              <Badge className={`shrink-0 ${statusConfig[connection.status].color}`}>
                {(() => {
                  const StatusIcon = statusConfig[connection.status].icon;
                  return <StatusIcon className="h-3 w-3 mr-1" />;
                })()}
                {connection.status.replace("_", " ")}
              </Badge>
            </div>

            {/* Token Expired Warning */}
            {connection.status === "token_expired" && (
              <div className="flex items-start gap-3 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium text-yellow-600 dark:text-yellow-400">Token Expired</p>
                  <p className="text-sm text-muted-foreground">
                    Please reconnect your {config.name} account to continue syncing data.
                  </p>
                  {platform === "instagram" && <InAppBrowserNotice className="mt-2" />}
                  <Button size="sm" className="mt-2" onClick={onConnect}>
                    Reconnect
                  </Button>
                </div>
              </div>
            )}

            {/* Sync Error (non-expiry — token expiry has its own block above) */}
            {connection.syncError && connection.status !== "token_expired" && (
              <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium text-destructive">Sync Error</p>
                  <p className="text-sm text-muted-foreground break-words">{connection.syncError}</p>
                  <Button size="sm" className="mt-2" onClick={onConnect}>
                    Reconnect
                  </Button>
                </div>
              </div>
            )}

            {/* Last Sync */}
            {connection.lastSyncAt && (
              <p className="text-sm text-muted-foreground">
                Last synced: {new Date(connection.lastSyncAt).toLocaleString()}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onRefresh} disabled={isSyncing}>
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </>
                )}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Disconnect</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect {config.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove your {config.name} connection and all synced data. Brands will no longer be able
                      to view your {config.name} analytics.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDisconnect}>Disconnect</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        ) : (
          <>
            {/* Not Connected State */}
            <div className="text-center py-8">
              <div className={`w-16 h-16 ${config.bgClass} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <Icon className={`h-8 w-8 ${config.iconClass}`} />
              </div>
              <h3 className="font-semibold text-lg mb-2">Connect {config.name}</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Link your {config.name} account to share your analytics with brands and unlock collaboration
                opportunities.
              </p>
              {platform === "instagram" && (
                <Alert className="text-left mb-4 max-w-md mx-auto border-yellow-500/30 bg-yellow-500/5">
                  <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
                    To connect, you need: <strong className="text-foreground">1.</strong> An Instagram Creator or
                    Business account, and <strong className="text-foreground">2.</strong> Your Instagram account must be
                    linked to a Facebook Business Page.
                  </AlertDescription>
                </Alert>
              )}
              {platform === "instagram" && <InAppBrowserNotice className="mb-4 max-w-md mx-auto" />}
              <Button onClick={onConnect} disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Icon className="h-4 w-4 mr-2" />
                    Connect {config.name}
                  </>
                )}
              </Button>
            </div>

            {/* Data Consent Notice */}
            <Separator />
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 font-medium text-sm w-full text-left py-2 group">
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                What data is shared?
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 bg-muted/50 rounded-lg mt-2">
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Profile information (handle, bio, profile picture)</li>
                    <li>• Follower and following counts</li>
                    <li>• Recent posts and engagement metrics</li>
                    {platform === "tiktok" && <li>• Video views and likes</li>}
                    <li>• Audience demographics (where available)</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-3">
                    Brands can view this data to evaluate potential collaborations. You can disconnect at any time.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { BrandLayout } from "@/components/layout/BrandLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  ArrowLeft,
  Instagram,
  Users,
  Heart,
  MessageCircle,
  MapPin,
  TrendingUp,
  Download,
  RefreshCw,
  Mail,
  Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TIER_LABELS, type TierKey } from "@/lib/creatorTiers";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

interface CreatorProfile {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  bio: string | null;
  location_tags: string[] | null;
  niche_tags: string[] | null;
  tier: string | null;
  instagram_connected: boolean | null;
}

interface InstagramConnection {
  id: string;
  username: string;
  follower_count: number;
  following_count: number;
  profile_picture_url: string | null;
  bio_description: string | null;
  last_sync_at: string | null;
  status: string;
  reach?: number;
  impressions?: number;
  engagement_rate?: number;
  media_count?: number;
  sync_error?: string | null;
}

interface InstagramPost {
  id: string;
  ig_media_id: string;
  timestamp: string;
  media_url: string | null;
  thumbnail_url: string | null;
  media_type: string | null;
  cached_media_path: string | null;
  caption_snippet: string | null;
  like_count: number;
  comment_count: number;
  permalink: string | null;
  is_sponsored: boolean;
}

interface GrowthSnapshot {
  month: string;
  follower_count: number;
  following_count: number;
}

interface KpiSnapshot {
  period_start: string;
  period_end: string;
  avg_likes: number;
  avg_comments: number;
  engagement_rate: number;
  post_count: number;
}

interface Demographic {
  demographic_type: string;
  demographic_key: string;
  value: number;
  audience_type: string;
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function DemographicCard({
  title,
  data,
  emptyMessage = "No data available",
}: {
  title: string;
  data: { label: string; value: number }[];
  emptyMessage?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          data.map((row) => (
            <div key={row.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-foreground">{row.label}</span>
                <span className="text-muted-foreground">{row.value.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-foreground rounded-full" style={{ width: `${Math.min(100, row.value)}%` }} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function CreatorAnalytics() {
  const { creatorId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [instagram, setInstagram] = useState<InstagramConnection | null>(null);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  // Signed URLs for cached post thumbnails (private instagram-media bucket).
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [failedSrc, setFailedSrc] = useState<Set<string>>(new Set());
  const [growth, setGrowth] = useState<GrowthSnapshot[]>([]);
  const [kpis, setKpis] = useState<KpiSnapshot[]>([]);
  const [demographics, setDemographics] = useState<Demographic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role && role !== "brand" && role !== "admin") navigate("/");
  }, [role, roleLoading, navigate]);

  const fetchCreatorData = async () => {
    if (!creatorId) return;

    const [profileRes, instagramRes, postsRes, growthRes, kpisRes, demographicsRes, tagsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, bio, photo_url, niche_tags, location_tags, tier, instagram_connected")
        .eq("id", creatorId)
        .single(),
      supabase
        .from("instagram_connections")
        .select(
          "id, username, follower_count, following_count, profile_picture_url, last_sync_at, status, sync_error, reach, impressions, engagement_rate, bio_description, media_count",
        )
        .eq("creator_id", creatorId)
        .maybeSingle(),
      supabase
        .from("instagram_posts")
        .select("*")
        .eq("creator_id", creatorId)
        .order("timestamp", { ascending: false })
        .limit(30),
      supabase
        .from("instagram_growth_snapshots")
        .select("*")
        .eq("creator_id", creatorId)
        .order("month", { ascending: true }),
      supabase
        .from("creator_kpi_snapshots")
        .select("*")
        .eq("creator_id", creatorId)
        .order("period_start", { ascending: false })
        .limit(12),
      supabase.from("instagram_audience_demographics").select("*").eq("creator_id", creatorId),
      supabase.from("creator_tags").select("niches").eq("user_id", creatorId).maybeSingle(),
    ]);

    if (profileRes.data) {
      const profile = profileRes.data as any;
      if (tagsRes.data?.niches) profile.niche_tags = tagsRes.data.niches;
      setCreator(profile);
    }
    if (instagramRes.data) setInstagram(instagramRes.data as any);
    if (postsRes.data) {
      setPosts(postsRes.data as any);
      // Mint short-lived signed URLs for cached thumbnails so images don't 403
      // when Instagram's CDN links expire.
      const paths = (postsRes.data as any[]).map((p) => p.cached_media_path).filter((p): p is string => Boolean(p));
      if (paths.length > 0) {
        const { data: signed, error: signErr } = await supabase.storage
          .from("instagram-media")
          .createSignedUrls(paths, 60 * 60);
        if (signErr)
          console.error("Failed to sign cached media (is the storage read policy applied?):", signErr.message);
        const map: Record<string, string> = {};
        (signed || []).forEach((s: any) => {
          if (s?.path && s?.signedUrl) map[s.path] = s.signedUrl;
        });
        setMediaUrls(map);
      }
    }
    if (growthRes.data) setGrowth(growthRes.data as any);
    if (kpisRes.data) setKpis(kpisRes.data as any);
    if (demographicsRes.data) setDemographics(demographicsRes.data as any);

    setLoading(false);
  };

  useEffect(() => {
    if (user && creatorId) fetchCreatorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, creatorId]);

  const handleRefreshData = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const previousSyncMs = instagram?.last_sync_at ? new Date(instagram.last_sync_at).getTime() : 0;
    try {
      const { data, error } = await supabase.functions.invoke("instagram-refresh-profile", {
        body: { creator_id: creatorId },
      });
      // Dead/expired token (401 token_expired) OR no connection row (404) both
      // mean the creator must reconnect before we can pull fresh data.
      const payloadErr = (data && (data as any).error) || (error && (error as any).context?.error) || null;
      const httpStatus = (error as any)?.context?.status;
      if (
        payloadErr === "token_expired" ||
        payloadErr === "No Instagram connection found" ||
        httpStatus === 401 ||
        httpStatus === 404
      ) {
        toast.error("Instagram needs reconnecting", {
          description: "This creator needs to reconnect their Instagram to refresh data.",
        });
        await fetchCreatorData();
        return;
      }
      if (error) throw error;

      if (instagram?.id) {
        for (let attempt = 0; attempt < 10; attempt++) {
          const { data: fresh } = await supabase
            .from("instagram_connections")
            .select("last_sync_at")
            .eq("id", instagram.id)
            .maybeSingle();
          const currentSyncMs = fresh?.last_sync_at ? new Date(fresh.last_sync_at).getTime() : 0;
          if (currentSyncMs > previousSyncMs) break;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
      await fetchCreatorData();
      toast.success("Instagram data refreshed");
    } catch (e) {
      console.error("Error refreshing data:", e);
      toast.error("Refresh failed", { description: "Please try again." });
    } finally {
      setIsSyncing(false);
    }
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !creator) return null;

  const latestKpi = kpis[0];

  // A creator has "ever connected" if they have a connection row (any status) or
  // any synced posts — show them as connected on the brand view even after their
  // token dies, and keep Refresh Data available.
  const everConnected = !!instagram || posts.length > 0;

  // Fall back to the most recent growth snapshot when the connection row is gone
  // (token expired / disconnected) so Followers + Engagement keep showing the
  // last-known values instead of "--".
  const resolvedFollowers = instagram?.follower_count ?? growth[growth.length - 1]?.follower_count ?? null;

  const engagementRate = (() => {
    let pct: number | null = null;
    if (instagram?.engagement_rate && instagram.engagement_rate > 0) {
      pct = instagram.engagement_rate;
    } else if (latestKpi?.engagement_rate && latestKpi.engagement_rate > 0) {
      pct = latestKpi.engagement_rate * 100;
    } else if (posts.length > 0 && resolvedFollowers && resolvedFollowers > 0) {
      pct =
        (posts.reduce((acc, p) => acc + p.like_count + p.comment_count, 0) / posts.length / resolvedFollowers) * 100;
    }
    // Clamp to 100% so tiny-follower accounts / stale values can't show absurd rates.
    return pct === null ? "--" : Math.min(pct, 100).toFixed(2);
  })();

  const avgLikesNum = latestKpi?.avg_likes
    ? Math.round(latestKpi.avg_likes)
    : posts.length > 0
      ? Math.round(posts.reduce((acc, p) => acc + p.like_count, 0) / posts.length)
      : null;

  const avgCommentsNum = latestKpi?.avg_comments
    ? Math.round(latestKpi.avg_comments)
    : posts.length > 0
      ? Math.round(posts.reduce((acc, p) => acc + p.comment_count, 0) / posts.length)
      : null;

  const avgLikes = avgLikesNum !== null ? avgLikesNum.toLocaleString() : "--";
  const avgComments = avgCommentsNum !== null ? avgCommentsNum.toLocaleString() : "--";

  const topPosts = [...posts]
    .sort((a, b) => {
      // Posts with a cached thumbnail render reliably — rank them first so broken/
      // uncached tiles (deleted posts, expired CDN URLs) sink below real images.
      // Then rank by engagement. Uncached posts still appear (as placeholders)
      // when there aren't 3 cached ones, so token-expired creators still show
      // their posts instead of "No posts available yet".
      const aCached = a.cached_media_path ? 1 : 0;
      const bCached = b.cached_media_path ? 1 : 0;
      if (aCached !== bCached) return bCached - aCached;
      return b.like_count + b.comment_count - (a.like_count + a.comment_count);
    })
    .slice(0, 3);

  // Growth: last 6 months
  const growthData = growth.slice(-6).map((g) => ({
    month: new Date(g.month).toLocaleString("en-ZA", { month: "short" }),
    followers: g.follower_count,
  }));

  const ageGroups = demographics
    .filter((d) => d.demographic_type === "age" && d.audience_type === "followers")
    .map((d) => ({ label: d.demographic_key, value: d.value }));
  const genderSplit = demographics
    .filter((d) => d.demographic_type === "gender" && d.audience_type === "followers")
    .map((d) => ({ label: d.demographic_key, value: d.value }));
  const topCities = demographics
    .filter((d) => d.demographic_type === "city" && d.audience_type === "followers")
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((d) => ({ label: d.demographic_key, value: d.value }));
  const demographicsUnavailable = Boolean(instagram?.sync_error?.includes("demographics_unavailable"));
  const demographicsEmptyMessage = demographicsUnavailable ? "Unavailable from Instagram" : "No data available";

  return (
    <BrandLayout>
      <div className="space-y-8">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={creator.photo_url || instagram?.profile_picture_url || undefined} />
            <AvatarFallback className="text-3xl">{creator.display_name?.[0]?.toUpperCase() || "C"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              {creator.display_name || "Creator"}
            </h1>
            {instagram && (
              <p className="text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Instagram className="h-4 w-4" />@{instagram.username}
                </span>
                {creator.location_tags && creator.location_tags.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {creator.location_tags.join(", ")}
                    </span>
                  </>
                )}
              </p>
            )}
            {(creator.bio || instagram?.bio_description) && (
              <p className="text-foreground mt-3 max-w-xl">{creator.bio || instagram?.bio_description}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {creator.tier && (
                <Badge className="gap-1 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
                  <Star className="h-3 w-3" />
                  {TIER_LABELS[creator.tier as TierKey] || creator.tier} Tier
                </Badge>
              )}
              {creator.niche_tags?.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 md:items-end">
            <div className="flex items-center gap-2">
              {instagram?.last_sync_at && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {new Date(instagram.last_sync_at).toLocaleDateString()}
                </p>
              )}
              <Badge
                className={
                  everConnected
                    ? "bg-green-500/20 text-green-600 hover:bg-green-500/20"
                    : "bg-red-500/20 text-red-600 hover:bg-red-500/20"
                }
              >
                {everConnected ? "connected" : "Not connected"}
              </Badge>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Button variant="outline" size="sm" onClick={handleRefreshData} disabled={isSyncing || !everConnected}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing…" : "Refresh Data"}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button size="sm" asChild>
                <Link to={`/brand/messages?creator=${creatorId}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  Message
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi
            label="Followers"
            value={resolvedFollowers != null ? resolvedFollowers.toLocaleString() : "--"}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
          <Kpi
            label="Engagement"
            value={engagementRate !== "--" ? `${engagementRate}%` : "--"}
            icon={<Heart className="h-4 w-4 text-muted-foreground" />}
          />
          <Kpi label="Avg Likes" value={avgLikes} icon={<Heart className="h-4 w-4 text-muted-foreground" />} />
          <Kpi
            label="Avg Comments"
            value={avgComments}
            icon={<MessageCircle className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        {/* Growth chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Follower growth (6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {growthData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No growth data available yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <RechartsTooltip />
                    <Line
                      type="monotone"
                      dataKey="followers"
                      stroke="hsl(var(--foreground))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top posts */}
        <Card>
          <CardHeader>
            <CardTitle>Top posts</CardTitle>
          </CardHeader>
          <CardContent>
            {topPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No posts available yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topPosts.map((p) => (
                  <a
                    key={p.id}
                    href={p.permalink || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-border rounded-lg overflow-hidden block hover:border-foreground/40 transition-colors"
                  >
                    <div className="aspect-square bg-secondary flex items-center justify-center overflow-hidden">
                      {(() => {
                        // Cached (signed URL) wins. While signed URL is being minted for
                        // a cached path, show placeholder rather than the expiring CDN URL.
                        const cachedUrl = p.cached_media_path ? mediaUrls[p.cached_media_path] : undefined;
                        const isVideo = p.media_type === "VIDEO" || p.media_type === "REEL";
                        // For uncached posts, prefer thumbnail_url (images render in <img>),
                        // fall back to media_url. Never render a raw mp4.
                        const fallback = isVideo ? p.thumbnail_url || null : p.media_url || p.thumbnail_url || null;
                        const src = cachedUrl || (p.cached_media_path ? undefined : fallback || undefined);
                        return src && !failedSrc.has(src) ? (
                          <img
                            src={src}
                            alt="Post"
                            className="w-full h-full object-cover"
                            onError={() => {
                              setFailedSrc((prev) => {
                                const next = new Set(prev);
                                next.add(src);
                                return next;
                              });
                            }}
                          />
                        ) : (
                          <Instagram className="h-10 w-10 text-muted-foreground" />
                        );
                      })()}
                    </div>
                    <div className="p-3">
                      <p className="text-sm text-foreground line-clamp-2 min-h-[2.5rem]">{p.caption_snippet || "—"}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" /> {p.like_count.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" /> {p.comment_count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audience demographics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DemographicCard title="Age groups" data={ageGroups} emptyMessage={demographicsEmptyMessage} />
          <DemographicCard title="Gender" data={genderSplit} emptyMessage={demographicsEmptyMessage} />
          <DemographicCard title="Top cities" data={topCities} emptyMessage={demographicsEmptyMessage} />
        </div>
      </div>
    </BrandLayout>
  );
}

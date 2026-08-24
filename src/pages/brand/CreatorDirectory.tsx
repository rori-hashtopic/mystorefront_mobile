import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useBrandAccount } from "@/hooks/useBrandAccount";
import { useBrandSavedLists } from "@/hooks/useBrandSavedLists";
import { BrandLayout } from "@/components/layout/BrandLayout";
import { TierBanner } from "@/components/brand/TierBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Search,
  Instagram,
  Bookmark,
  BookmarkCheck,
  Users,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Trash2,
  Mail,
  Plus,
  ListPlus,
} from "lucide-react";
import { BrandInviteLinkModal } from "@/components/brand/BrandInviteLinkModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Creator {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  bio: string | null;
  location_tags: string[] | null;
  niche_tags: string[] | null;
  instagram_connected: boolean | null;
  instagram_connection?: { follower_count: number; username: string; engagement_rate: number | null } | null;
  _engagementRate?: number;
  _followerCount?: number;
}

interface CreatorProfile {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  username: string | null;
}

export default function CreatorDirectory() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { brand } = useBrandAccount();
  const { toast } = useToast();
  const {
    lists,
    allItems,
    toggleSaveCreator,
    isCreatorSaved,
    createList,
    deleteList,
    getCreatorsInList,
    removeCreatorFromList,
  } = useBrandSavedLists();

  const [creators, setCreators] = useState<Creator[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  const [showCreateList, setShowCreateList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [listCreators, setListCreators] = useState<CreatorProfile[]>([]);
  const [loadingListCreators, setLoadingListCreators] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role && role !== "brand" && role !== "admin") navigate("/");
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    if (!user || (role !== "brand" && role !== "admin")) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const HIDDEN_CREATOR_IDS = new Set([
        "04cd8206-2eed-4392-8837-64b1dfe779e0", // internal test account
      ]);
      const { data: creatorRoles } = await supabase.from("user_roles").select("user_id").eq("role", "creator");
      const creatorIds = (creatorRoles || [])
        .map((r: any) => r.user_id)
        .filter((id: string) => !HIDDEN_CREATOR_IDS.has(id));
      if (creatorIds.length === 0) {
        if (!cancelled) {
          setCreators([]);
          setLoading(false);
        }
        return;
      }
      const [profilesRes, tagsRes, igRes, postsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, display_name, photo_url, bio, location_tags, niche_tags, instagram_connected, instagram_connections(follower_count, username, engagement_rate)",
          )
          .in("id", creatorIds)
          .eq("onboarding_completed", true)
          .order("created_at", { ascending: false }),
        supabase.from("creator_tags").select("user_id, niches, locations").in("user_id", creatorIds),
        supabase
          .from("instagram_connections")
          .select("creator_id, follower_count, engagement_rate")
          .in("creator_id", creatorIds),
        supabase.from("instagram_posts").select("creator_id, like_count, comment_count").in("creator_id", creatorIds),
      ]);
      if (cancelled) return;
      const tagsMap = new Map((tagsRes.data || []).map((t: any) => [t.user_id, t]));

      // Build engagement map from instagram_connections
      const igMap = new Map<string, { followers: number; engRate: number }>();
      for (const ig of igRes.data || []) {
        igMap.set(ig.creator_id, {
          followers: ig.follower_count || 0,
          engRate: ig.engagement_rate || 0,
        });
      }

      // Compute engagement from posts as fallback
      const postsByCreator = new Map<string, { likes: number; comments: number; count: number }>();
      for (const p of postsRes.data || []) {
        const entry = postsByCreator.get(p.creator_id) || { likes: 0, comments: 0, count: 0 };
        entry.likes += p.like_count || 0;
        entry.comments += p.comment_count || 0;
        entry.count += 1;
        postsByCreator.set(p.creator_id, entry);
      }

      const transformed = (profilesRes.data || [])
        .filter((p: any) => !!p.display_name?.trim())
        .map((p: any) => {
          const t = tagsMap.get(p.id);
          const igConn = p.instagram_connections?.[0] || null;
          const igData = igMap.get(p.id);
          const followers = igData?.followers || igConn?.follower_count || 0;
          const postData = postsByCreator.get(p.id);

          // Priority: ig connection rate > computed from posts > 0
          let engRate = igData?.engRate || 0;
          if (!engRate && postData && postData.count > 0 && followers > 0) {
            engRate = ((postData.likes + postData.comments) / postData.count / followers) * 100;
          }

          return {
            ...p,
            instagram_connection: igConn,
            niche_tags: t?.niches?.length ? t.niches : p.niche_tags,
            location_tags: t?.locations?.length ? t.locations : p.location_tags,
            _engagementRate: engRate,
            _followerCount: followers,
          };
        });
      transformed.sort((a: any, b: any) => b._engagementRate - a._engagementRate);
      setCreators(transformed);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, role]);

  useEffect(() => {
    if (!expandedListId) {
      setListCreators((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    const ids = allItems.filter((item) => item.list_id === expandedListId).map((item) => item.creator_id);
    if (ids.length === 0) {
      setListCreators((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    setLoadingListCreators(true);
    supabase
      .from("profiles")
      .select("id, display_name, photo_url, username")
      .in("id", ids)
      .then(({ data }) => {
        setListCreators((data as CreatorProfile[]) || []);
        setLoadingListCreators(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedListId, allItems]);

  const allNiches = [...new Set(creators.flatMap((c) => c.niche_tags || []))];
  const allLocations = [...new Set(creators.flatMap((c) => c.location_tags || []))];

  const filtered = creators
    .filter((c) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!c.display_name?.toLowerCase().includes(q) && !c.bio?.toLowerCase().includes(q)) return false;
      }
      if (nicheFilter !== "all" && !c.niche_tags?.includes(nicheFilter)) return false;
      if (locationFilter !== "all" && !c.location_tags?.includes(locationFilter)) return false;
      return true;
    })
    .sort((a, b) => {
      const aRate = (a as any)._engagementRate || 0;
      const bRate = (b as any)._engagementRate || 0;
      return bRate - aRate;
    });

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    setCreatingList(true);
    const result = await createList(newListName.trim());
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "List created" });
      setShowCreateList(false);
      setNewListName("");
    }
    setCreatingList(false);
  };

  return (
    <BrandLayout brandName={brand?.name} brandStatus={brand?.status} brandPlan={brand?.plan_tier}>
      <div className="space-y-3 md:space-y-6">
        <TierBanner tier="premium" />

        {/* Header — title left, tabs + invite right */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Creators</h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowInviteModal(true)}
              size="icon"
              variant="outline"
              className="h-8 w-8 shrink-0 md:hidden"
            >
              <Mail className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShowInviteModal(true)} className="gap-2 shrink-0 hidden md:inline-flex">
              <Mail className="h-4 w-4" />
              Invite a creator
            </Button>
          </div>
        </div>
        <BrandInviteLinkModal open={showInviteModal} onOpenChange={setShowInviteModal} />

        <Tabs defaultValue="discover">
          <TabsList>
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="saved">Saved Lists</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-3 mt-3">
            {/* Search + filters — single row on mobile */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Select value={nicheFilter} onValueChange={setNicheFilter}>
                <SelectTrigger className="w-auto min-w-[90px] h-9 text-xs">
                  <SelectValue placeholder="Niche" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All niches</SelectItem>
                  {allNiches.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-auto min-w-[90px] h-9 text-xs hidden sm:flex">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {allLocations.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Location filter on its own row for very small screens */}
            <div className="sm:hidden">
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {allLocations.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {filtered.length} creator{filtered.length !== 1 ? "s" : ""}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                  {filtered.map((c) => {
                    const followers = c._followerCount || c.instagram_connection?.follower_count;
                    const igUsername = c.instagram_connection?.username;
                    const engagementRate = c._engagementRate || c.instagram_connection?.engagement_rate;
                    const saved = isCreatorSaved(c.id);
                    return (
                      <Card key={c.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <CardContent className="p-5 md:p-6">
                          {/* Top row: avatar + name + bookmark */}
                          <div className="flex items-start gap-3">
                            <Avatar className="h-14 w-14 shrink-0">
                              <AvatarImage src={c.photo_url || undefined} />
                              <AvatarFallback className="text-lg">
                                {c.display_name?.[0]?.toUpperCase() || "C"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <h3 className="font-semibold text-base text-foreground truncate">
                                {c.display_name || "Creator"}
                              </h3>
                              {igUsername && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Instagram className="h-3 w-3" />@{igUsername}
                                </p>
                              )}
                            </div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  aria-label="Save creator"
                                >
                                  {saved ? (
                                    <BookmarkCheck className="h-4 w-4 text-foreground" />
                                  ) : (
                                    <Bookmark className="h-4 w-4" />
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-56 p-2">
                                <p className="text-xs font-medium text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
                                  Save to list
                                </p>
                                {lists.length === 0 ? (
                                  <p className="text-xs text-muted-foreground px-2 py-2">No lists yet</p>
                                ) : (
                                  lists.map((list) => {
                                    const isInList = allItems.some(
                                      (item) => item.list_id === list.id && item.creator_id === c.id,
                                    );
                                    return (
                                      <button
                                        key={list.id}
                                        className="flex items-center gap-2 w-full px-2 py-2 rounded-md text-sm hover:bg-secondary/60 transition-colors"
                                        onClick={() => toggleSaveCreator(c.id, list.id)}
                                      >
                                        <Checkbox checked={isInList} className="pointer-events-none" />
                                        <span className="truncate">{list.name}</span>
                                      </button>
                                    );
                                  })
                                )}
                                <div className="border-t border-border mt-1 pt-1">
                                  <button
                                    className="flex items-center gap-2 w-full px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                                    onClick={() => setShowCreateList(true)}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    New list
                                  </button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Niche tags */}
                          {(c.niche_tags || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2.5">
                              {(c.niche_tags || []).slice(0, 3).map((t) => (
                                <Badge key={t} variant="secondary" className="text-[10px] font-normal px-2 py-0">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Bio */}
                          {c.bio && (
                            <p className="text-sm text-muted-foreground mt-2.5 line-clamp-2 leading-relaxed">{c.bio}</p>
                          )}

                          {/* Followers + engagement */}
                          {(followers != null && followers > 0) || (engagementRate != null && engagementRate > 0) ? (
                            <div className="flex items-center gap-4 mt-3 text-sm">
                              {followers != null && followers > 0 && (
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <Users className="h-3.5 w-3.5" />
                                  <span className="font-medium text-foreground">{followers.toLocaleString()}</span>
                                </span>
                              )}
                              {engagementRate != null && engagementRate > 0 && (
                                <span className="text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    {Math.min(engagementRate, 100).toFixed(1)}%
                                  </span>{" "}
                                  engagement
                                </span>
                              )}
                            </div>
                          ) : null}

                          {/* Actions */}
                          <div className="flex gap-2 mt-4">
                            <Button asChild variant="outline" size="sm" className="flex-1 h-9 text-xs">
                              <Link to={`/brand/creator-analytics/${c.id}`}>View profile</Link>
                            </Button>
                            <Button asChild size="sm" className="flex-1 h-9 text-xs">
                              <Link to={`/brand/messages?creator=${c.id}`}>Message</Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {lists.length} list{lists.length !== 1 ? "s" : ""}
              </p>
              <Button size="sm" variant="outline" onClick={() => setShowCreateList(true)}>
                <FolderPlus className="h-4 w-4 mr-2" /> New list
              </Button>
            </div>

            <div className="space-y-3">
              {lists.map((list) => {
                const creatorCount = getCreatorsInList(list.id).length;
                const isExpanded = expandedListId === list.id;
                return (
                  <Card key={list.id} className="overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-5 hover:bg-secondary/40 transition-colors"
                      onClick={() => setExpandedListId(isExpanded ? null : list.id)}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <ListPlus className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{list.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {creatorCount} creator{creatorCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border">
                        {loadingListCreators ? (
                          <div className="p-6 text-center">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                          </div>
                        ) : listCreators.length === 0 ? (
                          <p className="p-6 text-sm text-muted-foreground text-center">No creators in this list yet.</p>
                        ) : (
                          <div className="divide-y divide-border">
                            {listCreators.map((c) => (
                              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={c.photo_url || undefined} />
                                  <AvatarFallback>{c.display_name?.[0]?.toUpperCase() || "C"}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-foreground truncate">
                                    {c.display_name || "Creator"}
                                  </p>
                                  {c.username && <p className="text-xs text-muted-foreground">@{c.username}</p>}
                                </div>
                                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                                  <Link to={`/brand/creator-analytics/${c.id}`}>View profile</Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeCreatorFromList(list.id, c.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="p-3 border-t border-border">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-destructive hover:text-destructive"
                            onClick={() => deleteList(list.id)}
                          >
                            Delete list
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showCreateList} onOpenChange={setShowCreateList}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New saved list</DialogTitle>
          </DialogHeader>
          <Input placeholder="List name" value={newListName} onChange={(e) => setNewListName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateList(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateList} disabled={creatingList || !newListName.trim()}>
              {creatingList && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BrandLayout>
  );
}

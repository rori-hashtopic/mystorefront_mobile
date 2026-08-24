import { useState } from "react";
import { Link } from "react-router-dom";
import { DemoBrandLayout } from "@/demo/DemoBrandLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Instagram,
  Bookmark,
  BookmarkCheck,
  Users,
  ChevronRight,
  Trash2,
  FolderPlus,
} from "lucide-react";
import { demoCreators, demoSavedLists, getCreator } from "@/demo/mockData";
import { useDemoMode } from "@/demo/DemoModeContext";
import { DemoTierBanner } from "@/demo/DemoTierBanner";

export default function DemoCreatorDirectory() {
  const { demoAction } = useDemoMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [savedSet, setSavedSet] = useState<Set<string>>(
    () => new Set(demoSavedLists.flatMap((l) => l.creator_ids))
  );
  const [expandedListId, setExpandedListId] = useState<string | null>(null);

  const allNiches = [...new Set(demoCreators.flatMap((c) => c.niche_tags))];
  const allLocations = [...new Set(demoCreators.flatMap((c) => c.location_tags))];

  const filtered = demoCreators.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.display_name.toLowerCase().includes(q) && !c.bio.toLowerCase().includes(q))
        return false;
    }
    if (nicheFilter !== "all" && !c.niche_tags.includes(nicheFilter)) return false;
    if (locationFilter !== "all" && !c.location_tags.includes(locationFilter)) return false;
    return true;
  });

  const toggleSave = (id: string) => {
    setSavedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    demoAction("Saved (demo only — won't persist)");
  };

  const expandedList = demoSavedLists.find((l) => l.id === expandedListId);
  const expandedCreators = expandedList
    ? expandedList.creator_ids.map(getCreator).filter(Boolean)
    : [];

  return (
    <DemoBrandLayout>
      <div className="space-y-6">
        <DemoTierBanner tier="paid" />
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Creators</h1>
          <p className="text-muted-foreground">Discover and manage your creator relationships.</p>
        </div>

        <Tabs defaultValue="discover">
          <TabsList>
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="saved">Saved Lists</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-6 mt-6">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={nicheFilter} onValueChange={setNicheFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Niche" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Niches</SelectItem>
                  {allNiches.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {allLocations.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">
              Showing {filtered.length} creator{filtered.length !== 1 ? "s" : ""}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((c) => (
                <Card key={c.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={c.photo_url || undefined} />
                        <AvatarFallback className="text-lg">
                          {c.display_name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{c.display_name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Instagram className="h-3 w-3" />@{c.instagram_username}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleSave(c.id)}
                        aria-label="Save creator"
                      >
                        {savedSet.has(c.id) ? (
                          <BookmarkCheck className="h-4 w-4 text-foreground" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground mt-4 line-clamp-2">{c.bio}</p>

                    <div className="flex items-center gap-4 mt-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{c.follower_count.toLocaleString()}</span>
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">{c.engagement_rate}%</span>{" "}
                        engagement
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {c.niche_tags.slice(0, 3).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to={`/demo/brand/creator-analytics/${c.id}`}>View profile</Link>
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => demoAction("Demo mode — message not sent.")}
                      >
                        Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {demoSavedLists.length} list{demoSavedLists.length !== 1 ? "s" : ""}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => demoAction("Demo — list creation disabled.")}
              >
                <FolderPlus className="h-4 w-4 mr-2" /> New list
              </Button>
            </div>

            <div className="space-y-3">
              {demoSavedLists.map((list) => (
                <Card key={list.id}>
                  <button
                    className="w-full flex items-center justify-between p-4 hover:bg-secondary/40 transition-colors"
                    onClick={() => setExpandedListId(expandedListId === list.id ? null : list.id)}
                  >
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground">{list.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {list.creator_ids.length} creator
                        {list.creator_ids.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        expandedListId === list.id ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  {expandedListId === list.id && (
                    <div className="border-t border-border divide-y divide-border">
                      {expandedCreators.map((c: any) => (
                        <div key={c.id} className="flex items-center gap-3 p-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>{c.display_name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {c.display_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @{c.instagram_username} · {c.follower_count.toLocaleString()} followers
                            </p>
                          </div>
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/demo/brand/creator-analytics/${c.id}`}>View</Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => demoAction("Demo — removal disabled.")}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DemoBrandLayout>
  );
}

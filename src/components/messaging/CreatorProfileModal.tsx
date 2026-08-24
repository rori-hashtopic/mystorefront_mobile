import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Instagram, MapPin, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface CreatorProfileData {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  bio: string | null;
  niche_tags: string[] | null;
  location_tags: string[] | null;
  tier: string | null;
  instagram_connected: boolean | null;
  instagram_connection?: {
    username: string;
    follower_count: number | null;
    engagement_rate: number | null;
  } | null;
}

const TIER_LABELS: Record<string, string> = {
  enthusiast: "Insider",
  ambassador: "Featured",
  trendsetter: "Tastemaker",
  icon: "Tastemaker",
};

interface CreatorProfileModalProps {
  creatorId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CreatorProfileModal({ creatorId, isOpen, onClose }: CreatorProfileModalProps) {
  const [creator, setCreator] = useState<CreatorProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!creatorId || !isOpen) return;

    setLoading(true);
    Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, photo_url, bio, niche_tags, location_tags, tier, instagram_connected")
        .eq("id", creatorId)
        .maybeSingle(),
      supabase
        .from("instagram_connections")
        .select("username, follower_count, engagement_rate")
        .eq("creator_id", creatorId)
        .maybeSingle(),
    ]).then(([profileRes, igRes]) => {
      if (profileRes.data) {
        setCreator({
          ...profileRes.data,
          instagram_connection: igRes.data || null,
        });
      }
      setLoading(false);
    });
  }, [creatorId, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Creator Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : creator ? (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={creator.photo_url || undefined} />
                <AvatarFallback className="text-lg">{creator.display_name?.[0]?.toUpperCase() || "C"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-foreground">{creator.display_name || "Creator"}</h3>
                {creator.tier && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {TIER_LABELS[creator.tier] || creator.tier}
                  </Badge>
                )}
                {creator.instagram_connection && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Instagram className="h-3.5 w-3.5" />@{creator.instagram_connection.username}
                  </p>
                )}
              </div>
            </div>

            {/* Bio */}
            {creator.bio && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground leading-relaxed">{creator.bio}</p>
              </>
            )}

            {/* Stats */}
            {creator.instagram_connection && (
              <>
                <Separator />
                <div className="flex items-center gap-6">
                  {creator.instagram_connection.follower_count != null && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {creator.instagram_connection.follower_count.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">followers</span>
                    </div>
                  )}
                  {creator.instagram_connection.engagement_rate != null &&
                    creator.instagram_connection.engagement_rate > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">
                          {Math.min(creator.instagram_connection.engagement_rate, 100).toFixed(2)}%
                        </span>
                        <span className="text-muted-foreground ml-1">engagement</span>
                      </div>
                    )}
                </div>
              </>
            )}

            {/* Tags */}
            {((creator.niche_tags && creator.niche_tags.length > 0) ||
              (creator.location_tags && creator.location_tags.length > 0)) && (
              <>
                <Separator />
                <div className="space-y-2">
                  {creator.niche_tags && creator.niche_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {creator.niche_tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs px-2.5 py-0.5">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {creator.location_tags && creator.location_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {creator.location_tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs px-2.5 py-0.5">
                          <MapPin className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Action */}
            <Separator />
            <Button className="w-full" asChild>
              <Link to={`/brand/creators/${creator.id}`} onClick={onClose}>
                View Full Analytics
              </Link>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Creator not found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

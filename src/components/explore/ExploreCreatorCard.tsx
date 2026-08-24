import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export interface ExploreCreator {
  id: string;
  displayName: string | null;
  username: string | null;
  photoUrl: string | null;
  coverImageUrl: string | null;
  bio: string | null;
  nicheTags: string[] | null;
  tier: string | null;
  followerCount?: number;
}

interface ExploreCreatorCardProps {
  creator: ExploreCreator;
  index?: number;
  isFollowing: boolean;
  onToggleFollow: (creatorId: string, isCurrentlyFollowing: boolean) => void;
}

export function ExploreCreatorCard({
  creator,
  index = 0,
  isFollowing,
  onToggleFollow,
}: ExploreCreatorCardProps) {
  const shopUrl = creator.username ? `/${creator.username}` : "#";
  const displayIndex = String(index + 1).padStart(2, "0");

  return (
    <article className="group py-6 sm:py-8 first:pt-0">
      <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
        {/* Index number */}
        <span className="text-xs text-muted-foreground font-medium pt-1 hidden md:block">
          {displayIndex}
        </span>

        {/* Avatar */}
        <div className="flex-shrink-0">
          {creator.photoUrl ? (
            <img
              src={creator.photoUrl}
              alt={creator.displayName || "Creator"}
              loading="lazy"
              className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full object-cover transition-all duration-300"
            />
          ) : (
            <div className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full bg-muted flex items-center justify-center">
              <span className="font-display text-lg sm:text-xl md:text-2xl text-muted-foreground">
                {(creator.displayName || creator.username || "C")
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase() || "")
                  .join("") || "C"}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg sm:text-xl md:text-2xl text-foreground">
            {creator.displayName || "Creator"}
          </h3>
          {creator.username && (
            <p className="text-xs text-muted-foreground mt-0.5">
              @{creator.username}
            </p>
          )}
          {creator.bio && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mt-2 hidden sm:block">
              {creator.bio}
            </p>
          )}
          <Link 
            to={shopUrl}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-foreground mt-3 sm:mt-4 group/link min-h-[44px]"
          >
            <span className="border-b border-transparent group-hover/link:border-foreground transition-colors">
              View Creator
            </span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-border mt-6 sm:mt-8" />
    </article>
  );
}

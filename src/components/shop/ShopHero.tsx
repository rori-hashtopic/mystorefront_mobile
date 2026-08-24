import { Instagram, Bookmark, UserPlus, UserMinus, Link2, Send, Youtube, Globe } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

interface ShopHeroProps {
  displayName: string;
  photoUrl?: string | null;
  bio?: string | null;
  nicheTags?: string[] | null;
  locationTags?: string[] | null;
  attributeTags?: string[] | null;
  instagramHandle?: string | null;
  tiktokHandle?: string | null;
  youtubeUrl?: string | null;
  otherUrls?: string[] | null;
  username?: string | null;
  isOwnShop?: boolean;
  isPublicView?: boolean;
  isFollowing?: boolean;
  viewerRole?: "creator" | "brand" | "admin" | "shopper" | null;
  isSaved?: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onShareShop?: () => void;
}

export function ShopHero({
  displayName,
  photoUrl,
  bio,
  nicheTags,
  locationTags,
  attributeTags,
  instagramHandle,
  tiktokHandle,
  youtubeUrl,
  otherUrls,
  username,
  isOwnShop = false,
  isPublicView = false,
  isFollowing = false,
  viewerRole,
  isSaved = false,
  onFollow,
  onUnfollow,
  onShare,
  onSave,
  onShareShop
}: ShopHeroProps) {
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const cleanTikTokHandle = tiktokHandle?.replace(/^@+/, "") || "";
  const primaryWebsiteUrl = otherUrls?.find((url) => url?.trim())?.trim() || null;
  const withProtocol = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

  // Limit tags to first 5
  const displayTags = nicheTags?.slice(0, 5) || [];
  const showFollowButton = isPublicView && !isOwnShop && onFollow && onUnfollow;
  const showSaveButton = viewerRole === "brand" && !isOwnShop && onSave;

  return (
    <div className="mb-4 sm:mb-8">
      {/* Desktop: Horizontal layout with avatar, rule, content */}
      <div className="hidden sm:flex items-start gap-10">
        {/* Avatar */}
        <div className="shrink-0">
          <Avatar className="w-32 h-32 md:w-36 md:h-36 ring-1 ring-border/50 transition-all duration-500">
            <AvatarImage src={photoUrl || undefined} alt={displayName} className="object-cover" />
            <AvatarFallback className="text-3xl font-display bg-muted text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Vertical separator */}
        <div className="w-px self-stretch bg-border/60" />

        {/* Content */}
        <div className="flex-1 min-w-0 pt-1">
          {/* Name + Share */}
          <div className="flex items-start justify-between gap-6 mb-3">
            <h1 className="font-display text-4xl md:text-5xl lg:text-[3.25rem] tracking-tight text-foreground leading-[1.1]">
              {displayName}
            </h1>
            {onShareShop && (
              <button
                onClick={onShareShop}
                className="shrink-0 flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors group mt-2"
              >
                <Send className="h-3.5 w-3.5" />
                <span className="border-b border-transparent group-hover:border-current">Share</span>
              </button>
            )}
          </div>

          {/* Social handles row */}
          <div className="flex items-center gap-5 mb-4">
            {instagramHandle && (
              <a 
                href={`https://instagram.com/${instagramHandle.replace(/^@+/, '')}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                <Instagram className="h-3.5 w-3.5" />
                <span className="border-b border-transparent group-hover:border-current">@{instagramHandle.replace(/^@+/, '')}</span>
              </a>
            )}
            {tiktokHandle && (
              <a
                href={`https://www.tiktok.com/@${cleanTikTokHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                <TikTokIcon className="h-3.5 w-3.5" />
                <span className="border-b border-transparent group-hover:border-current">@{cleanTikTokHandle}</span>
              </a>
            )}
            {youtubeUrl && (
              <a
                href={withProtocol(youtubeUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                <Youtube className="h-3.5 w-3.5" />
                <span className="border-b border-transparent group-hover:border-current">YouTube</span>
              </a>
            )}
            {primaryWebsiteUrl && (
              <a
                href={withProtocol(primaryWebsiteUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                <Globe className="h-3.5 w-3.5" />
                <span className="border-b border-transparent group-hover:border-current">Website</span>
              </a>
            )}
          </div>

          {/* Bio */}
          {bio && (
            <p className="text-[15px] text-muted-foreground leading-[1.7] max-w-xl mb-5">
              {bio}
            </p>
          )}

          {/* Niche Tags */}
          {displayTags.length > 0 && (
            <div className="flex items-center gap-3">
              {displayTags.map((tag, i) => (
                <span key={tag} className="flex items-center gap-3">
                  <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-muted-foreground/70 py-0 pb-[12px]">
                    {tag}
                  </span>
                  {i < displayTags.length - 1 && (
                    <span className="inline-flex items-center pb-[12px]">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-6 mt-1">
            {showFollowButton && (isFollowing ? (
              <button 
                onClick={onUnfollow}
                className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors group"
              >
                <UserMinus className="h-3.5 w-3.5" />
                <span className="border-b border-transparent group-hover:border-current">Unfollow</span>
              </button>
            ) : (
              <button 
                onClick={onFollow}
                className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-foreground group"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span className="border-b border-foreground group-hover:border-transparent transition-colors">
                  Follow {displayName.split(" ")[0]}
                </span>
              </button>
            ))}

            {showSaveButton && (
              <button 
                onClick={onSave}
                className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors group"
              >
                <Bookmark className={`h-3.5 w-3.5 ${isSaved ? "fill-current" : ""}`} />
                <span className="border-b border-transparent group-hover:border-current">
                  {isSaved ? "Saved" : "Save"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Centered vertical stack */}
      <div className="flex sm:hidden flex-col items-center text-center">
        <Avatar className="w-24 h-24 ring-1 ring-border/50 mb-5">
          <AvatarImage src={photoUrl || undefined} alt={displayName} className="object-cover" />
          <AvatarFallback className="text-2xl font-display bg-muted text-muted-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>

        <h1 className="font-display text-3xl tracking-tight text-foreground leading-[1.1] mb-2">
          {displayName}
        </h1>

        {/* Social handles */}
        <div className="flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 mb-3">
          {instagramHandle && (
            <a 
              href={`https://instagram.com/${instagramHandle.replace(/^@+/, '')}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-1 text-sm text-muted-foreground"
            >
              <Instagram className="h-3.5 w-3.5" />
              <span>@{instagramHandle.replace(/^@+/, '')}</span>
            </a>
          )}
          {tiktokHandle && (
            <a
              href={`https://www.tiktok.com/@${cleanTikTokHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-muted-foreground"
            >
              <TikTokIcon className="h-3.5 w-3.5" />
              <span>@{cleanTikTokHandle}</span>
            </a>
          )}
          {youtubeUrl && (
            <a
              href={withProtocol(youtubeUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-muted-foreground"
            >
              <Youtube className="h-3.5 w-3.5" />
              <span>YouTube</span>
            </a>
          )}
          {primaryWebsiteUrl && (
            <a
              href={withProtocol(primaryWebsiteUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-muted-foreground"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Website</span>
            </a>
          )}
        </div>

        {bio && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-3">
            {bio}
          </p>
        )}

        {displayTags.length > 0 && (
          <div className="flex flex-wrap justify-center items-center gap-2 mb-3">
            {displayTags.map((tag, i) => (
              <span key={tag} className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-muted-foreground/70">
                  {tag}
                </span>
                {i < displayTags.length - 1 && (
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                )}
              </span>
            ))}
          </div>
        )}

        {/* Share link - mobile only */}
        {onShareShop && (
          <button 
            onClick={onShareShop}
            className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            Share Shop <Link2 className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mt-2">
          {showFollowButton && (isFollowing ? (
            <button 
              onClick={onUnfollow}
              className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-muted-foreground"
            >
              <UserMinus className="h-3.5 w-3.5" />
              <span>Unfollow</span>
            </button>
          ) : (
            <button 
              onClick={onFollow}
              className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-foreground"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span className="border-b border-foreground">Follow {displayName.split(" ")[0]}</span>
            </button>
          ))}

          {showSaveButton && (
            <button 
              onClick={onSave}
              className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-muted-foreground"
            >
              <Bookmark className={`h-3.5 w-3.5 ${isSaved ? "fill-current" : ""}`} />
              <span>{isSaved ? "Saved" : "Save"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExploreProduct {
  id: string;
  productTitle: string;
  productImageUrl: string | null;
  affiliateUrl: string;
  retailer: string | null;
  brandName: string | null;
  creatorId: string;
  creatorUsername: string | null;
  creatorDisplayName: string | null;
}

interface ExploreProductCardProps {
  product: ExploreProduct;
  isInWishlist: boolean;
  onToggleWishlist: (productId: string, isCurrentlyInWishlist: boolean) => void;
  onCardClick: (affiliateUrl: string, productId: string, creatorId: string) => void;
}

export function ExploreProductCard({
  product,
  isInWishlist,
  onToggleWishlist,
  onCardClick,
}: ExploreProductCardProps) {
  const handleCardClick = () => {
    onCardClick(product.affiliateUrl, product.id, product.creatorId);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleWishlist(product.id, isInWishlist);
  };

  const curatorName = product.creatorDisplayName || product.creatorUsername;

  return (
    <article
      className="group cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Image Container */}
      <div className="aspect-[3/4] relative bg-muted overflow-hidden mb-3 sm:mb-4">
        {product.productImageUrl ? (
          <img
            src={product.productImageUrl}
            alt={product.productTitle}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              No image
            </span>
          </div>
        )}

        {/* Wishlist button - minimal floating heart, always visible on touch devices */}
        <button
          className={cn(
            "absolute top-2 right-2 sm:top-4 sm:right-4 p-2 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center",
            "sm:opacity-0 sm:group-hover:opacity-100",
            isInWishlist && "opacity-100"
          )}
          onClick={handleWishlistClick}
        >
          <Heart
            className={cn(
              "h-5 w-5 sm:h-5 sm:w-5 transition-colors",
              isInWishlist 
                ? "fill-foreground text-foreground" 
                : "text-foreground/70 hover:text-foreground"
            )}
          />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-0.5 sm:space-y-1">
        <h3 className="font-display text-sm sm:text-base leading-snug text-foreground line-clamp-2 group-hover:underline underline-offset-2 transition-all">
          {product.productTitle}
        </h3>
        {(product.brandName || product.retailer) && (
          <p className="text-xs text-muted-foreground truncate">
            {product.brandName || product.retailer}
          </p>
        )}
        {curatorName && (
          <p className="text-xs text-muted-foreground truncate hidden sm:block">
            Curated by @{curatorName}
          </p>
        )}
      </div>

      {/* Bottom border as separator */}
      <div className="h-px bg-border mt-4 sm:mt-6" />
    </article>
  );
}

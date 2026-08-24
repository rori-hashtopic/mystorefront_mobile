import { Heart, ExternalLink } from "lucide-react";
import { ExploreProductCard, ExploreProduct } from "./ExploreProductCard";
import { ExploreProductCardSkeleton } from "./ExploreCardSkeleton";
import { useShopperData } from "@/hooks/useShopperData";
import { useAuth } from "@/hooks/useAuth";

interface ExploreWishlistGridProps {
  onProductClick: (affiliateUrl: string, productId: string, creatorId: string) => void;
  onRemoveFromWishlist: (productId: string) => void;
}

export function ExploreWishlistGrid({
  onProductClick,
  onRemoveFromWishlist,
}: ExploreWishlistGridProps) {
  const { user } = useAuth();
  const { wishlist, loading, isInWishlist } = useShopperData();

  // Convert wishlist items to ExploreProduct format
  const wishlistProducts: ExploreProduct[] = wishlist
    .filter((item) => item.link)
    .map((item) => ({
      id: item.link_id,
      productTitle: item.link?.product_title || "Product",
      productImageUrl: item.link?.product_image_url || null,
      affiliateUrl: item.link?.affiliate_url || "#",
      retailer: item.link?.retailer || null,
      brandName: item.link?.retailer || null,
      creatorId: item.creator_id,
      creatorUsername: null,
      creatorDisplayName: null,
    }));

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6">
          <Heart className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-display font-medium text-foreground mb-2">
          Sign in to see your wishlist
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Create an account to save products and access them anytime.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <ExploreProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (wishlistProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6">
          <Heart className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-display font-medium text-foreground mb-2">
          No saved items yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Tap the heart on Explore to save items.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
      {wishlistProducts.map((product) => (
        <ExploreProductCard
          key={product.id}
          product={product}
          isInWishlist={isInWishlist(product.id)}
          onToggleWishlist={(id, isIn) => {
            if (isIn) {
              onRemoveFromWishlist(id);
            }
          }}
          onCardClick={onProductClick}
        />
      ))}
    </div>
  );
}

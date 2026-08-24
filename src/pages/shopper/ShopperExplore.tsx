import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, Users, Building2, Loader2, RefreshCw, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ShopperLayout } from "@/components/layout/ShopperLayout";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ExploreProductCard, ExploreProduct } from "@/components/explore/ExploreProductCard";
import { ExploreCreatorCard, ExploreCreator } from "@/components/explore/ExploreCreatorCard";
import { ExploreBrandCard, ExploreBrand } from "@/components/explore/ExploreBrandCard";
import { ShopperAuthModal } from "@/components/auth/ShopperAuthModal";

import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useShopperData } from "@/hooks/useShopperData";
import { useToast } from "@/hooks/use-toast";
import { buildAffiliateRedirectUrl } from "@/lib/tracking";

// Escape special SQL LIKE pattern characters to prevent injection
function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

type TabType = "products" | "creators" | "brands";

export default function ShopperExplore() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { profile } = useProfile();
  const { followCreator, unfollowCreator, isFollowing, addToWishlist, removeFromWishlist, isInWishlist, refetch } = useShopperData();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Data states
  const [products, setProducts] = useState<ExploreProduct[]>([]);
  const [creators, setCreators] = useState<ExploreCreator[]>([]);
  const [brands, setBrands] = useState<ExploreBrand[]>([]);

  // Loading states
  const [productsLoading, setProductsLoading] = useState(true);
  const [creatorsLoading, setCreatorsLoading] = useState(true);
  const [brandsLoading, setBrandsLoading] = useState(true);

  // Pagination for products
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [productPage, setProductPage] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "wishlist" | "follow";
    targetId: string;
    creatorId?: string;
  } | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Redirect based on role (allow shoppers, creators, admins)
  useEffect(() => {
    if (!roleLoading && role) {
      if (role === "brand") {
        navigate("/brand");
      }
    }
  }, [role, roleLoading, navigate]);

  // Fetch products
  const fetchProducts = useCallback(async (pageNum: number, reset = false) => {
    setProductsLoading(true);
    try {
      const { data: discoverableProfiles } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .eq("is_discoverable", true);

      const discoverableIds = discoverableProfiles?.map((p) => p.id) || [];

      if (discoverableIds.length === 0) {
        setProducts([]);
        setHasMoreProducts(false);
        setProductsLoading(false);
        return;
      }

      const profilesMap = new Map(
        discoverableProfiles?.map((p) => [p.id, { username: p.username, display_name: p.display_name }]) || []
      );

      // Exclude the current user's own products
      const filteredIds = user ? discoverableIds.filter((id) => id !== user.id) : discoverableIds;

      if (filteredIds.length === 0) {
        if (reset) setProducts([]);
        setHasMoreProducts(false);
        setProductsLoading(false);
        return;
      }

      let query = supabase
        .from("links")
        .select("id, product_title, product_image_url, affiliate_url, retailer, user_id, created_at")
        .in("user_id", filteredIds)
        .order("created_at", { ascending: false });

      if (debouncedSearch) {
        const escaped = escapeLikePattern(debouncedSearch);
        query = query.or(
          `product_title.ilike.%${escaped}%,retailer.ilike.%${escaped}%`
        );
      }

      const pageSize = 20;
      query = query.range(pageNum * pageSize, (pageNum + 1) * pageSize - 1);

      const { data } = await query;

      const mappedProducts: ExploreProduct[] = (data || []).map((item) => {
        const creatorProfile = profilesMap.get(item.user_id);
        return {
          id: item.id,
          productTitle: item.product_title,
          productImageUrl: item.product_image_url,
          affiliateUrl: item.affiliate_url,
          retailer: item.retailer,
          brandName: item.retailer,
          creatorId: item.user_id,
          creatorUsername: creatorProfile?.username || null,
          creatorDisplayName: creatorProfile?.display_name || null,
        };
      });

      if (reset) {
        setProducts(mappedProducts);
      } else {
        setProducts((prev) => [...prev, ...mappedProducts]);
      }

      setHasMoreProducts(mappedProducts.length === pageSize);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setProductsLoading(false);
    }
  }, [debouncedSearch, user]);

  // Fetch creators
  const fetchCreators = useCallback(async () => {
    setCreatorsLoading(true);
    try {
      const { data: creatorRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "creator");

      if (!creatorRoles || creatorRoles.length === 0) {
        setCreators([]);
        setCreatorsLoading(false);
        return;
      }

      const creatorIds = creatorRoles.map((r) => r.user_id);

      let query = supabase
        .from("profiles")
        .select("id, display_name, photo_url, cover_image_url, username, bio, niche_tags, tier")
        .in("id", creatorIds)
        .eq("is_discoverable", true)
        .eq("onboarding_completed", true);

      if (debouncedSearch) {
        const escaped = escapeLikePattern(debouncedSearch);
        query = query.or(
          `display_name.ilike.%${escaped}%,username.ilike.%${escaped}%,bio.ilike.%${escaped}%`
        );
      }

      const { data } = await query;

      const mappedCreators: ExploreCreator[] = (data || []).map((c: any) => ({
        id: c.id,
        displayName: c.display_name,
        username: c.username,
        photoUrl: c.photo_url,
        coverImageUrl: c.cover_image_url || null,
        bio: c.bio,
        nicheTags: c.niche_tags,
        tier: c.tier,
      }));

      setCreators(mappedCreators);
    } catch (error) {
      console.error("Error fetching creators:", error);
    } finally {
      setCreatorsLoading(false);
    }
  }, [debouncedSearch]);

  // Fetch brands
  const fetchBrands = useCallback(async () => {
    setBrandsLoading(true);
    try {
      let query = supabase
        .from("brands")
        .select("id, name, slug, logo_url, hero_image_url, website_url, description, commission_percent, is_partner, is_trending")
        .order("is_partner", { ascending: false })
        .order("is_trending", { ascending: false })
        .order("name", { ascending: true });

      if (debouncedSearch) {
        const escaped = escapeLikePattern(debouncedSearch);
        query = query.ilike("name", `%${escaped}%`);
      }

      const { data } = await query;

      // Cross-reference brand_accounts for uploaded logos
      const brandIds = (data || []).map((b: any) => b.id);
      const { data: accountsData } = brandIds.length > 0
        ? await supabase
            .from("brand_accounts")
            .select("id, logo_upload_url, logo_url")
            .in("id", brandIds)
        : { data: [] };

      const accountsMap = new Map(
        (accountsData || []).map((a: any) => [a.id, a])
      );

      const mappedBrands: ExploreBrand[] = (data || []).map((b: any) => {
        const account = accountsMap.get(b.id);
        return {
          id: b.id,
          name: b.name,
          slug: b.slug,
          logoUrl: account?.logo_upload_url || account?.logo_url || b.logo_url,
          heroImageUrl: b.hero_image_url || null,
          websiteUrl: b.website_url || null,
          description: b.description,
          commissionPercent: b.commission_percent,
          isPartner: b.is_partner || false,
          isTrending: b.is_trending || false,
        };
      });

      setBrands(mappedBrands);
    } catch (error) {
      console.error("Error fetching brands:", error);
    } finally {
      setBrandsLoading(false);
    }
  }, [debouncedSearch]);

  // Initial fetch based on tab
  useEffect(() => {
    if (activeTab === "products") {
      setProductPage(0);
      fetchProducts(0, true);
    } else if (activeTab === "creators") {
      fetchCreators();
    } else if (activeTab === "brands") {
      fetchBrands();
    }
  }, [activeTab, debouncedSearch, fetchProducts, fetchCreators, fetchBrands]);

  // Infinite scroll for products
  useEffect(() => {
    if (activeTab !== "products") return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreProducts && !productsLoading) {
          const nextPage = productPage + 1;
          setProductPage(nextPage);
          fetchProducts(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [activeTab, hasMoreProducts, productsLoading, productPage, fetchProducts]);

  // Handle wishlist toggle
  const handleWishlistToggle = async (productId: string, isCurrentlyInWishlist: boolean) => {
    if (!user) {
      setPendingAction({ type: "wishlist", targetId: productId });
      setAuthModalOpen(true);
      return;
    }

    try {
      if (isCurrentlyInWishlist) {
        await removeFromWishlist(productId);
        toast({ title: "Removed from wishlist" });
      } else {
        const product = products.find((p) => p.id === productId);
        if (product) {
          await addToWishlist(productId, product.creatorId);
          toast({ title: "Added to wishlist", description: "View your saved items in Wishlist" });
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not update wishlist", variant: "destructive" });
    }
  };

  // Handle follow toggle
  const handleFollowToggle = async (creatorId: string, isCurrentlyFollowing: boolean) => {
    if (!user) {
      setPendingAction({ type: "follow", targetId: creatorId });
      setAuthModalOpen(true);
      return;
    }

    try {
      if (isCurrentlyFollowing) {
        await unfollowCreator(creatorId);
        toast({ title: "Unfollowed" });
      } else {
        await followCreator(creatorId);
        toast({ title: "Following!", description: "You'll see their updates" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not update follow status", variant: "destructive" });
    }
  };

  // Handle product card click
  const handleProductClick = async (_affiliateUrl: string, productId: string, creatorId: string) => {
    // Track explore-specific analytics without blocking the redirect.
    if (user) {
      void supabase.from("explore_clicks").insert({
        link_id: productId,
        creator_id: creatorId,
        viewer_user_id: user.id,
        source: "explore",
      });
    }

    const product = products.find((item) => item.id === productId);
    const creatorRef = product?.creatorUsername || creatorId;
    window.open(buildAffiliateRedirectUrl(productId, creatorRef, "explore"), "_blank", "noopener,noreferrer");
  };

  // Handle auth success
  const handleAuthSuccess = async () => {
    await refetch();
    if (pendingAction) {
      if (pendingAction.type === "wishlist") {
        const product = products.find((p) => p.id === pendingAction.targetId);
        if (product) {
          await addToWishlist(pendingAction.targetId, product.creatorId);
          toast({ title: "Added to wishlist" });
        }
      } else if (pendingAction.type === "follow") {
        await followCreator(pendingAction.targetId);
        toast({ title: "Following!" });
      }
      setPendingAction(null);
    }
  };

  // Determine if we can show commission (only for creators and admins)
  const canSeeCommission = role === "creator" || role === "admin";

  // Loading state
  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ShopperLayout displayName={profile?.display_name || undefined}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Explore
          </h1>
          <p className="text-muted-foreground">
            Discover products, creators, and brands
          </p>
        </div>

        {/* Search bar */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products, creators, or brands"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabType)}
          className="space-y-6"
        >
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="creators" className="gap-2">
              <Users className="h-4 w-4" />
              Creators
            </TabsTrigger>
            <TabsTrigger value="brands" className="gap-2">
              <Building2 className="h-4 w-4" />
              Brands
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            {productsLoading && products.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  No products found
                </p>
                <p className="text-muted-foreground">
                  Try a different keyword.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {products.map((product) => (
                    <ExploreProductCard
                      key={product.id}
                      product={product}
                      isInWishlist={isInWishlist(product.id)}
                      onToggleWishlist={handleWishlistToggle}
                      onCardClick={handleProductClick}
                    />
                  ))}
                </div>

                {hasMoreProducts && (
                  <div ref={loadMoreRef} className="flex justify-center py-8">
                    {productsLoading && products.length > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Loading more...
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Creators Tab */}
          <TabsContent value="creators" className="space-y-4">
            {creatorsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : creators.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  No creators found
                </p>
                <p className="text-muted-foreground">
                  Try searching by handle.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {creators.map((creator) => (
                  <ExploreCreatorCard
                    key={creator.id}
                    creator={creator}
                    isFollowing={isFollowing(creator.id)}
                    onToggleFollow={handleFollowToggle}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Brands Tab */}
          <TabsContent value="brands" className="space-y-4">
            {brandsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : brands.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  No brands found
                </p>
                <p className="text-muted-foreground">
                  Try a different brand name.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {brands.map((brand) => (
                  <ExploreBrandCard
                    key={brand.id}
                    brand={brand}
                    showCommission={canSeeCommission}
                    netRate={role === "creator"}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

      </div>

      {/* Auth Modal */}
      <ShopperAuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthSuccess}
        pendingAction={pendingAction ? {
          type: pendingAction.type,
          targetId: pendingAction.targetId,
        } : undefined}
      />
    </ShopperLayout>
  );
}

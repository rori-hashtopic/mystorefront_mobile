import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, UserMinus, ExternalLink, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, type Variants } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ShopperLayout } from "@/components/layout/ShopperLayout";
import { ExploreProductCard, ExploreProduct } from "@/components/explore/ExploreProductCard";
import { ExploreCreatorCard, ExploreCreator } from "@/components/explore/ExploreCreatorCard";
import { ExploreBrandCard, ExploreBrand } from "@/components/explore/ExploreBrandCard";
import { ExploreHeader } from "@/components/explore/ExploreHeader";
import { ExploreTabs, ExploreTabType } from "@/components/explore/ExploreTabs";
import { ExploreWishlistGrid } from "@/components/explore/ExploreWishlistGrid";
import {
  ExploreProductCardSkeleton,
  ExploreCreatorCardSkeleton,
  ExploreBrandCardSkeleton,
} from "@/components/explore/ExploreCardSkeleton";
import { SortOption } from "@/components/explore/ExploreSortDropdown";
import { ShopperAuthModal } from "@/components/auth/ShopperAuthModal";

import { HelpModal } from "@/components/shop/HelpModal";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useShopperData } from "@/hooks/useShopperData";
import { useToast } from "@/hooks/use-toast";
import { buildAffiliateRedirectUrl } from "@/lib/tracking";

// Animation variants
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

// Escape special SQL LIKE pattern characters to prevent injection
function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

interface ShopperExploreContentProps {
  showLayout?: boolean;
}

export default function ShopperExploreContent({ showLayout = false }: ShopperExploreContentProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { profile } = useProfile();
  const {
    followCreator,
    unfollowCreator,
    isFollowing,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    refetch,
    follows,
    loading: followsLoading,
  } = useShopperData();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ExploreTabType>("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("trending");

  // Data states
  const [products, setProducts] = useState<ExploreProduct[]>([]);
  const [creators, setCreators] = useState<ExploreCreator[]>([]);
  const [brands, setBrands] = useState<ExploreBrand[]>([]);

  // Loading states
  const [productsLoading, setProductsLoading] = useState(true);
  const [creatorsLoading, setCreatorsLoading] = useState(true);
  const [brandsLoading, setBrandsLoading] = useState(true);

  // Error states
  const [productsError, setProductsError] = useState(false);
  const [creatorsError, setCreatorsError] = useState(false);
  const [brandsError, setBrandsError] = useState(false);

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

  // Help modal
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Redirect brand users
  useEffect(() => {
    if (!roleLoading && role) {
      if (role === "brand") {
        navigate("/brand");
      }
    }
  }, [role, roleLoading, navigate]);

  // Fetch products
  const fetchProducts = useCallback(
    async (pageNum: number, reset = false) => {
      setProductsLoading(true);
      setProductsError(false);
      try {
        const { data: discoverableProfiles } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .eq("is_discoverable", true);

        const allIds = discoverableProfiles?.map((p) => p.id) || [];
        // Exclude the current user's own products
        const discoverableIds = user ? allIds.filter((id) => id !== user.id) : allIds;

        if (discoverableIds.length === 0) {
          setProducts([]);
          setHasMoreProducts(false);
          setProductsLoading(false);
          return;
        }

        const profilesMap = new Map(
          discoverableProfiles?.map((p) => [p.id, { username: p.username, display_name: p.display_name }]) || [],
        );

        const pageSize = 20;
        const escaped = debouncedSearch ? escapeLikePattern(debouncedSearch) : null;

        const buildBaseQuery = () => {
          let q = supabase
            .from("links")
            .select("id, product_title, product_image_url, affiliate_url, retailer, user_id, created_at")
            .in("user_id", discoverableIds)
            .eq("is_deleted", false);
          if (escaped) {
            q = q.or(`product_title.ilike.%${escaped}%,retailer.ilike.%${escaped}%`);
          }
          return q;
        };

        let rows: any[] = [];

        if (sortBy === "most-saved") {
          // Globally rank candidate links by wishlist count.
          // 1) Get candidate link IDs (respecting search + discoverable filter).
          let candidateQuery = supabase
            .from("links")
            .select("id, created_at")
            .in("user_id", discoverableIds)
            .eq("is_deleted", false)
            .order("created_at", { ascending: false });
          if (escaped) {
            candidateQuery = candidateQuery.or(`product_title.ilike.%${escaped}%,retailer.ilike.%${escaped}%`);
          }
          const { data: candidates, error: candErr } = await candidateQuery;
          if (candErr) throw candErr;

          const candidateIds = (candidates || []).map((c) => c.id);

          // 2) Aggregate wishlist counts for those candidates.
          const saveCounts = new Map<string, number>();
          if (candidateIds.length > 0) {
            const { data: wishlistData } = await supabase
              .from("shopper_wishlists")
              .select("link_id")
              .in("link_id", candidateIds);
            wishlistData?.forEach((w: any) => {
              saveCounts.set(w.link_id, (saveCounts.get(w.link_id) || 0) + 1);
            });
          }

          // 3) Sort by save count desc, tiebreak by recency (already desc from query).
          const ranked = (candidates || []).slice().sort((a: any, b: any) => {
            const diff = (saveCounts.get(b.id) || 0) - (saveCounts.get(a.id) || 0);
            if (diff !== 0) return diff;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

          const pageSlice = ranked.slice(pageNum * pageSize, (pageNum + 1) * pageSize);
          const sliceIds = pageSlice.map((r: any) => r.id);

          if (sliceIds.length > 0) {
            const { data: linkRows, error: linkErr } = await supabase
              .from("links")
              .select("id, product_title, product_image_url, affiliate_url, retailer, user_id, created_at")
              .in("id", sliceIds);
            if (linkErr) throw linkErr;

            const byId = new Map((linkRows || []).map((r: any) => [r.id, r]));
            rows = sliceIds.map((id) => byId.get(id)).filter(Boolean);
          }

          setHasMoreProducts(pageSlice.length === pageSize);
        } else if (sortBy === "trending") {
          // True click-based trending. `clicks` is revoked from shoppers at the
          // column level, so the ranking runs server-side in a SECURITY DEFINER
          // RPC that returns only safe columns (see the get_trending_links SQL).
          const { data, error } = await (supabase.rpc as any)("get_trending_links", {
            p_exclude_user: user?.id ?? null,
            p_search: escaped,
            p_limit: pageSize,
            p_offset: pageNum * pageSize,
          });
          if (error) throw error;
          rows = data || [];
          setHasMoreProducts(rows.length === pageSize);
        } else {
          // Newest = created_at desc, paginated server-side.
          let query = buildBaseQuery().order("created_at", { ascending: false });
          query = query.range(pageNum * pageSize, (pageNum + 1) * pageSize - 1);

          const { data, error } = await query;
          if (error) throw error;
          rows = data || [];
          setHasMoreProducts(rows.length === pageSize);
        }

        const mappedProducts: ExploreProduct[] = rows.map((item) => {
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
      } catch (error) {
        console.error("Error fetching products:", error);
        setProductsError(true);
      } finally {
        setProductsLoading(false);
      }
    },
    [debouncedSearch, sortBy, user],
  );

  // Fetch creators
  const fetchCreators = useCallback(async () => {
    setCreatorsLoading(true);
    setCreatorsError(false);
    try {
      const { data, error } = await supabase.rpc("get_discoverable_creators_with_instagram");

      if (error) throw error;

      let rows = (data || []) as any[];

      // Client-side search filter
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        rows = rows.filter(
          (c) =>
            (c.display_name || "").toLowerCase().includes(q) ||
            (c.username || "").toLowerCase().includes(q) ||
            (c.bio || "").toLowerCase().includes(q),
        );
      }

      // Sort
      if (sortBy === "newest") {
        rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      const mappedCreators: ExploreCreator[] = rows.map((c: any) => ({
        id: c.id,
        displayName: c.display_name,
        username: c.username,
        photoUrl: c.photo_url,
        coverImageUrl: c.cover_image_url || null,
        bio: c.bio,
        nicheTags: c.niche_tags,
        tier: c.tier,
      }));

      if (sortBy === "most-saved" && mappedCreators.length > 0) {
        const creatorIds = mappedCreators.map((c) => c.id);
        const { data: followData } = await supabase
          .from("shopper_follows")
          .select("creator_id")
          .in("creator_id", creatorIds);

        const followCounts = new Map<string, number>();
        followData?.forEach((f) => {
          followCounts.set(f.creator_id, (followCounts.get(f.creator_id) || 0) + 1);
        });

        mappedCreators.sort((a, b) => (followCounts.get(b.id) || 0) - (followCounts.get(a.id) || 0));
      }

      setCreators(mappedCreators);
    } catch (error) {
      console.error("Error fetching creators:", error);
      setCreatorsError(true);
    } finally {
      setCreatorsLoading(false);
    }
  }, [debouncedSearch, sortBy]);

  // Fetch brands
  const fetchBrands = useCallback(async () => {
    setBrandsLoading(true);
    setBrandsError(false);
    try {
      let query = supabase
        .from("brands")
        .select(
          "id, name, slug, logo_url, hero_image_url, website_url, description, commission_percent, is_partner, is_trending, created_at",
        );

      // Apply sorting
      if (sortBy === "newest") {
        query = query.order("created_at", { ascending: false });
      } else {
        query = query
          .order("is_partner", { ascending: false })
          .order("is_trending", { ascending: false })
          .order("name", { ascending: true });
      }

      if (debouncedSearch) {
        const escaped = escapeLikePattern(debouncedSearch);
        query = query.ilike("name", `%${escaped}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Cross-reference brand_accounts for uploaded logos
      const brandIds = (data || []).map((b: any) => b.id);
      const { data: accountsData } =
        brandIds.length > 0
          ? await supabase.from("brand_accounts").select("id, logo_upload_url, logo_url").in("id", brandIds)
          : { data: [] };

      const accountsMap = new Map((accountsData || []).map((a: any) => [a.id, a]));

      const mappedBrands: ExploreBrand[] = (data || []).map((b: any) => {
        const account = accountsMap.get(b.id);
        return {
          id: b.id,
          name: b.name,
          slug: b.slug,
          logoUrl: account?.logo_upload_url || account?.logo_url || b.logo_url,
          heroImageUrl: account?.hero_image_url || b.hero_image_url || null,
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
      setBrandsError(true);
    } finally {
      setBrandsLoading(false);
    }
  }, [debouncedSearch, sortBy]);

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
  }, [activeTab, debouncedSearch, sortBy, fetchProducts, fetchCreators, fetchBrands]);

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
      { threshold: 0.1 },
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
          toast({ title: "Saved to wishlist" });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not update wishlist",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Could not update follow status",
        variant: "destructive",
      });
    }
  };

  // Handle product card click
  const handleProductClick = async (_affiliateUrl: string, productId: string, creatorId: string) => {
    // Track click for explore-specific analytics
    if (user) {
      void supabase.from("explore_clicks").insert({
        link_id: productId,
        creator_id: creatorId,
        viewer_user_id: user.id,
        source: "explore",
      });
    }

    // Look up the creator's username for the ref param
    const product = products.find((p) => p.id === productId);
    const creatorUsername = product?.creatorUsername;

    window.open(
      buildAffiliateRedirectUrl(productId, creatorUsername || creatorId, "explore"),
      "_blank",
      "noopener,noreferrer",
    );
  };

  // Handle auth success
  const handleAuthSuccess = async () => {
    await refetch();
    if (pendingAction) {
      if (pendingAction.type === "wishlist") {
        const product = products.find((p) => p.id === pendingAction.targetId);
        if (product) {
          await addToWishlist(pendingAction.targetId, product.creatorId);
          toast({ title: "Saved to wishlist" });
        }
      } else if (pendingAction.type === "follow") {
        await followCreator(pendingAction.targetId);
        toast({ title: "Following!" });
      }
      setPendingAction(null);
    }
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    try {
      await removeFromWishlist(productId);
      toast({ title: "Removed from wishlist" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not remove from wishlist",
        variant: "destructive",
      });
    }
  };

  const handleOpenChat = () => {
    window.location.href = "mailto:support@mystorefront.io";
  };

  // Determine if we can show commission (only for creators and admins)
  const canSeeCommission = role === "creator" || role === "admin";

  // Loading state
  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  const renderProductsTab = () => {
    if (productsLoading && products.length === 0) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <ExploreProductCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (productsError) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-display text-lg text-foreground mb-2">Something went wrong</p>
          <p className="text-sm text-muted-foreground mb-4">Please try again.</p>
          <button
            onClick={() => fetchProducts(0, true)}
            className="text-xs uppercase tracking-[0.15em] text-foreground border-b border-foreground hover:opacity-70 transition-opacity"
          >
            Retry
          </button>
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-display text-lg text-foreground mb-2">No products found</p>
          <p className="text-sm text-muted-foreground">Try a different keyword.</p>
        </div>
      );
    }

    return (
      <>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {products.map((product) => (
            <motion.div key={product.id} variants={fadeInUp}>
              <ExploreProductCard
                product={product}
                isInWishlist={isInWishlist(product.id)}
                onToggleWishlist={handleWishlistToggle}
                onCardClick={handleProductClick}
              />
            </motion.div>
          ))}
        </motion.div>

        {hasMoreProducts && (
          <div ref={loadMoreRef} className="flex justify-center py-12">
            {productsLoading && products.length > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading more...
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  const renderCreatorsTab = () => {
    if (creatorsLoading) {
      return (
        <div className="max-w-3xl mx-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <ExploreCreatorCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (creatorsError) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-display text-lg text-foreground mb-2">Something went wrong</p>
          <p className="text-sm text-muted-foreground mb-4">Please try again.</p>
          <button
            onClick={fetchCreators}
            className="text-xs uppercase tracking-[0.15em] text-foreground border-b border-foreground hover:opacity-70 transition-opacity"
          >
            Retry
          </button>
        </div>
      );
    }

    if (creators.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-display text-lg text-foreground mb-2">No creators found</p>
          <p className="text-sm text-muted-foreground">Try searching by handle.</p>
        </div>
      );
    }

    return (
      <motion.div className="max-w-3xl mx-auto" variants={staggerContainer} initial="hidden" animate="visible">
        {creators.map((creator, index) => (
          <motion.div key={creator.id} variants={fadeInUp}>
            <ExploreCreatorCard
              creator={creator}
              index={index}
              isFollowing={isFollowing(creator.id)}
              onToggleFollow={handleFollowToggle}
            />
          </motion.div>
        ))}
      </motion.div>
    );
  };

  const renderBrandsTab = () => {
    if (brandsLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
          {Array.from({ length: 4 }).map((_, i) => (
            <ExploreBrandCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (brandsError) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-display text-lg text-foreground mb-2">Something went wrong</p>
          <p className="text-sm text-muted-foreground mb-4">Please try again.</p>
          <button
            onClick={fetchBrands}
            className="text-xs uppercase tracking-[0.15em] text-foreground border-b border-foreground hover:opacity-70 transition-opacity"
          >
            Retry
          </button>
        </div>
      );
    }

    if (brands.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-display text-lg text-foreground mb-2">No brands found</p>
          <p className="text-sm text-muted-foreground">Try a different brand name.</p>
        </div>
      );
    }

    return (
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {brands.map((brand) => (
          <motion.div key={brand.id} variants={fadeInUp}>
            <ExploreBrandCard brand={brand} showCommission={canSeeCommission} netRate={role === "creator"} />
          </motion.div>
        ))}
      </motion.div>
    );
  };

  const handleUnfollow = async (creatorId: string) => {
    try {
      await unfollowCreator(creatorId);
      toast({ title: "Unfollowed" });
    } catch {
      toast({ title: "Error", description: "Could not unfollow creator", variant: "destructive" });
    }
  };

  const renderFollowingTab = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Users className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="font-display text-lg text-foreground mb-2">Sign in to see who you follow</p>
          <p className="text-sm text-muted-foreground">Follow creators to keep their picks close.</p>
        </div>
      );
    }

    if (followsLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        </div>
      );
    }

    if (follows.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Users className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="font-display text-lg text-foreground mb-2">No creators followed yet</p>
          <p className="text-sm text-muted-foreground">Discover and follow creators to see their latest picks.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {follows.map((follow) => (
          <Card key={follow.id} className="overflow-hidden hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={follow.profile?.photo_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {follow.profile?.display_name?.[0] || "C"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {follow.profile?.display_name || "Creator"}
                  </h3>
                  {follow.profile?.username && (
                    <p className="text-sm text-muted-foreground">@{follow.profile.username}</p>
                  )}
                </div>
              </div>

              {follow.profile?.bio && (
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{follow.profile.bio}</p>
              )}

              <div className="flex gap-2 mt-4">
                {follow.profile?.username ? (
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to={`/${follow.profile.username}`}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Shop
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="flex-1" disabled>
                    No Shop
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnfollow(follow.creator_id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "products":
        return renderProductsTab();
      case "creators":
        return renderCreatorsTab();
      case "brands":
        return renderBrandsTab();
      case "following":
        return renderFollowingTab();
      case "wishlist":
        return (
          <ExploreWishlistGrid onProductClick={handleProductClick} onRemoveFromWishlist={handleRemoveFromWishlist} />
        );
      default:
        return null;
    }
  };

  // Inner content - just the explore page content without wrapper/footer
  const innerContent = (
    <div className="pb-6 sm:pb-16">
      {/* Header with Search and Sort */}
      <ExploreHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Divider */}
      <div className="w-full h-px bg-border my-10 sm:my-12" />

      {/* Tabs */}
      <ExploreTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="mt-10 sm:mt-12">{renderTabContent()}</div>

      {/* Help Modal */}
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} onOpenChat={handleOpenChat} />

      {/* Auth Modal */}
      <ShopperAuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthSuccess}
        pendingAction={
          pendingAction
            ? {
                type: pendingAction.type,
                targetId: pendingAction.targetId,
              }
            : undefined
        }
      />
    </div>
  );

  // When showLayout is true (shopper view), wrap with ShopperLayout
  if (showLayout) {
    return <ShopperLayout displayName={profile?.display_name || undefined}>{innerContent}</ShopperLayout>;
  }

  // When showLayout is false (creator/admin in DashboardLayout), just return content
  // DashboardLayout already provides the page wrapper and footer
  return <>{innerContent}</>;
}

import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useShopperData } from "@/hooks/useShopperData";
import { useToast } from "@/hooks/use-toast";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { CreatorNavbar } from "@/components/layout/CreatorNavbar";
import { useProfile } from "@/hooks/useProfile";
import { ShopperAuthModal } from "@/components/auth/ShopperAuthModal";
import { ShopHero } from "@/components/shop/ShopHero";
import { ShopTabs } from "@/components/shop/ShopTabs";
import { AllProductsGrid, ProductItem } from "@/components/shop/AllProductsGrid";
import { CollectionsGrid } from "@/components/shop/CollectionsGrid";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { ShareShopModal } from "@/components/shop/ShareShopModal";
import { buildAffiliateRedirectUrl } from "@/lib/tracking";
import { Loader2, ShoppingBag, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CreatorProfile {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  username: string | null;
  bio: string | null;
  niche_tags: string[] | null;
  location_tags: string[] | null;
  attribute_tags: string[] | null;
  tier: string | null;
}

interface Collection {
  id: string;
  title: string;
  description: string | null;
  product_ids: string[];
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CollectionProduct {
  id: string;
  title: string;
  image_url: string | null;
  retailer: string | null;
  description: string | null;
  affiliate_url: string;
}

interface CreatorSocials {
  instagram_handle: string | null;
  tiktok_handle: string | null;
  youtube_url: string | null;
  other_urls: string[] | null;
}

interface PendingAction {
  type: "wishlist" | "follow";
  targetId: string;
  targetName?: string;
}

export default function PublicCreatorShop() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { followCreator, unfollowCreator, isFollowing, addToWishlist, isInWishlist, refetch } = useShopperData();
  const { profile: viewerProfile } = useProfile();
  const { toast } = useToast();

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [socials, setSocials] = useState<CreatorSocials | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<CollectionProduct[]>([]);
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const [activeTab, setActiveTab] = useState("all-products");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (username) {
      fetchCreatorShop();
    }
  }, [username]);

  // Check if brand has saved this creator
  useEffect(() => {
    const checkIfSaved = async () => {
      if (!user || role !== "brand" || !creator) return;

      // Get brand account
      const { data: brandAccount } = await supabase
        .from("brand_accounts")
        .select("id")
        .eq("owner_user_id", user.id)
        .single();

      if (!brandAccount) return;

      // Check if creator is in any of the brand's saved lists
      const { data: savedItem } = await supabase
        .from("brand_saved_list_items")
        .select("id, list_id!inner(brand_id)")
        .eq("creator_id", creator.id)
        .eq("list_id.brand_id", brandAccount.id)
        .limit(1)
        .maybeSingle();

      setIsSaved(!!savedItem);
    };

    checkIfSaved();
  }, [user, role, creator]);

  const fetchCreatorShop = async () => {
    try {
      // Fetch creator profile
      const { data: publicProfileData, error: profileError } = await (supabase as any)
        .rpc("get_public_creator_profile", { p_username: username });
      const profileData = publicProfileData?.[0] ?? null;

      if (profileError || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setCreator(profileData);

      // Fetch socials
      const { data: socialsData } = await supabase
        .from("creator_socials")
        .select("instagram_handle, tiktok_handle, youtube_url, other_urls")
        .eq("user_id", profileData.id)
        .single();
      
      setSocials(socialsData || null);

      // Fetch products (links) via SECURITY DEFINER RPC — excludes soft-deleted
      const { data: linksData } = await supabase
        .rpc("get_public_creator_links", { p_user_id: profileData.id });

      // For CollectionsGrid (legacy format)
      setProducts(
        (linksData || []).map((link) => ({
          id: link.id,
          title: link.product_title,
          image_url: link.product_image_url,
          retailer: link.retailer,
          description: link.description,
          affiliate_url: link.affiliate_url,
        }))
      );

      // For AllProductsGrid (full format)
      setAllProducts(
        (linksData || []).map((link) => ({
          id: link.id,
          title: link.product_title,
          image_url: link.product_image_url,
          retailer: link.retailer,
          description: link.description,
          affiliate_url: link.affiliate_url,
        }))
      );

      // Fetch collections
      const { data: collectionsData } = await supabase
        .from("collections")
        .select("id, title, description, product_ids, is_archived, sort_order, created_at, updated_at")
        .eq("user_id", profileData.id)
        .eq("is_archived", false)
        .order("sort_order", { ascending: true });

      setCollections((collectionsData as unknown as Collection[]) || []);
    } catch (error) {
      console.error("Error fetching creator shop:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = async (product: ProductItem) => {
    if (!creator) return;
    window.open(buildAffiliateRedirectUrl(product.id, creator.username || creator.id), "_blank", "noopener,noreferrer");
  };

  const handleFollow = async () => {
    if (!creator) return;
    
    if (!user) {
      setPendingAction({ type: "follow", targetId: creator.id, targetName: creator.display_name || undefined });
      setAuthModalOpen(true);
      return;
    }

    const { error } = await followCreator(creator.id);
    if (error) {
      toast({
        title: "Error",
        description: "Could not follow creator",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Following!",
        description: `You're now following ${creator.display_name}`,
      });
    }
  };

  const handleAuthSuccess = useCallback(async () => {
    if (!pendingAction || !creator) return;

    setTimeout(async () => {
      await refetch();
      
      if (pendingAction.type === "wishlist") {
        const { error } = await addToWishlist(pendingAction.targetId, creator.id);
        if (!error) {
          toast({
            title: "Saved to wishlist",
            description: "Product added to your wishlist",
          });
        }
      } else if (pendingAction.type === "follow") {
        const { error } = await followCreator(pendingAction.targetId);
        if (!error) {
          toast({
            title: `Now following @${creator.username}`,
            description: `You're now following ${creator.display_name}`,
          });
        }
      }
      
      setPendingAction(null);
    }, 500);
  }, [pendingAction, creator, addToWishlist, followCreator, refetch, toast]);

  const handleOpenChat = () => {
    window.location.href = "mailto:support@mystorefront.io";
  };

  const handleSaveCreator = async () => {
    if (!user || !creator) return;

    try {
      // Get or create brand account
      const { data: brandAccount } = await supabase
        .from("brand_accounts")
        .select("id")
        .eq("owner_user_id", user.id)
        .single();

      if (!brandAccount) {
        toast({
          title: "Error",
          description: "No brand account found",
          variant: "destructive",
        });
        return;
      }

      // Get or create default saved list
      let { data: savedList } = await supabase
        .from("brand_saved_lists")
        .select("id")
        .eq("brand_id", brandAccount.id)
        .eq("name", "Saved Creators")
        .single();

      if (!savedList) {
        const { data: newList, error: createError } = await supabase
          .from("brand_saved_lists")
          .insert({ brand_id: brandAccount.id, name: "Saved Creators" })
          .select("id")
          .single();

        if (createError) throw createError;
        savedList = newList;
      }

      if (isSaved) {
        // Remove from saved list
        await supabase
          .from("brand_saved_list_items")
          .delete()
          .eq("list_id", savedList.id)
          .eq("creator_id", creator.id);

        setIsSaved(false);
        toast({
          title: "Removed",
          description: `${creator.display_name} removed from saved creators`,
        });
      } else {
        // Add to saved list
        await supabase
          .from("brand_saved_list_items")
          .insert({ list_id: savedList.id, creator_id: creator.id });

        setIsSaved(true);
        toast({
          title: "Saved!",
          description: `${creator.display_name} added to saved creators`,
        });
      }
    } catch (error) {
      console.error("Error saving creator:", error);
      toast({
        title: "Error",
        description: "Could not save creator",
        variant: "destructive",
      });
    }
  };

  // Filter collections by search query
  const searchFilteredCollections = collections.filter((collection) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    if (collection.title.toLowerCase().includes(query)) return true;
    
    const collectionProductIds = collection.product_ids || [];
    return collectionProductIds.some((productId) => {
      const product = allProducts.find((p) => p.id === productId);
      if (!product) return false;
      return (
        product.title.toLowerCase().includes(query) ||
        (product.retailer && product.retailer.toLowerCase().includes(query)) ||
        (product.description && product.description.toLowerCase().includes(query))
      );
    });
  });

  const sortedCollections = [...searchFilteredCollections].sort((a, b) => a.sort_order - b.sort_order);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-12">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="font-display text-2xl font-bold mb-2">Storefront Not Found</h1>
            <p className="text-muted-foreground mb-6">
              This creator storefront doesn't exist or hasn't been set up yet.
            </p>
            <Button asChild>
              <Link to="/explore">Discover Creators</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const following = creator ? isFollowing(creator.id) : false;
  const isOwnShop = user?.id === creator?.id;

  const renderTabContent = () => {
    switch (activeTab) {
      case "all-products":
        return (
          <AllProductsGrid
            products={allProducts}
            isLoading={loading}
            isCreatorView={false}
            onProductClick={handleProductClick}
            searchQuery={searchQuery}
          />
        );
      
      case "collections":
        return (
          <CollectionsGrid 
            collections={sortedCollections}
            products={products}
            isEditMode={false}
            isPublicView={true}
            onProductClick={(product) => product.affiliate_url && handleProductClick(product as ProductItem)}
            username={creator?.username || null}
            isLoading={loading}
          />
        );
      
      case "instagram":
        return (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-display font-medium text-foreground mb-2">
              Instagram content coming soon
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              This creator hasn't connected their Instagram yet.
            </p>
          </div>
        );
      
      case "tiktok":
        return (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-display font-medium text-foreground mb-2">
              TikTok content coming soon
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              This creator hasn't connected their TikTok yet.
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-card flex flex-col">
      {role === "creator" || role === "admin" ? (
        <CreatorNavbar
          tier={viewerProfile?.tier}
          displayName={viewerProfile?.display_name || undefined}
          instagramConnected={viewerProfile?.instagram_connected || false}
          tiktokConnected={viewerProfile?.tiktok_connected || false}
        />
      ) : (
        <PublicHeader onAuthRequired={() => setAuthModalOpen(true)} />
      )}
      
      <main className="relative flex-1">
        {/* Main Content Container */}
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-10 pb-6 sm:pb-16">
          {/* Profile Hero */}
          <ShopHero 
            displayName={creator?.display_name || "Creator"}
            photoUrl={creator?.photo_url}
            bio={creator?.bio}
            nicheTags={creator?.niche_tags}
            locationTags={creator?.location_tags}
            attributeTags={creator?.attribute_tags}
            instagramHandle={socials?.instagram_handle}
            tiktokHandle={socials?.tiktok_handle}
            youtubeUrl={socials?.youtube_url}
            otherUrls={socials?.other_urls}
            username={creator?.username}
            isOwnShop={isOwnShop}
            isPublicView={true}
            isFollowing={following}
            viewerRole={role}
            isSaved={isSaved}
            onFollow={handleFollow}
            onUnfollow={() => creator && unfollowCreator(creator.id)}
            onShare={() => setShareModalOpen(true)}
            onSave={handleSaveCreator}
          />

          {/* Secondary Navigation Tabs */}
          <ShopTabs 
            activeTab={activeTab}
            onTabChange={setActiveTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* Disclosure */}
          <p className="text-xs text-muted-foreground mt-6">*Links may earn commission.</p>

          {/* Tab Content */}
          <div className="mt-8">
            {renderTabContent()}
          </div>
        </div>
      </main>

      {/* Footer — only for signed-in viewers */}
      {user && (
        <ShopFooter 
          onHelpClick={() => {}}
          onChatClick={handleOpenChat}
        />
      )}

      <ShopperAuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthSuccess}
        pendingAction={pendingAction || undefined}
      />

      <ShareShopModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        username={creator?.username || null}
      />
    </div>
  );
}
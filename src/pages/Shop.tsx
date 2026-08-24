import { useState, useEffect } from "react";
import { CreatorNavbar } from "@/components/layout/CreatorNavbar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSocials } from "@/hooks/useSocials";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShopHero } from "@/components/shop/ShopHero";
import { ShopQuickActions } from "@/components/shop/ShopQuickActions";
import { ShopTabs } from "@/components/shop/ShopTabs";
import { CollectionsGrid } from "@/components/shop/CollectionsGrid";
import { AllProductsGrid, ProductItem } from "@/components/shop/AllProductsGrid";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { CreateCollectionModal } from "@/components/shop/CreateCollectionModal";
import { AddToCollectionModal } from "@/components/shop/AddToCollectionModal";
import { ShareShopModal } from "@/components/shop/ShareShopModal";

import { HelpModal } from "@/components/shop/HelpModal";
import { CreateLinkModal } from "@/components/links/CreateLinkModal";
import { EditLinkModal } from "@/components/links/EditLinkModal";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { InAppBrowserNotice } from "@/components/InAppBrowserNotice";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2, Plus, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreatorTags {
  locations: string[] | null;
  niches: string[] | null;
  attributes: string[] | null;
}

// TikTok icon component
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  );
}

export interface Collection {
  id: string;
  title: string;
  description: string | null;
  product_ids: string[];
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionProduct {
  id: string;
  title: string;
  image_url: string | null;
}

export default function Shop() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refetch: refetchProfile } = useProfile();
  const { socials, refetch: refetchSocials } = useSocials();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { instagramConnection, tiktokConnection, connectInstagram, connectTikTok } = useSocialConnections();

  const [activeTab, setActiveTab] = useState("all-products");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [addToCollectionProduct, setAddToCollectionProduct] = useState<ProductItem | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<CollectionProduct[]>([]);
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [creatorTags, setCreatorTags] = useState<CreatorTags | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAddProductGuide, setShowAddProductGuide] = useState(false);

  useEffect(() => {
    const qcModal = searchParams.get("qcModal");
    if (qcModal === "add-product") setIsAddProductModalOpen(true);
    if (qcModal === "create-collection") setIsCreateModalOpen(true);
    if (qcModal === "share-shop") setIsShareModalOpen(true);
    if (qcModal === "help") setIsHelpModalOpen(true);
  }, [searchParams]);

  // Check if onboarding should be shown
  useEffect(() => {
    if (profile && !profile.onboarding_completed) {
      setShowOnboarding(true);
    }
  }, [profile]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setActiveTab("all-products");
    setShowAddProductGuide(true);
    refetchProfile();
  };

  useEffect(() => {
    if (authLoading || user) return;

    // Don't redirect on a momentary null user — double-check with the SDK
    // (which may still be refreshing the session) before bouncing to /auth.
    let cancelled = false;
    const verifyAndRedirect = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        navigate("/auth");
      }
    };

    const timer = window.setTimeout(verifyAndRedirect, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user, authLoading, navigate]);

  const fetchCollections = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setCollections((data as unknown as Collection[]) || []);
    } catch (error) {
      console.error("Error fetching collections:", error);
    }
  };

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc("get_own_links");

      if (error) throw error;

      const sorted = (data || []).sort((a: any, b: any) => {
        const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      // For CollectionsGrid (legacy format)
      setProducts(
        sorted.map((link: any) => ({
          id: link.id,
          title: link.product_title,
          image_url: link.product_image_url,
        })),
      );

      // For AllProductsGrid (full format)
      setAllProducts(
        sorted.map((link: any) => ({
          id: link.id,
          title: link.product_title,
          image_url: link.product_image_url,
          retailer: link.retailer,
          description: link.description,
          affiliate_url: link.affiliate_url,
          sort_order: link.sort_order ?? 0,
        })),
      );
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchCreatorTags = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("creator_tags")
        .select("locations, niches, attributes")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setCreatorTags(data || null);
    } catch (error) {
      console.error("Error fetching creator tags:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchCollections(), fetchProducts(), fetchCreatorTags()]);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleCollectionCreated = () => {
    fetchCollections();
    setIsCreateModalOpen(false);
  };

  const handleAddProduct = (collectionId?: string) => {
    setShowAddProductGuide(false);
    if (collectionId) {
      setSelectedCollectionId(collectionId);
    }
    setIsAddProductModalOpen(true);
  };

  const handleProductCreated = async () => {
    await fetchProducts();
    // If we have a selected collection, add the new product to it
    if (selectedCollectionId) {
      const collection = collections.find((c) => c.id === selectedCollectionId);
      if (collection) {
        // Get the latest product (just created)
        const { data } = await supabase
          .from("links")
          .select("id")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (data) {
          await supabase
            .from("collections")
            .update({ product_ids: [...collection.product_ids, data.id] })
            .eq("id", selectedCollectionId);

          toast({ title: "Product added to collection" });
          fetchCollections();
        }
      }
    }
    setSelectedCollectionId(null);
  };

  const handleOpenChat = () => {
    window.location.href = "mailto:support@mystorefront.io";
  };

  const handleCopyReferralLink = async () => {
    const referralCode = profile?.username || user?.id;
    if (!referralCode) return;

    const referralUrl = new URL("/become-a-creator", window.location.origin);
    referralUrl.searchParams.set("ref", referralCode);
    try {
      await navigator.clipboard.writeText(referralUrl.toString());
      toast({ title: "Referral link copied", description: "Referrals count once the creator has been accepted." });
    } catch {
      toast({ title: "Referral link", description: referralUrl.toString() });
    }
  };

  // Show all collections in the creator's own view — including hidden (archived)
  // ones, which render with a "(Hidden)" label and an Unhide option. The public
  // shop filters archived collections out separately.
  const filteredCollections = collections;

  // Filter collections by search query
  const searchFilteredCollections = filteredCollections.filter((collection) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    // Check if collection title matches or any product in collection matches
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

  // Sort collections
  const sortedCollections = [...searchFilteredCollections].sort((a, b) => {
    return a.sort_order - b.sort_order;
  });

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Show onboarding wizard for new creators who haven't completed setup
  if (showOnboarding && profile) {
    return (
      <OnboardingWizard
        userId={user.id}
        displayName={profile.display_name || user.email?.split("@")[0] || ""}
        initialStep={profile.onboarding_step || 0}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "all-products":
        return (
          <AllProductsGrid
            products={allProducts}
            isLoading={loading}
            isCreatorView={true}
            onAddProduct={() => handleAddProduct()}
            onProductsChange={loadData}
            onEditProduct={(product) => setEditingProduct(product)}
            onAddToCollection={(product) => setAddToCollectionProduct(product)}
            searchQuery={searchQuery}
            onReorder={(reordered) => setAllProducts(reordered)}
            creatorUsername={profile?.username || null}
          />
        );

      case "collections":
        return (
          <CollectionsGrid
            collections={sortedCollections}
            products={products}
            isEditMode={false}
            onAddCollection={() => setIsCreateModalOpen(true)}
            onAddProduct={handleAddProduct}
            onCollectionsChange={loadData}
            username={profile?.username || null}
            isLoading={loading}
          />
        );

      case "instagram":
        if (!instagramConnection) {
          return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Instagram className="h-10 w-10 text-muted-foreground mb-6" />
              <p className="font-display text-xl text-foreground mb-2">Connect Instagram</p>
              <p className="text-sm text-muted-foreground max-w-md mb-8">
                Link your Instagram professional account to showcase your featured posts and create shoppable content
                for your audience.
              </p>
              <InAppBrowserNotice className="max-w-md mb-6 text-left" />
              <button
                onClick={() => connectInstagram()}
                className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-foreground group"
              >
                <Instagram className="h-3.5 w-3.5" />
                <span className="border-b border-foreground group-hover:border-transparent transition-colors">
                  Connect Instagram
                </span>
              </button>
              <p className="text-xs text-muted-foreground mt-6 max-w-sm">
                Requires an Instagram Professional (Business or Creator) account
              </p>
            </div>
          );
        }
        return (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Instagram className="h-8 w-8 text-muted-foreground mb-6" />
            <p className="font-display text-lg text-foreground mb-2">Instagram Connected</p>
            <p className="text-sm text-muted-foreground max-w-sm mb-1">
              @{instagramConnection.username} · {instagramConnection.follower_count.toLocaleString()} followers
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">Shoppable Instagram posts coming soon.</p>
          </div>
        );

      case "tiktok":
        if (!tiktokConnection) {
          return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <TikTokIcon className="h-10 w-10 text-muted-foreground mb-6" />
              <p className="font-display text-xl text-foreground mb-2">Connect TikTok</p>
              <p className="text-sm text-muted-foreground max-w-md mb-8">
                Link your TikTok account to showcase your featured videos and create shoppable content for your
                audience.
              </p>
              <button
                onClick={connectTikTok}
                className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-foreground group"
              >
                <TikTokIcon className="h-3.5 w-3.5" />
                <span className="border-b border-foreground group-hover:border-transparent transition-colors">
                  Connect TikTok
                </span>
              </button>
            </div>
          );
        }
        return (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <TikTokIcon className="h-8 w-8 text-muted-foreground mb-6" />
            <p className="font-display text-lg text-foreground mb-2">TikTok Connected</p>
            <p className="text-sm text-muted-foreground max-w-sm mb-1">
              @{tiktokConnection.username} · {tiktokConnection.follower_count.toLocaleString()} followers
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">Shoppable TikTok videos coming soon.</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CreatorNavbar
        tier={profile?.tier || "enthusiast"}
        displayName={profile?.display_name || undefined}
        instagramConnected={profile?.instagram_connected || false}
        tiktokConnected={profile?.tiktok_connected || false}
      />

      <main className="relative flex-1">
        {/* Main Content Container */}
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-6 sm:pb-16">
          {/* Profile Hero */}
          <ShopHero
            displayName={profile?.display_name || "Creator"}
            photoUrl={profile?.photo_url}
            bio={profile?.bio}
            nicheTags={profile?.niche_tags?.length ? profile.niche_tags : creatorTags?.niches}
            locationTags={profile?.location_tags?.length ? profile.location_tags : creatorTags?.locations}
            attributeTags={creatorTags?.attributes}
            instagramHandle={socials?.instagram_handle}
            tiktokHandle={socials?.tiktok_handle}
            youtubeUrl={socials?.youtube_url}
            otherUrls={socials?.other_urls}
            username={profile?.username}
            isOwnShop={true}
            onShareShop={() => setIsShareModalOpen(true)}
          />

          <ShopQuickActions
            onShareClick={() => setIsShareModalOpen(true)}
            onCopyReferralLink={handleCopyReferralLink}
          />

          {/* Secondary Navigation Tabs */}
          <ShopTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {showAddProductGuide && activeTab === "all-products" && (
            <div className="border border-foreground p-5 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">
                    Next recommended action
                  </p>
                  <p className="font-display text-xl sm:text-2xl text-foreground">Add your first product</p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                    Your storefront is set up. Add a product link now so shoppers have something to discover.
                  </p>
                </div>
                <button
                  onClick={() => handleAddProduct()}
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-foreground border-b border-foreground pb-1 self-start"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Product
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Section Controls - Editorial text links */}
          <div className={`flex items-center justify-between gap-6 ${activeTab === "all-products" ? "mb-3" : "mb-10"}`}>
            <p className="text-xs text-muted-foreground">*Links may earn commission.</p>
            <div className="flex items-center gap-6">
              {activeTab === "collections" && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-foreground group"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="border-b border-foreground group-hover:border-transparent transition-colors">
                    Add Collection
                  </span>
                </button>
              )}
              {activeTab === "all-products" && (
                <button
                  onClick={() => handleAddProduct()}
                  className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-foreground group"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="border-b border-foreground group-hover:border-transparent transition-colors">
                    Add Product
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Tab Content */}
          {renderTabContent()}
        </div>
      </main>

      {/* Footer with Help */}
      <ShopFooter onHelpClick={() => setIsHelpModalOpen(true)} onChatClick={handleOpenChat} />

      {/* Modals */}
      <CreateCollectionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleCollectionCreated}
        products={products}
      />

      <AddToCollectionModal
        open={!!addToCollectionProduct}
        onOpenChange={(open) => !open && setAddToCollectionProduct(null)}
        product={addToCollectionProduct}
        collections={collections}
        products={products}
        onSaved={loadData}
        onCreateCollection={() => {
          setAddToCollectionProduct(null);
          setIsCreateModalOpen(true);
        }}
      />

      <ShareShopModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        username={profile?.username || null}
      />

      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} onOpenChat={handleOpenChat} />

      <CreateLinkModal
        open={isAddProductModalOpen}
        onOpenChange={setIsAddProductModalOpen}
        onLinkCreated={handleProductCreated}
      />

      <EditLinkModal
        open={!!editingProduct}
        onOpenChange={(open) => {
          if (!open) setEditingProduct(null);
        }}
        link={
          editingProduct
            ? {
                id: editingProduct.id,
                product_title: editingProduct.title,
                product_image_url: editingProduct.image_url,
                affiliate_url: editingProduct.affiliate_url,
                retailer: editingProduct.retailer,
                description: editingProduct.description,
              }
            : null
        }
        onLinkUpdated={loadData}
      />
    </div>
  );
}

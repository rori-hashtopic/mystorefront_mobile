import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { ShopperLayout } from "@/components/layout/ShopperLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Heart, Trash2, ExternalLink, ShoppingBag, Search, Compass } from "lucide-react";
import { useShopperData } from "@/hooks/useShopperData";
import { ShopperAuthModal } from "@/components/auth/ShopperAuthModal";
import { useToast } from "@/hooks/use-toast";


export default function ShopperWishlist() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { profile } = useProfile();
  const { wishlist, loading, removeFromWishlist } = useShopperData();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("qcModal") === "auth") {
      setAuthModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      setAuthModalOpen(true);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!roleLoading && role && role !== "shopper" && role !== "admin" && role !== "creator") {
      if (role === "brand") navigate("/brand");
    }
  }, [role, roleLoading, navigate]);

  const handleRemove = async (linkId: string) => {
    const { error } = await removeFromWishlist(linkId);
    if (error) {
      toast({ title: "Error", description: "Could not remove from wishlist", variant: "destructive" });
    } else {
      toast({ title: "Removed", description: "Item removed from wishlist" });
    }
  };

  const filteredWishlist = wishlist.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return item.link?.product_title?.toLowerCase().includes(query) || item.link?.retailer?.toLowerCase().includes(query);
  });

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <ShopperLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <Heart className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Your Wishlist</h1>
          <p className="text-muted-foreground mb-6 text-center max-w-md">Sign in to save products.</p>
          <Button onClick={() => setAuthModalOpen(true)}>Sign in to view wishlist</Button>
        </div>
        <ShopperAuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} onSuccess={() => setAuthModalOpen(false)} />
      </ShopperLayout>
    );
  }

  return (
    <ShopperLayout displayName={profile?.display_name || undefined}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">My Wishlist</h1>
          <p className="text-muted-foreground">Products you've saved • {wishlist.length} item{wishlist.length !== 1 ? "s" : ""}</p>
        </div>

        {wishlist.length > 0 && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search saved items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : wishlist.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No saved items yet</h3>
              <p className="text-muted-foreground mb-4">Tap the heart to save products.</p>
              <Button asChild><Link to="/explore"><Compass className="h-4 w-4 mr-2" />Explore Products</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredWishlist.map((item) => (
              <Card key={item.id} className="overflow-hidden group">
                <div className="aspect-square relative bg-muted">
                  {item.link?.product_image_url ? (
                    <img src={item.link.product_image_url} alt={item.link.product_title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-12 w-12 text-muted-foreground" /></div>
                  )}
                  <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" asChild>
                      <a href={item.link?.affiliate_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Shop</a>
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleRemove(item.link_id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2">{item.link?.product_title || "Product"}</h3>
                  {item.link?.retailer && <p className="text-xs text-muted-foreground mt-1">{item.link.retailer}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ShopperLayout>
  );
}
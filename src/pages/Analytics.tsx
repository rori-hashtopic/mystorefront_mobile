import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import {
  Plus,
  Search,
  Download,
  Link2,
  MousePointer,
  ShoppingCart,
  DollarSign,
  Trash2,
  Pencil,
  ArrowRight,
} from "lucide-react";
import { CreateLinkModal } from "@/components/links/CreateLinkModal";
import { EditLinkModal } from "@/components/links/EditLinkModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { appendTrackingParams } from "@/lib/tracking";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { useSocials } from "@/hooks/useSocials";
import { InstagramAnalyticsCard } from "@/components/analytics/InstagramAnalyticsCard";

interface LinkWithCollections {
  id: string;
  product_title: string;
  product_image_url: string | null;
  affiliate_url: string;
  retailer: string | null;
  clicks: number | null;
  orders: number | null;
  earned: number | null;
  created_at: string | null;
  description?: string | null;
  content_url?: string | null;
  collections: string[];
}

interface Collection {
  id: string;
  title: string;
  product_ids: string[];
}

export default function Analytics() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const {
    instagramConnection,
    loading: igLoading,
    isSyncing,
    connectInstagram,
    refreshInstagram,
  } = useSocialConnections();
  const { socials } = useSocials();
  const instagramHandleFromOnboarding = socials?.instagram_handle ?? null;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<LinkWithCollections | null>(null);
  const [links, setLinks] = useState<LinkWithCollections[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLinksWithCollections = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: linksData, error: linksError } = await supabase.rpc("get_own_links_full", {
        p_include_archived: false,
      });

      if (linksError) throw linksError;

      const { data: collectionsData, error: collectionsError } = await supabase
        .from("collections")
        .select("id, title, product_ids");

      if (collectionsError) throw collectionsError;

      const linksWithCollections = (linksData || []).map((link) => {
        const linkCollections = (collectionsData || [])
          .filter((col: Collection) => col.product_ids?.includes(link.id))
          .map((col: Collection) => col.title);

        return {
          ...link,
          collections: linkCollections,
        };
      });

      setLinks(linksWithCollections);
    } catch (error) {
      console.error("Error fetching links:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinksWithCollections();
  }, []);

  const handleDeleteLink = async (id: string) => {
    try {
      const { error } = await supabase.from("links").delete().eq("id", id);
      if (error) throw error;
      setLinks(links.filter((link) => link.id !== id));
      toast({ title: "Link deleted" });
    } catch (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleEditLink = (link: LinkWithCollections) => {
    setSelectedLink(link);
    setIsEditModalOpen(true);
  };

  const handleCopyAffiliateLink = async (affiliateUrl: string) => {
    try {
      const trackedUrl = appendTrackingParams(affiliateUrl, null, profile?.username || undefined);
      await navigator.clipboard.writeText(trackedUrl);
      toast({ title: "Affiliate link copied" });
    } catch (error) {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  const handleDownloadCSV = () => {
    if (links.length === 0) {
      toast({ title: "No products to export", variant: "destructive" });
      return;
    }

    const headers = [
      "CreatedOn",
      "Title",
      "Brand",
      "Collections",
      "OrderCount",
      "OrderVolume",
      "Clicks",
      "AffiliateUrl",
      "OriginalDestinationUrl",
    ];

    const rows = links.map((link) => [
      link.created_at ? new Date(link.created_at).toLocaleDateString() : "",
      `"${(link.product_title || "").replace(/"/g, '""')}"`,
      `"${(link.retailer || "").replace(/"/g, '""')}"`,
      `"${link.collections.join(", ").replace(/"/g, '""')}"`,
      link.orders || 0,
      link.earned || 0,
      link.clicks || 0,
      `"${link.affiliate_url}"`,
      `"${link.content_url || link.affiliate_url}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `analytics-export-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "CSV downloaded" });
  };

  const filteredLinks = links.filter(
    (link) =>
      link.product_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (link.retailer && link.retailer.toLowerCase().includes(searchQuery.toLowerCase())) ||
      link.collections.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <DashboardLayout
      tier={profile?.tier}
      displayName={profile?.display_name || undefined}
      instagramConnected={profile?.instagram_connected || false}
      tiktokConnected={profile?.tiktok_connected || false}
    >
      <div className="flex flex-col min-h-[calc(100vh-8rem)]">
        <div className="flex-1">
          {/* Editorial Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 sm:mb-12"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Your Links</p>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-foreground">Analytics</h1>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 min-h-[44px]"
              >
                Create New Link
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="h-px bg-border mt-6" />
          </motion.div>

          {/* Instagram Analytics */}
          <InstagramAnalyticsCard
            connection={instagramConnection}
            loading={igLoading}
            isSyncing={isSyncing.instagram}
            onConnect={connectInstagram}
            onRefresh={refreshInstagram}
            instagramHandleFromOnboarding={instagramHandleFromOnboarding}
          />

          {/* Editorial Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8"
          >
            <div className="relative flex-1">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full bg-transparent border-0 border-b border-border focus:border-foreground pl-6 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={handleDownloadCSV}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 min-h-[44px]"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
          </motion.div>

          {/* Links list or empty state */}
          {isLoading ? (
            <div className="py-16 sm:py-24 text-center">
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          ) : filteredLinks.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-0"
            >
              {filteredLinks.map((link, index) => (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="py-6 border-b border-border"
                >
                  {/* Desktop layout */}
                  <div className="hidden sm:flex sm:items-center gap-4">
                    <span className="text-xs text-muted-foreground font-mono w-8">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <button
                      onClick={() => handleEditLink(link)}
                      className="flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      {link.product_image_url ? (
                        <img src={link.product_image_url} alt={link.product_title} className="w-20 h-20 object-cover" />
                      ) : (
                        <div className="w-20 h-20 bg-muted flex items-center justify-center">
                          <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {link.collections.length > 0 && (
                        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">
                          {link.collections.join(" · ")}
                        </p>
                      )}
                      <button
                        onClick={() => handleEditLink(link)}
                        className="text-left hover:opacity-80 transition-opacity block w-full min-w-0"
                      >
                        <h3 className="font-display text-xl text-foreground truncate">{link.product_title}</h3>
                        <p className="text-sm text-muted-foreground">{link.retailer || "Unknown retailer"}</p>
                      </button>
                      {link.description && (
                        <p className="text-sm text-muted-foreground mt-1 truncate max-w-md">{link.description}</p>
                      )}
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm flex-shrink-0">
                      <div className="text-center w-16">
                        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">Clicks</p>
                        <p className="font-display text-xl text-foreground">{link.clicks || 0}</p>
                      </div>
                      <div className="text-center w-16">
                        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">Orders</p>
                        <p className="font-display text-xl text-foreground">{link.orders || 0}</p>
                      </div>
                      <div className="text-center w-16">
                        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-1">Earned</p>
                        <p className="font-display text-xl text-foreground">R{(link.earned || 0).toFixed(0)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-shrink-0">
                      <button
                        onClick={() => handleEditLink(link)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] inline-flex items-center"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleCopyAffiliateLink(link.affiliate_url)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] inline-flex items-center"
                      >
                        Copy Link
                      </button>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="text-xs text-destructive hover:text-destructive/80 transition-colors min-h-[44px] inline-flex items-center"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Mobile layout — compact horizontal card */}
                  <div className="flex sm:hidden gap-3">
                    <button
                      onClick={() => handleEditLink(link)}
                      className="flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      {link.product_image_url ? (
                        <img
                          src={link.product_image_url}
                          alt={link.product_title}
                          className="w-14 h-14 object-cover rounded"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-muted flex items-center justify-center rounded">
                          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {link.collections.length > 0 && (
                        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                          {link.collections.join(" · ")}
                        </p>
                      )}
                      <button onClick={() => handleEditLink(link)} className="text-left block w-full">
                        <h3 className="font-display text-sm text-foreground truncate leading-tight">
                          {link.product_title}
                        </h3>
                        <p className="text-xs text-muted-foreground">{link.retailer || "Unknown retailer"}</p>
                      </button>

                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                        <span>
                          <MousePointer className="h-3 w-3 inline mr-0.5 -mt-px" />
                          {link.clicks || 0}
                        </span>
                        <span>
                          <ShoppingCart className="h-3 w-3 inline mr-0.5 -mt-px" />
                          {link.orders || 0}
                        </span>
                        <span className="text-foreground font-medium">R{(link.earned || 0).toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="py-16 sm:py-24 text-center"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Get Started</p>
              <h3 className="font-display text-2xl sm:text-3xl text-foreground mb-4">No products yet</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Create your first affiliate link to start earning from your product recommendations.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="text-sm text-foreground hover:text-muted-foreground transition-colors inline-flex items-center gap-1.5 border-b border-foreground pb-1"
              >
                Create Your First Link
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </div>
      </div>

      <CreateLinkModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onLinkCreated={fetchLinksWithCollections}
      />

      <EditLinkModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        link={selectedLink}
        onLinkUpdated={fetchLinksWithCollections}
      />
    </DashboardLayout>
  );
}

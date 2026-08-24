import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, ArrowLeft, Loader2, Check, ExternalLink, Package, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinkCreated?: () => void;
}

interface ExtractedProduct {
  title: string;
  price: number | null;
  currency: string;
  description: string | null;
  image_url: string | null;
  brand: string | null;
  retailer: string;
  source_url: string;
  selected_color?: string | null;
  selected_size?: string | null;
  variant_name?: string | null;
}

type ModalView = "options" | "search-catalog" | "add-by-url" | "manual-entry";

const getVariantText = (product: ExtractedProduct) =>
  [product.selected_color, product.selected_size, product.variant_name]
    .map((part) => part?.trim())
    .filter(
      (part, index, parts): part is string =>
        Boolean(part) && parts.findIndex((value) => value?.toLowerCase() === part?.toLowerCase()) === index,
    )
    .join(" / ");

const isBlockedExtraction = (product: ExtractedProduct) => {
  const blockedText = [product.title, product.description, product.retailer, product.variant_name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /access\s+blocked|blocked\s+access|access\s+denied|access\s+restricted|attention\s+required|cloudflare|login\s+to\s+access|log\s+in\s+to\s+access|sign\s+in\s+to\s+access|forbidden|unauthorized|not\s+authorized|captcha|robot|bot\s+detection|verify\s+you\s+are\s+human|are\s+you\s+human|just\s+a\s+moment|checking\s+your\s+browser|please\s+enable\s+(?:js|javascript)|enable\s+cookies|page\s+not\s+found|denied\s+notification|access\s+notification/.test(
    blockedText,
  );
};

const getDomainFromUrl = (value: string) => {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const looksLikeExtractionFailure = (value: unknown) => {
  if (!value) return false;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return /access\s+blocked|attention\s+required|cloudflare|forbidden|unauthorized|captcha|robot|bot\s+detection|verify\s+you\s+are\s+human|couldn'?t\s+extract|failed\s+to\s+extract/i.test(
    text,
  );
};

const OPTIONS = [
  {
    id: "add-by-url" as const,
    title: "Add by URL",
    description: "Paste any product URL to create an affiliate link",
    comingSoon: false,
  },
  {
    id: "search-catalog" as const,
    title: "Search Catalog",
    description: "Browse thousands of products from partner brands",
    comingSoon: true,
  },
];

export function CreateLinkModal({ open, onOpenChange, onLinkCreated }: CreateLinkModalProps) {
  const { toast } = useToast();
  const [view, setView] = useState<ModalView>("options");
  const [searchQuery, setSearchQuery] = useState("");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [extractedProduct, setExtractedProduct] = useState<ExtractedProduct | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);

  // Manual entry fields
  const [manualTitle, setManualTitle] = useState("");
  const [manualRetailer, setManualRetailer] = useState("");
  const [manualImageUrl, setManualImageUrl] = useState("");

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setView("options");
      setSearchQuery("");
      setUrl("");
      setExtractedProduct(null);
      setExtractionFailed(false);
      setManualTitle("");
      setManualRetailer("");
      setManualImageUrl("");
    }, 200);
  };

  const handleBack = () => {
    if (view === "manual-entry") {
      setView("add-by-url");
      setExtractionFailed(false);
    } else if (extractedProduct) {
      setExtractedProduct(null);
    } else {
      setView("options");
      setSearchQuery("");
      setUrl("");
      setExtractionFailed(false);
    }
  };

  const handleExtractProduct = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setExtractedProduct(null);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-product", {
        body: { url: url.trim() },
      });

      if (error) throw error;

      if (data.success && data.product) {
        if (isBlockedExtraction(data.product)) {
          setManualTitle("");
          setManualRetailer(data.product.retailer || getDomainFromUrl(url.trim()));
          setManualImageUrl(data.product.image_url || "");
          setView("manual-entry");
          toast({
            title: "Access blocked",
            description: "Add the product details manually to create the affiliate link.",
          });
          return;
        }

        setExtractedProduct(data.product);
        toast({
          title: "Product found!",
          description: `Extracted details for "${data.product.title}"`,
        });
      } else {
        setManualRetailer(getDomainFromUrl(url.trim()));
        setView("manual-entry");
        toast({
          title: "Couldn't extract details",
          description: "Add the product details manually to create the affiliate link.",
        });
      }
    } catch (error) {
      console.error("Error extracting product:", error);
      setManualRetailer(getDomainFromUrl(url.trim()));
      setView("manual-entry");
      toast({
        title: looksLikeExtractionFailure(error) ? "Access blocked" : "Couldn't extract details",
        description: "Add the product details manually to create the affiliate link.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLink = async () => {
    if (!extractedProduct) return;
    setIsSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("links").insert({
        user_id: user.id,
        product_title: extractedProduct.title,
        product_image_url: extractedProduct.image_url,
        affiliate_url: extractedProduct.source_url,
        retailer: extractedProduct.retailer,
        platform: extractedProduct.source_url.includes("myshopify.com") ? "shopify" : "woocommerce", // 👈 ADD THIS
      });

      if (error) throw error;

      toast({ title: "Link created!", description: "Your affiliate link has been saved." });
      onLinkCreated?.();
      handleClose();
    } catch (error) {
      console.error("Error saving link:", error);
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Could not save the link",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveManualLink = async () => {
    if (!manualTitle.trim() || !url.trim()) return;
    setIsSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("links").insert({
        user_id: user.id,
        product_title: manualTitle.trim(),
        product_image_url: manualImageUrl.trim() || null,
        affiliate_url: url.trim(),
        retailer: manualRetailer.trim() || null,
      });

      if (error) throw error;

      toast({ title: "Link created!", description: "Your affiliate link has been saved." });
      onLinkCreated?.();
      handleClose();
    } catch (error) {
      console.error("Error saving link:", error);
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Could not save the link",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderOptions = () => (
    <div className="space-y-0">
      {OPTIONS.map((option, index) => (
        <div key={option.id}>
          {index === 0 && <div className="h-px bg-border" />}
          <button
            onClick={() => !option.comingSoon && setView(option.id)}
            disabled={option.comingSoon}
            className="w-full flex items-center justify-between py-6 group text-left transition-colors hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-45"
            aria-disabled={option.comingSoon}
          >
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-display text-xl tracking-tight text-foreground">{option.title}</h3>
                {option.comingSoon && (
                  <span className="border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 group-disabled:translate-x-0 transition-all shrink-0 ml-4" />
          </button>
          <div className="h-px bg-border" />
        </div>
      ))}
    </div>
  );

  const renderSearchCatalog = () => (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search products, brands, categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-b border-border pb-2 pl-6 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors"
          autoFocus
        />
      </div>
      <div className="min-h-[200px] flex items-center justify-center text-muted-foreground">
        {searchQuery ? (
          <p className="text-sm">No products found for "{searchQuery}"</p>
        ) : (
          <p className="text-sm italic">Start typing to search the catalog</p>
        )}
      </div>
    </div>
  );

  const renderAddByUrl = () => {
    if (extractedProduct) {
      const variantText = getVariantText(extractedProduct);

      return (
        <div className="space-y-6">
          <div className="flex gap-5 py-4 border-b border-border">
            {extractedProduct.image_url ? (
              <img
                src={extractedProduct.image_url}
                alt={extractedProduct.title}
                className="w-20 h-20 object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 bg-muted flex items-center justify-center flex-shrink-0">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-display text-lg tracking-tight text-foreground line-clamp-2 break-words">
                {extractedProduct.title}
              </h4>
              {extractedProduct.price && (
                <p className="text-foreground font-medium mt-1">
                  {extractedProduct.currency} {extractedProduct.price.toFixed(2)}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-0.5">{extractedProduct.retailer}</p>
              {variantText && <p className="text-xs text-muted-foreground mt-1">variant: {variantText}</p>}
              <a
                href={extractedProduct.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-2 transition-colors"
              >
                View original <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <button
            onClick={handleSaveLink}
            disabled={isSaving}
            className="group inline-flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Saving...</span>
              </>
            ) : (
              <>
                <span className="text-sm">Create Affiliate Link</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3 block">Product URL</label>
          <input
            type="text"
            placeholder="https://example.com/product..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
            className="w-full bg-transparent border-b border-border pb-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors"
          />
          <p className="text-xs text-muted-foreground mt-3">
            Paste any product URL and we'll automatically extract the details
          </p>
        </div>
        <button
          onClick={handleExtractProduct}
          disabled={!url.trim() || isLoading}
          className="group inline-flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Extracting product details...</span>
            </>
          ) : (
            <>
              <span className="text-sm">Extract Product</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
        <div>
          {extractionFailed && (
            <p className="text-sm text-muted-foreground mb-3">
              We couldn't extract details from this URL. You can add them manually.
            </p>
          )}
          <button
            onClick={() => setView("manual-entry")}
            className="group inline-flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity"
          >
            <span className="text-sm">Add Manually</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  };

  const renderManualEntry = () => (
    <div className="space-y-6">
      <div>
        <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3 block">Product Name *</label>
        <input
          type="text"
          placeholder="e.g. Nike Air Max 90"
          value={manualTitle}
          onChange={(e) => setManualTitle(e.target.value)}
          autoFocus
          className="w-full bg-transparent border-b border-border pb-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3 block">Brand / Retailer</label>
        <input
          type="text"
          placeholder="e.g. Nike, Zara, Woolworths"
          value={manualRetailer}
          onChange={(e) => setManualRetailer(e.target.value)}
          className="w-full bg-transparent border-b border-border pb-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3 block">
          Product Image URL *
        </label>
        <input
          type="text"
          placeholder="https://example.com/image.jpg"
          value={manualImageUrl}
          onChange={(e) => setManualImageUrl(e.target.value)}
          className="w-full bg-transparent border-b border-border pb-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Paste a direct link to the product image. Tip: left-click the product image on the retailer site and choose
          “Copy Image Address”.
        </p>
      </div>
      <div>
        <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3 block">Link URL *</label>
        <input
          type="text"
          placeholder="https://example.com/product..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full bg-transparent border-b border-border pb-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground transition-colors"
        />
        <p className="text-xs text-muted-foreground mt-2">The destination URL shoppers will be sent to.</p>
      </div>
      <div>
        <button
          onClick={handleSaveManualLink}
          disabled={!manualTitle.trim() || !manualImageUrl.trim() || !url.trim() || isSaving}
          className="group inline-flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Saving...</span>
            </>
          ) : (
            <>
              <span className="text-sm">Create Affiliate Link</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  const getTitle = () => {
    switch (view) {
      case "search-catalog":
        return "Search Catalog";
      case "add-by-url":
        return "Add by URL";
      case "manual-entry":
        return "Add Manually";
      default:
        return "Create New Link";
    }
  };

  const renderContent = () => {
    switch (view) {
      case "search-catalog":
        return renderSearchCatalog();
      case "add-by-url":
        return renderAddByUrl();
      case "manual-entry":
        return renderManualEntry();
      default:
        return renderOptions();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <div className="flex items-center gap-3 min-w-0">
            {view !== "options" && (
              <button
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <DialogTitle className="font-display text-2xl tracking-tight truncate">{getTitle()}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="mt-2 min-w-0">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}

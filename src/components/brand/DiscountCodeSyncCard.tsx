import { useState, useEffect, useCallback } from "react";
import {
  Tag,
  CheckCircle,
  XCircle,
  Loader2,
  Unplug,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────

interface WooCommerceSettings {
  id: string;
  woocommerce_site_url: string;
  woocommerce_webhook_url: string;
  is_verified: boolean;
  last_verified_at: string | null;
}

const WOO_SETTINGS_COLUMNS =
  "id, woocommerce_site_url, woocommerce_webhook_url, is_verified, last_verified_at";

interface ShopifySettings {
  brand_id: string;
  shop_domain: string;
  plugin_base_url: string;
  is_verified: boolean;
}



interface DiscountCodeSyncCardProps {
  brandId: string;
}

// ── Component ──────────────────────────────────────────────────────────

export function DiscountCodeSyncCard({ brandId }: DiscountCodeSyncCardProps) {
  const { toast } = useToast();
  const [platform, setPlatform] = useState<"woocommerce" | "shopify">("woocommerce");

  // ═══════════════════════════════════════════════════════════════════
  // WooCommerce state (fully isolated)
  // ═══════════════════════════════════════════════════════════════════
  const [wooSettings, setWooSettings] = useState<WooCommerceSettings | null>(null);
  const [wooLoading, setWooLoading] = useState(true);
  const [wooSiteUrl, setWooSiteUrl] = useState("");
  const [wooWebhookUrl, setWooWebhookUrl] = useState("");
  const [wooApiKey, setWooApiKey] = useState("");
  const [wooSaving, setWooSaving] = useState(false);
  const [wooDisconnecting, setWooDisconnecting] = useState(false);
  const [wooSyncedCount, setWooSyncedCount] = useState<number | null>(null);

  // ═══════════════════════════════════════════════════════════════════
  // Shopify state (fully isolated)
  // ═══════════════════════════════════════════════════════════════════
  const [shopifySettings, setShopifySettings] = useState<ShopifySettings | null>(null);
  const [shopifyLoading, setShopifyLoading] = useState(true);
  const [shopifyDomain, setShopifyDomain] = useState("");
  const [shopifyApiKey, setShopifyApiKey] = useState("");
  const [shopifySaving, setShopifySaving] = useState(false);
  const [shopifyDisconnecting, setShopifyDisconnecting] = useState(false);
  const [shopifySyncedCount, setShopifySyncedCount] = useState<number | null>(null);
  const [shopifyUnsyncedCount, setShopifyUnsyncedCount] = useState<number | null>(null);
  const [shopifyCountsLoading, setShopifyCountsLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // WooCommerce data loading (runs once on mount)
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    async function loadWoo() {
      setWooLoading(true);

      const { data, error } = await supabase
        .from("brand_woocommerce_settings")
        .select(WOO_SETTINGS_COLUMNS)
        .eq("brand_id", brandId)
        .maybeSingle();

      if (!error && data) {
        setWooSettings(data as WooCommerceSettings);
      }

      const { count } = await supabase
        .from("discount_codes")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", brandId)
        .eq("woocommerce_synced", true);

      setWooSyncedCount(count ?? 0);
      setWooLoading(false);
    }

    loadWoo();
  }, [brandId]);

  // ═══════════════════════════════════════════════════════════════════
  // Shopify data loading (runs once on mount)
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    async function loadShopify() {
      setShopifyLoading(true);

      const { data, error } = await supabase
        .from("brand_shopify_settings")
        .select("brand_id, shop_domain, plugin_base_url, is_verified")
        .eq("brand_id", brandId)
        .maybeSingle();

      if (!error && data) {
        setShopifySettings(data as ShopifySettings);
      }

      await refreshShopifySyncedCount();
      setShopifyLoading(false);
    }

    loadShopify();
  }, [brandId]);

  // ═══════════════════════════════════════════════════════════════════
  // Shopify count refresh
  // ═══════════════════════════════════════════════════════════════════
  const refreshShopifySyncedCount = useCallback(async () => {
    setShopifyCountsLoading(true);
    try {
      const [totalResult, syncedResult] = await Promise.all([
        supabase
          .from("discount_codes")
          .select("id", { count: "exact", head: true })
          .eq("brand_id", brandId),
        supabase
          .from("discount_codes")
          .select("id", { count: "exact", head: true })
          .eq("brand_id", brandId)
          .not("shopify_price_rule_id", "is", null),
      ]);

      if (totalResult.error || syncedResult.error) {
        setShopifySyncedCount(null);
        setShopifyUnsyncedCount(null);
      } else {
        const total = totalResult.count ?? 0;
        const synced = syncedResult.count ?? 0;
        setShopifySyncedCount(synced);
        setShopifyUnsyncedCount(total - synced);
      }
    } catch {
      setShopifySyncedCount(null);
      setShopifyUnsyncedCount(null);
    } finally {
      setShopifyCountsLoading(false);
    }
  }, [brandId]);

  // ═══════════════════════════════════════════════════════════════════
  // WooCommerce handlers
  // ═══════════════════════════════════════════════════════════════════
  async function handleWooSaveAndVerify(e: React.FormEvent) {
    e.preventDefault();
    setWooSaving(true);

    const cleanSiteUrl = wooSiteUrl.trim().replace(/\/$/, "");
    const cleanWebhookUrl = wooWebhookUrl.trim();
    const cleanApiKey = wooApiKey.trim();

    if (!cleanSiteUrl || !cleanWebhookUrl || !cleanApiKey) {
      toast({
        title: "Missing fields",
        description: "Please fill in all three fields before saving.",
        variant: "destructive",
      });
      setWooSaving(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "verify-woocommerce-coupon-connection",
        {
          body: {
            brand_id: brandId,
            woocommerce_site_url: cleanSiteUrl,
            woocommerce_webhook_url: cleanWebhookUrl,
            woocommerce_api_key: cleanApiKey,
          },
        }
      );

      if (error || !data?.verified) {
        toast({
          title: "Connection failed",
          description:
            data?.error ??
            error?.message ??
            "Could not reach your WooCommerce store. Double-check the URL and API key.",
          variant: "destructive",
        });
        setWooSaving(false);
        return;
      }

      const { data: fresh } = await supabase
        .from("brand_woocommerce_settings")
        .select(WOO_SETTINGS_COLUMNS)
        .eq("brand_id", brandId)
        .single();

      setWooSettings(fresh as WooCommerceSettings);
      setWooSiteUrl("");
      setWooWebhookUrl("");
      setWooApiKey("");

      toast({
        title: "Connected!",
        description: "Your WooCommerce store is linked for discount code sync.",
      });
    } catch (err) {
      toast({
        title: "Unexpected error",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setWooSaving(false);
    }
  }

  async function handleWooDisconnect() {
    if (
      !window.confirm(
        "Disconnect your WooCommerce store? Future discount codes won't be synced automatically."
      )
    ) {
      return;
    }

    setWooDisconnecting(true);

    const { error } = await supabase
      .from("brand_woocommerce_settings")
      .delete()
      .eq("brand_id", brandId);

    if (error) {
      toast({
        title: "Disconnect failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setWooSettings(null);
      toast({ title: "Disconnected", description: "WooCommerce link removed." });
    }

    setWooDisconnecting(false);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Shopify handlers
  // ═══════════════════════════════════════════════════════════════════
  async function handleShopifyVerify(e: React.FormEvent) {
    e.preventDefault();
    setShopifySaving(true);

    const cleanDomain = shopifyDomain.trim();
    const cleanKey = shopifyApiKey.trim();

    if (!cleanDomain || !cleanKey) {
      toast({
        title: "Missing fields",
        description: "Please fill in both fields before verifying.",
        variant: "destructive",
      });
      setShopifySaving(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "verify-shopify-coupon-connection",
        {
          body: {
            brand_id: brandId,
            shop_domain: cleanDomain,
            mystorefront_api_key: cleanKey,
          },
        }
      );

      if (error || !data?.success) {
        toast({
          title: "Connection failed",
          description:
            data?.error ??
            error?.message ??
            "Could not reach your Shopify store. Double-check the domain and API key.",
          variant: "destructive",
        });
        setShopifySaving(false);
        return;
      }

      const { data: fresh } = await supabase
        .from("brand_shopify_settings")
        .select("brand_id, shop_domain, plugin_base_url, is_verified")
        .eq("brand_id", brandId)
        .single();

      setShopifySettings(fresh as ShopifySettings);
      setShopifyDomain("");
      setShopifyApiKey("");

      toast({
        title: "Connected!",
        description: "Your Shopify store is linked for discount code sync.",
      });
    } catch (err) {
      toast({
        title: "Unexpected error",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setShopifySaving(false);
    }
  }

  async function handleShopifyDisconnect() {
    if (
      !window.confirm(
        "Disconnect your Shopify store? Future discount codes won't be synced automatically."
      )
    ) {
      return;
    }

    setShopifyDisconnecting(true);

    const { error } = await supabase
      .from("brand_shopify_settings")
      .delete()
      .eq("brand_id", brandId);

    if (error) {
      toast({
        title: "Disconnect failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setShopifySettings(null);
      toast({ title: "Disconnected", description: "Shopify link removed." });
    }

    setShopifyDisconnecting(false);
  }

  async function handleBackfill() {
    setBackfilling(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "backfill-shopify-price-rule-ids",
        { body: { brand_id: brandId } }
      );

      if (error || !data?.success) {
        toast({
          title: "Backfill failed",
          description: data?.error ?? error?.message ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Backfill complete",
        description: `${data.updated} updated, ${data.skipped} skipped out of ${data.matched} matched.`,
      });

      await refreshShopifySyncedCount();
    } catch (err) {
      toast({
        title: "Unexpected error",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBackfilling(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Discount Code Sync
        </CardTitle>
        <CardDescription>
          Automatically sync discount codes between MyStorefront and your online store.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Platform toggle – pill style matching TrackingIntegrationCard */}
        <div className="flex gap-2">
          <Button
            variant={platform === "woocommerce" ? "default" : "outline"}
            size="sm"
            onClick={() => setPlatform("woocommerce")}
          >
            WooCommerce
          </Button>
          <Button
            variant={platform === "shopify" ? "default" : "outline"}
            size="sm"
            onClick={() => setPlatform("shopify")}
          >
            Shopify
          </Button>
        </div>

        {/* ── WooCommerce Tab ────────────────────────────────────── */}
        {platform === "woocommerce" && (
          <>
            {wooLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : wooSettings?.is_verified ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Connected
                  </span>
                  <span className="text-sm text-muted-foreground font-mono">
                    {wooSettings.woocommerce_site_url}
                  </span>
                </div>

                {wooSyncedCount !== null && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {wooSyncedCount}
                    </span>{" "}
                    {wooSyncedCount === 1 ? "code" : "codes"} synced to WooCommerce
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleWooDisconnect}
                  disabled={wooDisconnecting}
                  className="inline-flex items-center gap-2 rounded-md border border-destructive/50 bg-background px-3 py-1.5 text-sm font-medium text-destructive shadow-sm hover:bg-destructive/10 disabled:opacity-60 transition-colors"
                >
                  {wooDisconnecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Unplug className="h-3.5 w-3.5" />
                  )}
                  Disconnect
                </button>
              </div>
            ) : (
              <form onSubmit={handleWooSaveAndVerify} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="woo-site-url"
                    className="text-sm font-medium leading-none"
                  >
                    WooCommerce Site URL
                  </label>
                  <input
                    id="woo-site-url"
                    type="url"
                    placeholder="https://mybrand.co.za"
                    value={wooSiteUrl}
                    onChange={(e) => setWooSiteUrl(e.target.value)}
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="woo-webhook-url"
                    className="text-sm font-medium leading-none"
                  >
                    Your plugin's Incoming Webhook URL
                  </label>
                  <input
                    id="woo-webhook-url"
                    type="url"
                    placeholder="https://mybrand.co.za/wp-json/hashtopic/v1/create-coupon"
                    value={wooWebhookUrl}
                    onChange={(e) => setWooWebhookUrl(e.target.value)}
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Copy this from{" "}
                    <strong>WooCommerce → Settings → Advanced → HashTopic Postback</strong>{" "}
                    → "Incoming Webhook URL".
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="woo-api-key"
                    className="text-sm font-medium leading-none"
                  >
                    API Key from your WooCommerce plugin
                  </label>
                  <input
                    id="woo-api-key"
                    type="text"
                    placeholder="e.g. 3f2a1b4c…"
                    value={wooApiKey}
                    onChange={(e) => setWooApiKey(e.target.value)}
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Copy the "MyStorefront API Key" from the same settings page.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={wooSaving}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {wooSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying connection…
                    </>
                  ) : (
                    "Save & Verify Connection"
                  )}
                </button>

                {wooSettings && !wooSettings.is_verified && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <XCircle className="h-4 w-4" />
                    Previous verification failed. Please check your settings.
                  </div>
                )}
              </form>
            )}
          </>
        )}

        {/* ── Shopify Tab ────────────────────────────────────────── */}
        {platform === "shopify" && (
          <>
            {shopifyLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : shopifySettings?.is_verified ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Connected
                  </span>
                  <span className="text-sm text-muted-foreground font-mono">
                    {shopifySettings.shop_domain}
                  </span>
                </div>

                {shopifyCountsLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Checking sync status…
                  </div>
                ) : shopifySyncedCount !== null && (
                  <div className="space-y-2">
                    {shopifyUnsyncedCount === 0 ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle className="h-3.5 w-3.5" />
                          All codes are synced ✔
                        </span>
                        <p className="text-sm text-muted-foreground">
                          {shopifySyncedCount} {shopifySyncedCount === 1 ? "code" : "codes"} synced to Shopify
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          Some codes need syncing
                        </span>
                        <p className="text-sm text-muted-foreground">
                          {shopifySyncedCount} of {shopifySyncedCount + (shopifyUnsyncedCount ?? 0)} {" "}
                          codes synced to Shopify
                        </p>
                        <button
                          type="button"
                          onClick={handleBackfill}
                          disabled={backfilling}
                          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-accent disabled:opacity-60 transition-colors"
                        >
                          {backfilling ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Backfill Shopify IDs
                        </button>
                      </>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleShopifyDisconnect}
                  disabled={shopifyDisconnecting}
                  className="inline-flex items-center gap-2 rounded-md border border-destructive/50 bg-background px-3 py-1.5 text-sm font-medium text-destructive shadow-sm hover:bg-destructive/10 disabled:opacity-60 transition-colors"
                >
                  {shopifyDisconnecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Unplug className="h-3.5 w-3.5" />
                  )}
                  Disconnect
                </button>
              </div>
            ) : (
              <form onSubmit={handleShopifyVerify} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="shopify-domain"
                    className="text-sm font-medium leading-none"
                  >
                    Shop Domain
                  </label>
                  <input
                    id="shopify-domain"
                    type="text"
                    placeholder="fashionbrandhouse.myshopify.com"
                    value={shopifyDomain}
                    onChange={(e) => setShopifyDomain(e.target.value)}
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="shopify-api-key"
                    className="text-sm font-medium leading-none"
                  >
                    MyStorefront API Key
                  </label>
                  <input
                    id="shopify-api-key"
                    type="text"
                    placeholder="e.g. 3f2a1b4c…"
                    value={shopifyApiKey}
                    onChange={(e) => setShopifyApiKey(e.target.value)}
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Copy the API key from your Shopify app's{" "}
                    <strong>Settings</strong> page.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={shopifySaving}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {shopifySaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying connection…
                    </>
                  ) : (
                    "Verify Connection"
                  )}
                </button>

                {shopifySettings && !shopifySettings.is_verified && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <XCircle className="h-4 w-4" />
                    Previous verification failed. Please check your settings.
                  </div>
                )}
              </form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

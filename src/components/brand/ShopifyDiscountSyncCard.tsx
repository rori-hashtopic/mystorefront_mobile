import { useState, useEffect, useCallback } from "react";
import { Tag, CheckCircle, XCircle, Loader2, Unplug, RefreshCw, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ShopifySettings {
  brand_id: string;
  shop_domain: string;
  plugin_base_url: string;
  is_verified: boolean;
}

interface ShopifyDiscountSyncCardProps {
  brandId: string;
}

export function ShopifyDiscountSyncCard({ brandId }: ShopifyDiscountSyncCardProps) {
  const { toast } = useToast();

  const [settings, setSettings] = useState<ShopifySettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [shopDomain, setShopDomain] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [unsyncedCount, setUnsyncedCount] = useState<number | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingSettings(true);

      const { data, error } = await supabase
        .from("brand_shopify_settings")
        .select("brand_id, shop_domain, plugin_base_url, is_verified")
        .eq("brand_id", brandId)
        .maybeSingle();

      if (!error && data) {
        setSettings(data as ShopifySettings);
      }

      await refreshSyncedCount();
      setLoadingSettings(false);
    }

    load();
  }, [brandId]);

  const refreshSyncedCount = useCallback(async () => {
    setCountsLoading(true);
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
        setSyncedCount(null);
        setUnsyncedCount(null);
      } else {
        const total = totalResult.count ?? 0;
        const synced = syncedResult.count ?? 0;
        setSyncedCount(synced);
        setUnsyncedCount(total - synced);
      }
    } catch {
      setSyncedCount(null);
      setUnsyncedCount(null);
    } finally {
      setCountsLoading(false);
    }
  }, [brandId]);

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

      await refreshSyncedCount();
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

  async function handleImport() {
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "import-shopify-coupons",
        { body: { brand_id: brandId } }
      );

      if (error || !data?.success) {
        toast({
          title: "Import failed",
          description: data?.error ?? error?.message ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }

      const parts: string[] = [];
      if (data.upserted > 0) parts.push(`${data.upserted} synced`);
      if (data.deleted > 0) parts.push(`${data.deleted} removed`);
      if (data.errors > 0) parts.push(`${data.errors} failed`);
      toast({
        title: "Import complete",
        description: parts.length > 0 ? parts.join(", ") : "Everything is up to date.",
      });

      await refreshSyncedCount();
    } catch (err) {
      toast({
        title: "Unexpected error",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const cleanDomain = shopDomain.trim();
    const cleanKey = apiKey.trim();

    if (!cleanDomain || !cleanKey) {
      toast({
        title: "Missing fields",
        description: "Please fill in both fields before verifying.",
        variant: "destructive",
      });
      setSaving(false);
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
        setSaving(false);
        return;
      }

      const { data: fresh } = await supabase
        .from("brand_shopify_settings")
        .select("brand_id, shop_domain, plugin_base_url, is_verified")
        .eq("brand_id", brandId)
        .single();

      setSettings(fresh as ShopifySettings);
      setShopDomain("");
      setApiKey("");

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
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (
      !window.confirm(
        "Disconnect your Shopify store? Future discount codes won't be synced automatically."
      )
    ) {
      return;
    }

    setDisconnecting(true);

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
      setSettings(null);
      toast({ title: "Disconnected", description: "Shopify link removed." });
    }

    setDisconnecting(false);
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6 pb-4">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold leading-none tracking-tight">
            Shopify Discount Code Sync
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Automatically create discount codes on your Shopify store when you
          issue them on MyStorefront.
        </p>
      </div>

      <div className="p-6 pt-0">
        {loadingSettings ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : settings?.is_verified ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-3.5 w-3.5" />
                Connected
              </span>
              <span className="text-sm text-muted-foreground font-mono">
                {settings.shop_domain}
              </span>
            </div>

            {syncedCount !== null && (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {syncedCount}
                </span>{" "}
                {syncedCount === 1 ? "code" : "codes"} synced to Shopify
              </p>
            )}

            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {importing ? "Importing…" : "Import from Shopify"}
            </button>

            {!countsLoading && unsyncedCount !== null && unsyncedCount > 0 && (
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
            )}

            {!countsLoading && unsyncedCount === 0 && (
              <p className="text-xs text-muted-foreground">
                All codes are synced ✔
              </p>
            )}

            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-2 rounded-md border border-destructive/50 bg-background px-3 py-1.5 text-sm font-medium text-destructive shadow-sm hover:bg-destructive/10 disabled:opacity-60 transition-colors"
            >
              {disconnecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unplug className="h-3.5 w-3.5" />
              )}
              Disconnect
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
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
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
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
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
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
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying connection…
                </>
              ) : (
                "Verify Connection"
              )}
            </button>

            {settings && !settings.is_verified && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                Previous verification failed. Please check your settings.
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

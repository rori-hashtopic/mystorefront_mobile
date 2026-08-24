import { useState, useEffect } from "react";
import { Tag, CheckCircle, XCircle, Loader2, Unplug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WooCommerceSettings {
  id: string;
  woocommerce_site_url: string;
  woocommerce_webhook_url: string;
  is_verified: boolean;
  last_verified_at: string | null;
}

const WOO_SETTINGS_COLUMNS =
  "id, woocommerce_site_url, woocommerce_webhook_url, is_verified, last_verified_at";

interface WooCommerceDiscountSyncCardProps {
  brandId: string;
}

export function WooCommerceDiscountSyncCard({ brandId }: WooCommerceDiscountSyncCardProps) {
  const { toast } = useToast();

  const [settings, setSettings] = useState<WooCommerceSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Form state
  const [siteUrl, setSiteUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Sync stats
  const [syncedCount, setSyncedCount] = useState<number | null>(null);

  // ── Load existing settings ───────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadingSettings(true);

      const { data, error } = await supabase
        .from("brand_woocommerce_settings")
        .select(WOO_SETTINGS_COLUMNS)
        .eq("brand_id", brandId)
        .maybeSingle();

      if (!error && data) {
        setSettings(data as WooCommerceSettings);
      }

      // Load synced count
      const { count } = await supabase
        .from("discount_codes")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", brandId)
        .eq("woocommerce_synced", true);

      setSyncedCount(count ?? 0);
      setLoadingSettings(false);
    }

    load();
  }, [brandId]);

  // ── Save & Verify ─────────────────────────────────────────────────────
  async function handleSaveAndVerify(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const cleanSiteUrl = siteUrl.trim().replace(/\/$/, "");
    const cleanWebhookUrl = webhookUrl.trim();
    const cleanApiKey = apiKey.trim();

    if (!cleanSiteUrl || !cleanWebhookUrl || !cleanApiKey) {
      toast({
        title: "Missing fields",
        description: "Please fill in all three fields before saving.",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("verify-woocommerce-coupon-connection", {
        body: {
          brand_id: brandId,
          woocommerce_site_url: cleanSiteUrl,
          woocommerce_webhook_url: cleanWebhookUrl,
          woocommerce_api_key: cleanApiKey,
        },
      });

      if (error || !data?.verified) {
        toast({
          title: "Connection failed",
          description:
            data?.error ??
            error?.message ??
            "Could not reach your WooCommerce store. Double-check the URL and API key.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Reload settings from DB
      const { data: fresh } = await supabase
        .from("brand_woocommerce_settings")
        .select(WOO_SETTINGS_COLUMNS)
        .eq("brand_id", brandId)
        .single();

      setSettings(fresh as WooCommerceSettings);
      setSiteUrl("");
      setWebhookUrl("");
      setApiKey("");

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
      setSaving(false);
    }
  }

  // ── Disconnect ────────────────────────────────────────────────────────
  async function handleDisconnect() {
    if (!window.confirm("Disconnect your WooCommerce store? Future discount codes won't be synced automatically.")) {
      return;
    }

    setDisconnecting(true);

    const { error } = await supabase.from("brand_woocommerce_settings").delete().eq("brand_id", brandId);

    if (error) {
      toast({
        title: "Disconnect failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSettings(null);
      toast({ title: "Disconnected", description: "WooCommerce link removed." });
    }

    setDisconnecting(false);
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      {/* Header */}
      <div className="flex flex-col space-y-1.5 p-6 pb-4">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold leading-none tracking-tight">Discount Code Sync</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Automatically create discount codes on your WooCommerce store when you issue them on MyStorefront.
        </p>
      </div>

      <div className="p-6 pt-0">
        {loadingSettings ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : settings?.is_verified ? (
          // ── Connected state ──────────────────────────────────────────
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-3.5 w-3.5" />
                Connected
              </span>
              <span className="text-sm text-muted-foreground font-mono">{settings.woocommerce_site_url}</span>
            </div>

            {syncedCount !== null && (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{syncedCount}</span>{" "}
                {syncedCount === 1 ? "code" : "codes"} synced to WooCommerce
              </p>
            )}

            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-2 rounded-md border border-destructive/50 bg-background px-3 py-1.5 text-sm font-medium text-destructive shadow-sm hover:bg-destructive/10 disabled:opacity-60 transition-colors"
            >
              {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
              Disconnect
            </button>
          </div>
        ) : (
          // ── Setup form ───────────────────────────────────────────────
          <form onSubmit={handleSaveAndVerify} className="space-y-4">
            {/* WooCommerce Site URL */}
            <div className="space-y-1.5">
              <label htmlFor="woo-site-url" className="text-sm font-medium leading-none">
                WooCommerce Site URL
              </label>
              <input
                id="woo-site-url"
                type="url"
                placeholder="https://mybrand.co.za"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              />
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label htmlFor="woo-api-key" className="text-sm font-medium leading-none">
                API Key from your WooCommerce plugin
              </label>
              <input
                id="woo-api-key"
                type="text"
                placeholder="e.g. 3f2a1b4c…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Copy the "MyStorefront API Key" from the same settings page.
              </p>
            </div>

            {/* Incoming Webhook URL (brand pastes from WP plugin) */}
            <div className="space-y-1.5">
              <label htmlFor="woo-webhook-url" className="text-sm font-medium leading-none">
                Your plugin's Incoming Webhook URL
              </label>
              <input
                id="woo-webhook-url"
                type="url"
                placeholder="https://mybrand.co.za/wp-json/hashtopic/v1/create-coupon"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Copy this from <strong>WooCommerce → Settings → Advanced → HashTopic Postback</strong> → "Incoming
                Webhook URL".
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
                "Save & Verify Connection"
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

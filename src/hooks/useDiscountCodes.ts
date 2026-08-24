import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DiscountCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  minimum_order_value: number | null;
  expiry_date: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  notes: string | null;
  creator_id: string | null;
  shopify_price_rule_id: string | null;
  wc_coupon_id: string | null;
  needs_sync?: boolean | null;
  last_synced_at?: string | null;
  // Set when a push to the store failed. needs_sync is deliberately cleared on
  // failure (the DB trigger fires on needs_sync=true, so leaving it set would
  // retry forever), which means these are the only signal that a sync broke.
  shopify_sync_error?: string | null;
  woocommerce_sync_error?: string | null;
}

export interface DiscountCodeCreator {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  username: string | null;
}

// Poll the connected store(s) every 30 seconds for live sync
const LIVE_SYNC_INTERVAL_MS = 30_000;

// Extract a display host (e.g. "shop.example.com") from a WooCommerce webhook URL.
const hostFromUrl = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

/**
 * Owns discount codes for a brand plus the live two-way sync with connected
 * stores. Extracted from the Discount Codes page so the Paid Collabs page can
 * render the same codes with the same sync behaviour — one implementation,
 * so the two views can't drift apart.
 */
export function useDiscountCodes(brandId: string | undefined) {
  const { toast } = useToast();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [creators, setCreators] = useState<Record<string, DiscountCodeCreator>>({});
  const [loading, setLoading] = useState(true);
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopDomain, setShopDomain] = useState<string | null>(null);
  const [wooConnected, setWooConnected] = useState(false);
  const [wooStoreLabel, setWooStoreLabel] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const isSyncingRef = useRef(false);

  const fetchCodes = useCallback(async () => {
    if (!brandId) return;
    const { data } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });
    const typed = (data || []) as unknown as DiscountCode[];
    setCodes(typed);

    const creatorIds = [...new Set(typed.filter((c) => c.creator_id).map((c) => c.creator_id!))];
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, username")
        .in("id", creatorIds);
      const map: Record<string, DiscountCodeCreator> = {};
      (profiles || []).forEach((p: any) => (map[p.id] = p));
      setCreators(map);
    }
    setLoading(false);
  }, [brandId]);

  // Pull connected store settings (Shopify and/or WooCommerce)
  useEffect(() => {
    if (!brandId) return;
    (async () => {
      const [shopRes, wooRes] = await Promise.all([
        supabase
          .from("brand_shopify_settings")
          .select("shop_domain, is_verified")
          .eq("brand_id", brandId)
          .maybeSingle(),
        supabase
          .from("brand_woocommerce_settings")
          .select("woocommerce_webhook_url, is_verified")
          .eq("brand_id", brandId)
          .maybeSingle(),
      ]);

      if (shopRes.data?.is_verified) {
        setShopifyConnected(true);
        setShopDomain(shopRes.data.shop_domain);
      } else {
        setShopifyConnected(false);
      }

      if (wooRes.data?.is_verified) {
        setWooConnected(true);
        setWooStoreLabel(hostFromUrl(wooRes.data.woocommerce_webhook_url) || "your WooCommerce store");
      } else {
        setWooConnected(false);
      }
    })();
  }, [brandId]);

  // Pull codes from whichever store(s) the brand has connected. Shopify and
  // WooCommerce each have their own import function with the same response
  // shape ({ success, upserted, deleted }); we run whichever are connected.
  const runSync = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!brandId || isSyncingRef.current) return;
      if (!shopifyConnected && !wooConnected) return;
      isSyncingRef.current = true;
      setSyncing(true);
      try {
        const summaries: string[] = [];

        const importFrom = async (fn: string, label: string) => {
          const { data, error } = await supabase.functions.invoke(fn, {
            body: { brand_id: brandId },
          });
          if (error || !data?.success) {
            if (!opts?.silent) {
              toast({
                title: `${label} sync failed`,
                description: data?.error ?? error?.message ?? "Please try again.",
                variant: "destructive",
              });
            }
            return;
          }
          const parts: string[] = [];
          if (data.upserted > 0) parts.push(`${data.upserted} synced`);
          if (data.deleted > 0) parts.push(`${data.deleted} removed`);
          summaries.push(`${label}: ${parts.length > 0 ? parts.join(", ") : "up to date"}`);
        };

        if (shopifyConnected) await importFrom("import-shopify-coupons", "Shopify");
        if (wooConnected) await importFrom("import-woocommerce-coupons", "WooCommerce");

        setLastSyncedAt(new Date());
        await fetchCodes();

        if (!opts?.silent && summaries.length > 0) {
          toast({ title: "Synced with your store", description: summaries.join(" · ") });
        }
      } finally {
        setSyncing(false);
        isSyncingRef.current = false;
      }
    },
    [brandId, shopifyConnected, wooConnected, fetchCodes, toast],
  );

  // Initial load
  useEffect(() => {
    if (brandId) fetchCodes();
  }, [brandId, fetchCodes]);

  // Live sync: first pull on connect + polling interval + refetch on tab focus
  useEffect(() => {
    if (!brandId || (!shopifyConnected && !wooConnected)) return;

    runSync({ silent: true });

    const interval = setInterval(() => {
      runSync({ silent: true });
    }, LIVE_SYNC_INTERVAL_MS);

    const onFocus = () => runSync({ silent: true });
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [brandId, shopifyConnected, wooConnected, runSync]);

  // Realtime subscription so any DB-level change to discount_codes appears instantly
  useEffect(() => {
    if (!brandId) return;
    const channel = supabase
      .channel(`discount_codes:${brandId}:${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "discount_codes",
          filter: `brand_id=eq.${brandId}`,
        },
        () => {
          fetchCodes();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [brandId, fetchCodes]);

  // Activate / deactivate. Optimistic update; the actual store sync runs via
  // the DB trigger → push-discount-code edge function (Shopify + WooCommerce).
  // needs_sync=true also blocks the auto-import from overwriting this row until
  // the sync flushes.
  const toggleActive = useCallback(
    async (code: DiscountCode) => {
      const newActive = !code.is_active;
      setCodes((prev) => prev.map((c) => (c.id === code.id ? { ...c, is_active: newActive, needs_sync: true } : c)));
      const { error } = await supabase
        .from("discount_codes")
        .update({ is_active: newActive, needs_sync: true })
        .eq("id", code.id);
      if (error) {
        setCodes((prev) =>
          prev.map((c) =>
            c.id === code.id ? { ...c, is_active: code.is_active, needs_sync: code.needs_sync ?? false } : c,
          ),
        );
        toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: code.is_active ? "Code deactivated" : "Code activated" });
      fetchCodes();
    },
    [fetchCodes, toast],
  );

  const deleteCode = useCallback(
    async (codeId: string) => {
      const { error } = await supabase.from("discount_codes").delete().eq("id", codeId);
      if (error) {
        toast({ title: "Failed to delete code", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Code deleted" });
      }
      fetchCodes();
    },
    [fetchCodes, toast],
  );

  const storeConnected = shopifyConnected || wooConnected;
  const storeLabel = [shopifyConnected ? shopDomain : null, wooConnected ? wooStoreLabel : null]
    .filter(Boolean)
    .join(" · ");

  return {
    codes,
    creators,
    loading,
    syncing,
    lastSyncedAt,
    storeConnected,
    storeLabel,
    runSync,
    fetchCodes,
    toggleActive,
    deleteCode,
  };
}

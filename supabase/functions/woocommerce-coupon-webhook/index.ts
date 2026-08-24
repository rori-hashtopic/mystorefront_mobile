import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Public endpoint (deploy with Verify JWT = OFF). The WordPress plugin POSTs
// here the instant a coupon is created/updated/trashed, so the brand dashboard
// reflects the change immediately instead of waiting for the next import.
//
// Auth: the plugin sends the same API key the merchant generated
// (X-Mystorefront-Key). We match it to a verified WooCommerce brand and
// upsert/delete that brand's discount row by the stable wc_coupon_id.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-mystorefront-key, x-hashtopic-key",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normNum = (x: unknown): number | null => (x === null || x === undefined || x === "" ? null : Number(x));

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── Auth: resolve the brand from the API key ───────────────────────────
    const key = req.headers.get("x-mystorefront-key") || req.headers.get("x-hashtopic-key") || "";
    if (!key) return json({ success: false, error: "Missing API key" });

    const { data: settings } = await supabase
      .from("brand_woocommerce_settings")
      .select("brand_id, is_verified")
      .eq("woocommerce_api_key", key)
      .limit(1)
      .maybeSingle();

    if (!settings || !settings.is_verified) return json({ success: false, error: "Unknown or unverified brand" });

    const brand_id = settings.brand_id;

    // ── Parse payload ──────────────────────────────────────────────────────
    const payload = await req.json();
    const event = payload?.event === "delete" ? "delete" : "upsert";
    const coupon = payload?.coupon ?? {};
    const wcId = coupon.wc_coupon_id !== null && coupon.wc_coupon_id !== undefined ? String(coupon.wc_coupon_id) : null;

    if (!wcId) return json({ success: false, error: "Missing wc_coupon_id" });

    // ── DELETE (coupon trashed/deleted in WooCommerce) ─────────────────────
    if (event === "delete") {
      const { error } = await supabase
        .from("discount_codes")
        .delete()
        .eq("brand_id", brand_id)
        .eq("wc_coupon_id", wcId);
      if (error) return json({ success: false, error: error.message });
      console.log(`woocommerce-coupon-webhook: deleted wc_coupon_id=${wcId} brand=${brand_id}`);
      return json({ success: true, action: "deleted", wc_coupon_id: wcId });
    }

    // ── UPSERT ─────────────────────────────────────────────────────────────
    const code = String(coupon.code ?? "").toUpperCase();
    if (!code) return json({ success: false, error: "Missing code" });

    const expiry = (coupon.expiry_date as string) ?? null;
    const desired: Record<string, unknown> = {
      code,
      discount_type: (coupon.discount_type as string) ?? "percentage",
      discount_value: Number(coupon.discount_value ?? 0),
      minimum_order_value: normNum(coupon.minimum_order_value),
      expiry_date: expiry,
      usage_limit: normNum(coupon.usage_limit),
      // Mirror the Shopify import: no/future expiry = active, past expiry = off.
      is_active: !expiry || new Date(expiry) > new Date(),
      woocommerce_synced: true,
      woocommerce_synced_at: new Date().toISOString(),
    };

    // 1) Match by stable wc id → update in place (handles renames + field edits).
    const { data: byId } = await supabase
      .from("discount_codes")
      .select("id")
      .eq("brand_id", brand_id)
      .eq("wc_coupon_id", wcId)
      .limit(1)
      .maybeSingle();

    if (byId) {
      const { error } = await supabase.from("discount_codes").update(desired).eq("id", byId.id);
      if (error) return json({ success: false, error: error.message });
      console.log(`woocommerce-coupon-webhook: updated wc_coupon_id=${wcId} brand=${brand_id}`);
      return json({ success: true, action: "updated", wc_coupon_id: wcId });
    }

    // 2) Match by code (older row missing its id) → backfill the id + update.
    const { data: byCode } = await supabase
      .from("discount_codes")
      .select("id")
      .eq("brand_id", brand_id)
      .ilike("code", code)
      .limit(1)
      .maybeSingle();

    if (byCode) {
      const { error } = await supabase
        .from("discount_codes")
        .update({ ...desired, wc_coupon_id: wcId })
        .eq("id", byCode.id);
      if (error) return json({ success: false, error: error.message });
      console.log(`woocommerce-coupon-webhook: backfilled wc_coupon_id=${wcId} brand=${brand_id}`);
      return json({ success: true, action: "backfilled", wc_coupon_id: wcId });
    }

    // 3) Genuinely new → insert.
    const { error } = await supabase.from("discount_codes").insert({
      brand_id,
      ...desired,
      wc_coupon_id: wcId,
      notes: coupon.description
        ? `Imported from WooCommerce. ${coupon.description}`.trim()
        : "Imported from WooCommerce.",
      usage_count: 0,
      // A coupon arriving FROM the merchant's WooCommerce store must not push
      // itself straight back out. needs_sync is NOT NULL DEFAULT TRUE and the
      // push trigger fires on WHEN (NEW.needs_sync = true), so without this the
      // webhook insert immediately rewrites the merchant's own coupon. Matches
      // the guard already present in import-woocommerce-coupons.
      needs_sync: false,
    });
    if (error) return json({ success: false, error: error.message });
    console.log(`woocommerce-coupon-webhook: inserted wc_coupon_id=${wcId} brand=${brand_id}`);
    return json({ success: true, action: "inserted", wc_coupon_id: wcId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("woocommerce-coupon-webhook: unhandled error", msg);
    return json({ success: false, error: msg });
  }
});

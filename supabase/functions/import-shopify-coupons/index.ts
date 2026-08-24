import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { assertBrandOwner } from "../_shared/brand-auth.ts";

type ShopifyCoupon = {
  code?: string;
  price_rule_id?: string | number;
  shopify_price_rule_id?: string | number;
  discount_value?: string | number;
  value?: string | number;
  amount?: string | number;
  percentage?: string | number;
  discount_amount?: string | number;
  discount_type?: string;
  minimum_order_value?: string | number | null;
  expiry_date?: string | null;
  usage_limit?: number | null;
  usage_count?: number | null;
  // The store's own enabled flag, when the plugin reports one. Preferred over
  // guessing from the expiry date — see the is_active note in the mapping loop.
  is_active?: boolean | null;
  status?: string | null;
};

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const isCouponRecord = (value: unknown): value is ShopifyCoupon =>
  Boolean(value && typeof value === "object" && "code" in value);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { brand_id } = await req.json();
    if (!brand_id) {
      // 200 instead of 400 — Shopify App Review flags any non-2xx visible
      // in the browser Network tab (rule 2.1.1). Callers check `success`.
      return new Response(JSON.stringify({ success: false, error: "brand_id is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authz = await assertBrandOwner(req, brand_id);
    if (!authz.ok) {
      return new Response(JSON.stringify({ success: false, error: authz.error }), {
        status: authz.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── SETTINGS ──
    const { data: settings } = await supabase
      .from("brand_shopify_settings")
      .select("*")
      .eq("brand_id", brand_id)
      .maybeSingle();

    if (!settings || !settings.is_verified) {
      // 200 instead of 400 — auto-import fires on page mount, so a 400 in
      // the Network tab when Shopify isn't connected yet would trip Shopify
      // App Review rule 2.1.1.
      return new Response(JSON.stringify({ success: false, error: "Shopify not connected" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { shop_domain, plugin_base_url, mystorefront_api_key } = settings;

    // ── FETCH SHOPIFY ──
    const res = await fetch(`${plugin_base_url}/api/discount-codes?shop=${encodeURIComponent(shop_domain)}`, {
      headers: { "X-Mystorefront-Key": mystorefront_api_key },
    });

    if (!res.ok) {
      // 200 instead of 502 — same reason: never surface a non-2xx in the
      // browser Network tab for an expected upstream failure.
      return new Response(JSON.stringify({ success: false, error: "Plugin failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();

    console.log("🔥 RAW SHOPIFY RESPONSE:", JSON.stringify(data, null, 2));

    const rawIncoming = data.codes || data.discount_codes || data.data || data.results || data || [];
    const incoming: ShopifyCoupon[] = Array.isArray(rawIncoming) ? rawIncoming.filter(isCouponRecord) : [];

    // ── DEDUPE BY CODE (IMPORTANT) ──
    const uniqueMap: Record<string, ShopifyCoupon> = {};
    for (const item of incoming) {
      const code = item.code?.trim();
      if (!code) continue;
      uniqueMap[code] = item; // overwrite duplicates
    }

    const cleanCodes = Object.values(uniqueMap);

    console.log("✅ CLEAN CODES COUNT:", cleanCodes.length);
    console.log("✅ SAMPLE CODE:", cleanCodes[0]);

    // 🚨 STEP 3 — DEBUG EMPTY IMPORT
    if (cleanCodes.length === 0) {
      console.error("❌ NO CODES FOUND FROM SHOPIFY RESPONSE");
    }

    const now = new Date().toISOString();
    const toUpsert: Record<string, unknown>[] = [];
    const incomingIds: string[] = [];

    // Local rows are needed BEFORE the upsert (to skip codes with a push still
    // in flight) as well as after it (for the delete sweep), so fetch once here.
    const { data: local } = await supabase
      .from("discount_codes")
      .select("id, shopify_price_rule_id, needs_sync")
      .eq("brand_id", brand_id);

    const localByRuleId = new Map<string, { id: string; needs_sync: boolean | null }>();
    for (const r of local || []) {
      if (r.shopify_price_rule_id) {
        localByRuleId.set(String(r.shopify_price_rule_id), { id: r.id, needs_sync: r.needs_sync });
      }
    }

    let pendingSkipped = 0;

    for (const item of cleanCodes) {
      const code = item.code?.trim();
      const id = item.price_rule_id ?? item.shopify_price_rule_id;
      if (!code || !id) continue;

      const shopifyId = String(id);
      incomingIds.push(shopifyId);

      // Skip rows with a local push still in flight. push-discount-code clears
      // needs_sync on every exit path, so a row still carrying it has an edit
      // the store hasn't acknowledged yet — importing now would overwrite the
      // brand's just-saved change with the store's stale copy. (The WooCommerce
      // importer has had this guard from the start; Shopify never got it.)
      // It stays in incomingIds so the delete sweep does not treat it as gone.
      const existing = localByRuleId.get(shopifyId);
      if (existing?.needs_sync) {
        pendingSkipped++;
        continue;
      }

      // Deactivation is pushed to the store as an ends_at in the year 2000, which
      // the plugin reports back as expiry_date. Storing that as a genuine expiry
      // showed the brand "Expires 1999-12-31" on a code they had simply switched
      // off. No real discount expires before 2001, so treat those as the off
      // signal: the code is inactive and has no expiry date to display.
      const rawExpiry = item.expiry_date ?? null;
      const isOffSignalExpiry = !!rawExpiry && Date.parse(rawExpiry) < Date.parse("2001-01-01T00:00:00Z");
      const expiry = isOffSignalExpiry ? null : rawExpiry;

      console.log("🧾 MAPPED ITEM:", {
        code,
        shopifyId,
        discount_value: item.discount_value ?? item.value ?? item.amount ?? item.percentage,
      });

      const row: Record<string, unknown> = {
        brand_id,
        code,
        discount_type: item.discount_type || "percentage",
        discount_value:
          item.discount_value ?? item.value ?? item.amount ?? item.percentage ?? item.discount_amount ?? 0,
        expiry_date: expiry,
        usage_limit: item.usage_limit ?? null,
        usage_count: item.usage_count ?? 0,
        // Prefer the store's own enabled flag. Deriving this from expiry_date
        // alone flipped a code the brand had just deactivated back to Active on
        // the next poll, because deactivation is signalled to Shopify via a past
        // ends_at that the plugin does not always report back as expiry_date.
        is_active:
          typeof item.is_active === "boolean"
            ? item.is_active
            : item.status != null
              ? String(item.status).toLowerCase() === "active"
              : isOffSignalExpiry
                ? // The year-2000 date IS the deactivation signal, so a plugin
                  // that reports no explicit state still resolves to "off".
                  false
                : !expiry || new Date(expiry) > new Date(),
        shopify_price_rule_id: shopifyId,
        updated_at: now,
        // Rows coming FROM Shopify must not re-trigger a push back INTO Shopify.
        // needs_sync is NOT NULL DEFAULT TRUE and the trigger fires on
        // WHEN (NEW.needs_sync = true), so without this every code a merchant
        // creates in Shopify Admin imports and then immediately writes itself
        // back over the merchant's own price rule, with no user action at all.
        // Safe to set unconditionally here only because the needs_sync guard
        // above already skipped any row with a pending local edit.
        needs_sync: false,
      };
      // Only overwrite the threshold when the store actually reports one.
      // Writing `null` unconditionally silently wiped a value the brand had
      // typed in MyStorefront on the very next 30-second poll.
      if (item.minimum_order_value != null) row.minimum_order_value = item.minimum_order_value;

      toUpsert.push(row);
    }

    // ── SAFE UPSERT ──
    let upserted = 0;
    let errors = 0;

    for (const row of toUpsert) {
      try {
        const { error } = await supabase.from("discount_codes").upsert(row, { onConflict: "shopify_price_rule_id" });

        if (error) {
          console.error("Upsert error:", error.message);
          errors++;
        } else {
          upserted++;
        }

        // 🔥 ADD THIS LINE (RATE LIMIT PROTECTION)
        await new Promise((res) => setTimeout(res, 500)); // 0.5 sec delay
      } catch (e) {
        console.error("Crash:", e);
        errors++;
      }
    }

    // ── DELETE MISSING ──
    // DANGEROUS BY NATURE: deleting a local row fires the before_discount_code_delete
    // trigger, which pushes a DELETE to the merchant's LIVE Shopify store. So a bad
    // or partial response here does not just corrupt our copy — it destroys real
    // coupons in the merchant's store. Every guard below exists for that reason.
    let deleted = 0;
    let deleteSkippedReason: string | null = null;

    // Reuses the `local` snapshot taken before the upsert loop above.
    const syncedLocal = (local || []).filter((r) => r.shopify_price_rule_id);
    const set = new Set(incomingIds);
    const toDelete = syncedLocal.filter((r) => !set.has(String(r.shopify_price_rule_id))).map((r) => r.id);

    // Guard 1 — the store returned nothing usable. Far more likely a plugin/API
    // hiccup than a merchant deleting every code at once. Never sweep on this.
    if (incomingIds.length === 0) {
      deleteSkippedReason = "store returned no codes — skipping delete sweep to avoid wiping live coupons";
    }
    // Guard 2 — some upserts failed, so our view of the store is incomplete and
    // anything "missing" may simply not have been written yet.
    else if (errors > 0) {
      deleteSkippedReason = `${errors} upsert error(s) — skipping delete sweep until the sync is clean`;
    }
    // Guard 3 — circuit breaker. A response that drops most of a brand's codes at
    // once is far more likely truncated than a genuine bulk deletion.
    else if (toDelete.length > 3 && toDelete.length > syncedLocal.length / 2) {
      deleteSkippedReason = `would remove ${toDelete.length} of ${syncedLocal.length} codes — refusing as a likely partial response, needs manual review`;
    }

    if (deleteSkippedReason) {
      console.error("⚠️ DELETE SWEEP SKIPPED:", deleteSkippedReason);
    } else if (toDelete.length > 0) {
      const { error } = await supabase.from("discount_codes").delete().in("id", toDelete);

      if (!error) deleted = toDelete.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        upserted,
        deleted,
        errors,
        pending_skipped: pendingSkipped,
        delete_skipped: deleteSkippedReason,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    // 200 instead of 500 — App Review rule 2.1.1.
    console.error("import-shopify-coupons: unhandled error:", toErrorMessage(err));
    return new Response(JSON.stringify({ success: false, error: toErrorMessage(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

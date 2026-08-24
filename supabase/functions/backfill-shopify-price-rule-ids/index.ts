import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { assertBrandOwner } from "../_shared/brand-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { brand_id } = await req.json();
    if (!brand_id) return json({ error: "brand_id is required" }, 400);

    const authz = await assertBrandOwner(req, brand_id);
    if (!authz.ok) return json({ error: authz.error }, authz.status);


    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Load Shopify settings
    const { data: settings, error: settingsErr } = await supabase
      .from("brand_shopify_settings")
      .select("*")
      .eq("brand_id", brand_id)
      .maybeSingle();

    if (settingsErr || !settings) {
      return json({ error: "Shopify settings not found for this brand" }, 404);
    }
    if (!settings.is_verified) {
      return json({ error: "Shopify connection is not verified" }, 400);
    }

    const { shop_domain, plugin_base_url, mystorefront_api_key } = settings;

    // 2. Fetch codes missing a Shopify ID
    const { data: codes, error: codesErr } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("brand_id", brand_id)
      .is("shopify_price_rule_id", null);

    if (codesErr) {
      return json({ error: codesErr.message }, 500);
    }

    const matched = codes?.length ?? 0;
    let updated = 0;
    let skipped = 0;

    console.log("[backfill] start", { brand_id, shop_domain, matched });

    for (const row of codes ?? []) {
      try {
        // Build payload, omitting null/undefined fields
        const payload: Record<string, unknown> = {
          code: row.code,
          discount_type: row.discount_type,
          discount_value: Number(row.discount_value),
        };
        if (row.minimum_order_value != null) {
          payload.minimum_order_value = Number(row.minimum_order_value);
        }
        if (row.expiry_date != null) {
          payload.expiry_date = row.expiry_date;
        }
        if (row.usage_limit != null) {
          payload.usage_limit = Number(row.usage_limit);
        }

        // 10s timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        const url = `${plugin_base_url}/api/discount-codes?shop=${encodeURIComponent(shop_domain)}`;

        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Mystorefront-Key": mystorefront_api_key,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const status = resp.status;

        if (status === 201 || status === 409) {
          const body = await resp.json().catch(() => ({}));
          const price_rule_id = body?.price_rule_id;

          if (price_rule_id) {
            const { error: updateErr } = await supabase
              .from("discount_codes")
              .update({ shopify_price_rule_id: String(price_rule_id) })
              .eq("id", row.id);

            console.log("[backfill] row", {
              brand_id,
              shop_domain,
              code: row.code,
              status,
              price_rule_id,
              updateErr,
            });

            if (!updateErr) {
              updated++;
            } else {
              skipped++;
            }
          } else {
            console.log("[backfill] row", {
              brand_id,
              shop_domain,
              code: row.code,
              status,
              price_rule_id: null,
              updateErr: null,
            });
            skipped++;
          }
        } else {
          console.log("[backfill] row", {
            brand_id,
            shop_domain,
            code: row.code,
            status,
            price_rule_id: null,
            updateErr: null,
          });
          skipped++;
        }
      } catch (err) {
        console.log("[backfill] row error", {
          brand_id,
          shop_domain,
          code: row.code,
          error: err instanceof Error ? err.message : String(err),
        });
        skipped++;
      }

      // 200ms throttle between requests
      await delay(200);
    }

    console.log("[backfill] done", { brand_id, matched, updated, skipped });

    return json({ success: true, matched, updated, skipped });
  } catch (err) {
    console.error("[backfill] fatal", err);
    return json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});

// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Helper: WooCommerce sync (runs in background) ─────────────────────
async function syncWooCommerce(
  supabase: any,
  record: Record<string, unknown> & { id: string; code?: string },
  wooSettings: Record<string, unknown> | null,
  couponBody: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!wooSettings) return { skipped: "no_woocommerce_settings" };
  if (!wooSettings.woocommerce_webhook_url || !wooSettings.woocommerce_api_key)
    return { skipped: "incomplete_woocommerce_settings" };

  let wooResponse: Response;
  try {
    wooResponse = await fetch(wooSettings.woocommerce_webhook_url as string, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hashtopic-Key": wooSettings.woocommerce_api_key as string,
      },
      body: JSON.stringify(couponBody),
    });
  } catch (fetchError) {
    const errMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
    console.error(`push-discount-code: WooCommerce fetch failed: ${errMsg}`);
    await supabase
      .from("discount_codes")
      .update({
        woocommerce_sync_error: `fetch error: ${errMsg}`,
        // MUST clear needs_sync even on failure. Postgres re-evaluates the
        // trigger's WHEN (NEW.needs_sync = true) on EVERY update regardless of
        // which column changed, so writing the error while needs_sync is still
        // true re-fires the push → fails → writes again → forever. For a
        // Woo-only brand nothing else clears it (the Shopify branch is skipped).
        needs_sync: false,
      })
      .eq("id", record.id);
    return { ok: false, error: errMsg };
  }

  const wooStatus = wooResponse.status;
  let wooBody: Record<string, unknown> = {};
  try {
    wooBody = await wooResponse.json();
  } catch {
    /* non-JSON */
  }

  if (wooStatus === 201 || wooStatus === 409) {
    const updatePayload: Record<string, unknown> = {
      woocommerce_synced: true,
      woocommerce_synced_at: new Date().toISOString(),
      woocommerce_sync_error: null,
      // Clear needs_sync here too. For WooCommerce-only brands the Shopify path
      // (which normally clears it) is skipped, so without this needs_sync gets
      // stuck "true" and re-triggers pushes on every change.
      needs_sync: false,
    };
    // Store the WooCommerce coupon id the plugin returns so this code can later
    // be matched by its stable id (rename + delete detection on import), the
    // same way Shopify codes carry shopify_price_rule_id.
    if (wooBody && wooBody.wc_coupon_id !== undefined && wooBody.wc_coupon_id !== null) {
      updatePayload.wc_coupon_id = String(wooBody.wc_coupon_id);
    }
    await supabase.from("discount_codes").update(updatePayload).eq("id", record.id);
    console.log(`push-discount-code: WooCommerce synced code=${record.code} (HTTP ${wooStatus})`);
    return { ok: true, woo_status: wooStatus, wc_coupon_id: wooBody?.wc_coupon_id ?? null };
  }

  const errMsg = `WooCommerce returned HTTP ${wooStatus}: ${JSON.stringify(wooBody)}`;
  console.error(`push-discount-code: ${errMsg}`);
  // See the note on the fetch-failure path above: leaving needs_sync=true here
  // re-fires the trigger on this very update and loops indefinitely.
  await supabase
    .from("discount_codes")
    .update({ woocommerce_sync_error: errMsg, needs_sync: false })
    .eq("id", record.id);
  return { ok: false, woo_status: wooStatus, woo_body: wooBody };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey) as any;

    // Only allow internal callers. Accept EITHER:
    //  - Authorization: Bearer <service role key>  (other edge functions)
    //  - X-Internal-Secret: <vault secret>         (DB triggers)
    // Without this, any authenticated user could craft a payload and trigger
    // arbitrary discount-code operations against any brand's connected store.
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const internalSecretHeader = req.headers.get("X-Internal-Secret") || req.headers.get("x-internal-secret") || "";

    let authorized = bearerToken === serviceRoleKey;
    if (!authorized && internalSecretHeader) {
      // Verify via an RPC, NOT by reading vault.decrypted_secrets directly:
      // PostgREST only exposes public/graphql_public/storage, so a `vault` read
      // over the API always returns empty and every trigger call 401s.
      // The RPC compares inside the database and returns only a boolean.
      const { data: tokenOk, error: verifyErr } = await supabase.rpc("verify_push_discount_token", {
        p_token: internalSecretHeader,
      });
      if (verifyErr) {
        console.error("push-discount-code: token verification failed:", verifyErr.message);
      }
      if (tokenOk === true) {
        authorized = true;
      }
    }
    if (!authorized) {
      console.error("push-discount-code: unauthorized call — internal secret did not match");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();

    // ── DELETE event ────────────────────────────────────────────────────
    if (payload?.event === "DELETE") {
      const oldRecord = payload.old_record;
      if (!oldRecord) {
        return new Response(JSON.stringify({ error: "No old_record in DELETE payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result: Record<string, unknown> = { shopify: null, woo: null };

      try {
        const { data: shopifySettings } = await supabase
          .from("brand_shopify_settings")
          .select("shop_domain, plugin_base_url, mystorefront_api_key, is_verified")
          .eq("brand_id", oldRecord.brand_id)
          .single();

        if (!shopifySettings?.is_verified) {
          result.shopify = { skipped: "no_shopify_settings_or_not_verified" };
        } else if (!oldRecord.shopify_price_rule_id && !oldRecord.code) {
          result.shopify = { skipped: "no_price_rule_id_or_code" };
        } else if (!oldRecord.shopify_price_rule_id && oldRecord.wc_coupon_id) {
          // This code was only ever synced to WooCommerce. Without this guard the
          // delete fans out to BOTH platforms gated only on is_verified, so for a
          // brand connected to both stores — using the same code string on each,
          // which is the normal case — deleting a WooCommerce coupon would also
          // delete the unrelated Shopify discount of the same name.
          result.shopify = { skipped: "woocommerce_only_code" };
        } else {
          // Proxy's POST route accepts `action: "delete"` and, given a
          // price_rule_id, deletes the Shopify price rule directly. This is
          // idempotent — 404/missing rules are treated as already-deleted.
          const delUrl = `${shopifySettings.plugin_base_url}/api/discount-codes/?shop=${encodeURIComponent(shopifySettings.shop_domain)}`;
          const deleteBody: Record<string, unknown> = {
            code: oldRecord.code,
            action: "delete",
          };
          if (oldRecord.shopify_price_rule_id) {
            deleteBody.price_rule_id = oldRecord.shopify_price_rule_id;
          }
          console.log("push-discount-code: DELETE via POST:", delUrl, JSON.stringify(deleteBody));
          const delResp = await fetch(delUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "X-Mystorefront-Key": shopifySettings.mystorefront_api_key,
            },
            body: JSON.stringify(deleteBody),
          });
          const delText = await delResp.text();
          let delJson: Record<string, unknown> = {};
          try {
            delJson = JSON.parse(delText);
          } catch {
            /* non-JSON */
          }
          console.log(`push-discount-code: DELETE response status=${delResp.status} body=${delText}`);
          result.shopify = {
            ok: delResp.status >= 200 && delResp.status < 300,
            status: delResp.status,
            body: delJson,
          };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`push-discount-code: Shopify DELETE error: ${msg}`);
        result.shopify = { ok: false, error: msg };
      }

      // ── WooCommerce delete ──────────────────────────────────────────────
      // Remove the matching coupon from the store too, so a code deleted in
      // MyStorefront can't keep working for shoppers. Idempotent: a missing
      // coupon still returns ok from the plugin.
      try {
        const { data: wooSettings } = await supabase
          .from("brand_woocommerce_settings")
          .select("woocommerce_webhook_url, woocommerce_api_key, is_verified")
          .eq("brand_id", oldRecord.brand_id)
          .single();

        if (!wooSettings?.is_verified || !wooSettings.woocommerce_webhook_url) {
          result.woo = { skipped: "no_woocommerce_settings_or_not_verified" };
        } else if (!oldRecord.wc_coupon_id && oldRecord.shopify_price_rule_id) {
          // Mirror of the Shopify guard above — a Shopify-only code must not be
          // deleted from the brand's WooCommerce store just because the codes
          // happen to share a name.
          result.woo = { skipped: "shopify_only_code" };
        } else {
          const wooDelResp = await fetch(wooSettings.woocommerce_webhook_url as string, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Mystorefront-Key": wooSettings.woocommerce_api_key as string,
              "X-Hashtopic-Key": wooSettings.woocommerce_api_key as string,
            },
            body: JSON.stringify({
              action: "delete",
              code: oldRecord.code,
              wc_coupon_id: oldRecord.wc_coupon_id ?? null,
            }),
          });
          const wooDelText = await wooDelResp.text();
          let wooDelJson: Record<string, unknown> = {};
          try {
            wooDelJson = JSON.parse(wooDelText);
          } catch {
            /* non-JSON */
          }
          console.log(`push-discount-code: WooCommerce DELETE status=${wooDelResp.status} body=${wooDelText}`);
          result.woo = {
            ok: wooDelResp.status >= 200 && wooDelResp.status < 300,
            status: wooDelResp.status,
            body: wooDelJson,
          };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`push-discount-code: WooCommerce DELETE error: ${msg}`);
        result.woo = { ok: false, error: msg };
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── INSERT / UPDATE event ───────────────────────────────────────────
    const record = payload?.record;
    if (!record) {
      return new Response(JSON.stringify({ error: "No record in payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!record.needs_sync) {
      return new Response(JSON.stringify({ skipped: "no_changes" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use attempts from the trigger payload — no extra DB read
    const currentAttempts = record.shopify_sync_attempts ?? 0;

    // Build shared coupon body
    const valueType = record.discount_type === "percentage" ? "percentage" : "fixed_amount";
    const pastDate = new Date(Date.now() - 60_000).toISOString();

    // Deactivation is signalled to the store with an ends_at in the year 2000.
    // The plugin reports that back as expiry_date and the importer stores it, so a
    // code that was merely switched off ends up carrying a past "expiry". Turning
    // it back on then sent ends_at: null AND expiry_date: 1999-12-31 in the same
    // payload — telling the store to expire and not to expire at once. It only
    // worked because the plugin happens to read ends_at first.
    // A past expiry on an active code is that leftover signal, never a real date.
    const isActiveRecord = record.is_active !== false;
    const expiryInPast = !!record.expiry_date && new Date(record.expiry_date).getTime() < Date.now();
    const effectiveExpiry = isActiveRecord && expiryInPast ? null : record.expiry_date;

    // WooCommerce body — clean, no redundant fields
    const couponBody: Record<string, unknown> = {
      code: record.code,
      discount_type: record.discount_type,
      discount_value: Number(record.discount_value),
      value_type: valueType,
      value: String(-Math.abs(Number(record.discount_value))),
      status: record.is_active === false ? "disabled" : "active",
      ends_at: record.is_active === false ? pastDate : null,
      // `description` is not a column on discount_codes — the brand's text lives
      // in `notes`, so the old reference always fell through to the fallback.
      description: record.notes ?? `MyStorefront code — ${record.code}`,
    };
    if (effectiveExpiry) couponBody.expiry_date = effectiveExpiry;
    // Minimum order value is captured in the create/edit form, so it has to reach
    // the store — otherwise the brand sets a threshold that never applies at checkout.
    if (record.minimum_order_value != null) couponBody.minimum_order_value = record.minimum_order_value;
    if (record.usage_limit != null && record.usage_limit > 0) couponBody.usage_limit = record.usage_limit;
    // Pass the stable WooCommerce coupon id (the WooCommerce equivalent of
    // Shopify's price_rule_id) so the plugin updates THAT coupon in place when a
    // code is renamed, instead of creating a duplicate under the new code.
    if (record.wc_coupon_id) couponBody.wc_coupon_id = record.wc_coupon_id;

    const result: Record<string, unknown> = { shopify: null, woo: null };

    // ── 1. Fetch BOTH platform settings in parallel ─────────────────────
    const [shopifyResult, wooResult] = await Promise.all([
      supabase
        .from("brand_shopify_settings")
        .select("shop_domain, plugin_base_url, mystorefront_api_key, is_verified")
        .eq("brand_id", record.brand_id)
        .single(),
      supabase
        .from("brand_woocommerce_settings")
        .select("woocommerce_webhook_url, woocommerce_api_key, is_verified")
        .eq("brand_id", record.brand_id)
        .single(),
    ]);

    const shopifySettings = shopifyResult.data;
    const wooSettings = wooResult.data;

    // ── 2. Shopify API call FIRST (priority) ────────────────────────────
    if (!shopifySettings || shopifyResult.error) {
      result.shopify = { skipped: "no_shopify_settings" };
    } else if (!shopifySettings.is_verified) {
      result.shopify = { skipped: "not_verified" };
    } else {
      const { shop_domain, plugin_base_url, mystorefront_api_key } = shopifySettings;

      const isActive = record.is_active !== false;
      const shopifyBody: Record<string, unknown> = {
        code: record.code,
        discount_type: record.discount_type,
        discount_value: Number(record.discount_value),
        value_type: valueType,
        value: String(-Math.abs(Number(record.discount_value))),
        active: isActive,
        is_active: isActive,
        published: isActive,
        // Deactivation ⇒ past ends_at; activation ⇒ null (clear any past marker).
        // If the record has a real future expiry, it's sent in `expiry_date` below.
        ends_at: isActive ? null : "2000-01-01T00:00:00Z",
      };
      // The plugin PATCHes the price rule rather than replacing it — verified
      // against the live store: editing a code's percentage from MyStorefront
      // left its collection scope, per-customer limit and combination rules
      // untouched, none of which are in this payload.
      //
      // That is good (we can't destroy config we don't model) but it has a sharp
      // edge: an OMITTED field keeps its OLD value. So on an update these three
      // must be sent explicitly as null, otherwise clearing a minimum spend, an
      // expiry or a usage cap in MyStorefront silently never reaches the store —
      // the brand sees "no minimum" while checkout still enforces the old one.
      // On create we still omit them, so the plugin applies its own defaults.
      const isShopifyUpdate = !!record.shopify_price_rule_id;

      if (effectiveExpiry) shopifyBody.expiry_date = effectiveExpiry;
      else if (isShopifyUpdate) shopifyBody.expiry_date = null;

      if (record.usage_limit != null && record.usage_limit > 0) shopifyBody.usage_limit = record.usage_limit;
      else if (isShopifyUpdate) shopifyBody.usage_limit = null;

      if (record.minimum_order_value != null) shopifyBody.minimum_order_value = record.minimum_order_value;
      else if (isShopifyUpdate) shopifyBody.minimum_order_value = null;

      let shopifyResponse: Response;
      const priceRuleId = record.shopify_price_rule_id;

      // Always POST to base URL — proxy only supports POST
      const method = "POST";
      const url = `${plugin_base_url}/api/discount-codes/?shop=${encodeURIComponent(shop_domain)}`;

      // Include price_rule_id in body so proxy can identify existing discount
      if (priceRuleId) {
        shopifyBody.price_rule_id = priceRuleId;
        console.log(
          `push-discount-code: Updating existing code with price_rule_id=${priceRuleId} is_active=${isActive}`,
        );
      } else {
        console.log(`push-discount-code: Creating new code is_active=${isActive}`);
      }

      console.log(`push-discount-code: POST payload:`, JSON.stringify(shopifyBody));
      console.log("DEBUG: Target URL is:", url);

      try {
        shopifyResponse = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Mystorefront-Key": mystorefront_api_key,
          },
          body: JSON.stringify(shopifyBody),
        });
      } catch (fetchErr) {
        const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.error(`push-discount-code: Shopify fetch failed: ${errMsg}`);
        supabase
          .from("discount_codes")
          .update({ needs_sync: false, shopify_sync_error: errMsg, shopify_sync_attempts: currentAttempts + 1 })
          .eq("id", record.id)
          .then(() => {});
        result.shopify = { ok: false, error: errMsg };

        result.woo = await syncWooCommerce(supabase, record, wooSettings, couponBody);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const shopifyStatus = shopifyResponse.status;
      const rawText = await shopifyResponse.text();
      console.log(`DEBUG: Shopify response status: ${shopifyStatus}, body: ${rawText}`);

      let shopifyRespBody: Record<string, unknown> = {};
      try {
        shopifyRespBody = JSON.parse(rawText);
      } catch {
        /* non-JSON */
      }

      if (shopifyStatus < 200 || (shopifyStatus >= 300 && shopifyStatus !== 409)) {
        console.error("Shopify Proxy Error:", rawText);
      }

      if ((shopifyStatus >= 200 && shopifyStatus < 300) || shopifyStatus === 409) {
        const returnedPriceRuleId = shopifyRespBody?.price_rule_id;
        const finalPriceRuleId = returnedPriceRuleId
          ? String(returnedPriceRuleId)
          : priceRuleId
            ? String(priceRuleId)
            : null;

        const updatePayload: Record<string, unknown> = {
          needs_sync: false,
          shopify_sync_error: null,
          shopify_sync_attempts: currentAttempts + 1,
          last_synced_at: new Date().toISOString(),
        };
        if (finalPriceRuleId) updatePayload.shopify_price_rule_id = finalPriceRuleId;

        // ── 3. Run DB write-back + WooCommerce in parallel ──────────────
        const [, wooOutcome] = await Promise.allSettled([
          supabase.from("discount_codes").update(updatePayload).eq("id", record.id),
          syncWooCommerce(supabase, record, wooSettings, couponBody),
        ]);

        result.shopify = { ok: true, shopify_status: shopifyStatus, shopify_price_rule_id: finalPriceRuleId };
        result.woo = wooOutcome.status === "fulfilled" ? wooOutcome.value : { ok: false, error: "internal" };
      } else {
        const errMsg = `Shopify returned HTTP ${shopifyStatus}: ${JSON.stringify(shopifyRespBody)}`;
        console.error(`push-discount-code: ${errMsg}`);

        const [, wooOutcome] = await Promise.allSettled([
          supabase
            .from("discount_codes")
            .update({
              needs_sync: false,
              shopify_sync_error: errMsg,
              shopify_sync_attempts: currentAttempts + 1,
            })
            .eq("id", record.id),
          syncWooCommerce(supabase, record, wooSettings, couponBody),
        ]);

        result.shopify = { ok: false, shopify_status: shopifyStatus, shopify_body: shopifyRespBody };
        result.woo = wooOutcome.status === "fulfilled" ? wooOutcome.value : { ok: false, error: "internal" };
      }
    }

    // If Shopify was skipped, still run WooCommerce
    if (result.woo === null) {
      result.woo = await syncWooCommerce(supabase, record, wooSettings, couponBody);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`push-discount-code: unhandled error: ${errMsg}`);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

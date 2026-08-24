import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertBrandOwner, assertSafeExternalUrl } from "../_shared/brand-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyPayload {
  brand_id: string;
  woocommerce_site_url: string;
  woocommerce_webhook_url: string;
  woocommerce_api_key: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = (await req.json()) as VerifyPayload;

    const { brand_id, woocommerce_site_url, woocommerce_webhook_url, woocommerce_api_key } = body;

    if (!brand_id || !woocommerce_site_url || !woocommerce_webhook_url || !woocommerce_api_key) {
      // 200 instead of 400 — Shopify App Review rule 2.1.1.
      return new Response(JSON.stringify({ verified: false, error: "Missing required fields" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AuthN + ownership: only the brand's owner may rewrite its WooCommerce settings.
    const auth = await assertBrandOwner(req, brand_id);
    if (!auth.ok) {
      return new Response(JSON.stringify({ verified: false, error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SSRF guard on caller-supplied webhook URL.
    const urlCheck = assertSafeExternalUrl(woocommerce_webhook_url);
    if (!urlCheck.ok) {
      return new Response(JSON.stringify({ verified: false, error: urlCheck.error }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the ping URL: {webhook_url}/ping
    // The webhook_url is already the full create-coupon URL,
    // so we derive ping from it.
    const pingUrl = woocommerce_webhook_url.replace(/\/$/, "") + "/ping";

    let pingOk = false;
    let pingError: string | null = null;
    let pingStatus = 0;

    try {
      const pingResponse = await fetch(pingUrl, {
        method: "GET",
        headers: {
          "X-Hashtopic-Key": woocommerce_api_key,
        },
      });

      pingStatus = pingResponse.status;
      if (pingResponse.ok) {
        const pingBody = await pingResponse.json();
        pingOk = pingBody?.ok === true;
      }
      // Build user-facing message based on status — never expose raw
      // "HTTP 4xx/5xx" text in the toast (Shopify App Review rule 2.1.1).
      if (!pingOk) {
        switch (pingResponse.status) {
          case 401:
          case 403:
            pingError = "Invalid API key. Copy the latest value from your store and try again.";
            break;
          case 404:
            pingError = "Webhook URL not found. Double-check the URL points to your WooCommerce plugin.";
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            pingError = "Unable to reach your WooCommerce store right now. Please try again in a moment.";
            break;
          default:
            pingError = "Connection failed. Please check the webhook URL and API key.";
        }
      }
    } catch (fetchErr) {
      // Log full detail server-side but show a clean message to users.
      const detail = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error(`verify-woocommerce: fetch failed — ${detail}`);
      pingError = "Connection failed. Please check the webhook URL.";
    }

    if (!pingOk) {
      return new Response(
        JSON.stringify({
          verified: false,
          error: pingError ?? "Ping failed",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Upsert brand_woocommerce_settings
    const { error: upsertError } = await supabase.from("brand_woocommerce_settings").upsert(
      {
        brand_id,
        woocommerce_site_url: woocommerce_site_url.replace(/\/$/, ""),
        woocommerce_webhook_url,
        woocommerce_api_key,
        is_verified: true,
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "brand_id" },
    );

    if (upsertError) {
      // 200 instead of 500 — App Review rule 2.1.1.
      console.error("verify-woocommerce: upsert error", upsertError);
      return new Response(
        JSON.stringify({
          verified: false,
          error: "Failed to save settings. Please try again.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ verified: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // 200 instead of 500 — App Review rule 2.1.1.
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("verify-woocommerce: unhandled error", errMsg);
    return new Response(
      JSON.stringify({
        verified: false,
        error: "Something went wrong while verifying. Please try again.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

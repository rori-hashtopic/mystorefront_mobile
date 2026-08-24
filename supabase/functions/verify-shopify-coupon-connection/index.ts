import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertBrandOwner, assertSafeExternalUrl } from "../_shared/brand-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { brand_id, shop_domain, mystorefront_api_key, plugin_base_url } = await req.json();

    if (!brand_id || !shop_domain || !mystorefront_api_key) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "brand_id, shop_domain, and mystorefront_api_key are required",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // AuthN + ownership: only the brand's owner may rewrite its integration settings.
    const auth = await assertBrandOwner(req, brand_id);
    if (!auth.ok) {
      return new Response(JSON.stringify({ success: false, error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = plugin_base_url || "https://mystorefront-postback.onrender.com";

    // SSRF guard: only allow https URLs that don't point at internal networks.
    const urlCheck = assertSafeExternalUrl(`${baseUrl}/api/settings/ping`);
    if (!urlCheck.ok) {
      return new Response(JSON.stringify({ success: false, error: urlCheck.error }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ping the Shopify plugin
    let pingResponse: Response;
    try {
      pingResponse = await fetch(`${baseUrl}/api/settings/ping?shop=${encodeURIComponent(shop_domain)}`, {
        method: "GET",
        headers: { "X-Mystorefront-Key": mystorefront_api_key },
      });
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error(`verify-shopify: fetch failed: ${msg}`);
      return new Response(JSON.stringify({ success: false, error: `Connection failed: ${msg}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let pingBody: Record<string, unknown> = {};
    try {
      pingBody = await pingResponse.json();
    } catch {
      // non-JSON response
    }

    if (!pingResponse.ok || pingBody?.ok !== true) {
      // Log full detail server-side for debugging, but NEVER include the raw
      // HTTP status code in the user-facing error string — Shopify App Review
      // automatically flags any visible "HTTP 4xx/5xx" text per rule 2.1.1.
      const errDetail = `HTTP ${pingResponse.status}: ${JSON.stringify(pingBody)}`;
      console.error(`verify-shopify: ping failed — ${errDetail}`);

      let userMessage: string;
      switch (pingResponse.status) {
        case 401:
        case 403:
          userMessage =
            "Invalid API key. Copy the latest value from your Shopify app's Settings → Discount Code Sync page and try again.";
          break;
        case 404:
          userMessage = "Shop not found. Double-check the shop domain (it should look like yourshop.myshopify.com).";
          break;
        case 400:
          userMessage = "Missing or invalid input. Please re-check the shop domain and API key.";
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          userMessage = "Unable to reach your Shopify store right now. Please try again in a moment.";
          break;
        default:
          userMessage = "Connection failed. Please check your shop domain and API key.";
      }

      return new Response(JSON.stringify({ success: false, error: userMessage }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ping succeeded — upsert settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error: upsertError } = await supabase.from("brand_shopify_settings").upsert(
      {
        brand_id,
        shop_domain,
        plugin_base_url: baseUrl,
        mystorefront_api_key,
        is_verified: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "brand_id" },
    );

    if (upsertError) {
      console.error(`verify-shopify: upsert error: ${upsertError.message}`);
      return new Response(JSON.stringify({ success: false, error: upsertError.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`verify-shopify: verified for brand_id=${brand_id}, shop=${shop_domain}`);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // Always return HTTP 200 with a friendly error — never expose raw
    // status codes or exception messages in the user-facing toast.
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`verify-shopify: unhandled error: ${msg}`);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Something went wrong while verifying. Please try again.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

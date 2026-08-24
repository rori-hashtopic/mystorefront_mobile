import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader || !/^Bearer\s+\S+/i.test(authHeader)) {
      console.error("Instagram OAuth: missing or malformed Authorization header");
      return new Response(
        JSON.stringify({
          error: "missing_authorization",
          details: "Your session token wasn't sent. Please refresh the page and try again.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate JWT using getClaims() (compatible with Supabase signing-keys system).
    // getUser(jwt) fails with "Auth session missing" when using the new asymmetric keys.
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: claimsData, error: authError } = await supabaseAuth.auth.getClaims(jwt);
    const userId = claimsData?.claims?.sub;

    if (authError || !userId) {
      console.error("Instagram OAuth auth failed:", authError?.message || "No claims returned from getClaims()");
      return new Response(
        JSON.stringify({
          error: "invalid_session",
          details: "Your session has expired. Please refresh the page and try again.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const user = { id: userId };

    // Exact-match whitelist. The onboarding wizard is not its own route — it
    // renders inside Index ("/") and Shop ("/shop"), so "/" must be allowed.
    // NOTE: startsWith() matching cannot be used here — once "/" is in the
    // list, every path would pass and the whitelist would be meaningless.
    const ALLOWED_ORIGINS = ["/", "/shop", "/settings", "/analytics", "/onboarding"];
    // Default to /shop, never /settings — a missing or invalid origin must not
    // drop a creator who is mid-onboarding into their settings page.
    let origin = "/shop";
    try {
      const body = await req.json();
      const requestedOrigin = typeof body?.origin === "string" ? body.origin.split("?")[0].split("#")[0] : "";
      if (ALLOWED_ORIGINS.includes(requestedOrigin)) {
        origin = requestedOrigin;
      }
    } catch {
      // No body or invalid JSON, use default
    }

    const appId = Deno.env.get("INSTAGRAM_APP_ID");
    if (!appId) {
      return new Response(
        JSON.stringify({ error: "not_configured", details: "Instagram integration not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const redirectUri = `${Deno.env.get("SITE_URL") || "https://mystorefront.io"}/auth/instagram/callback`;

    // HMAC-sign state to prevent user_id forgery in the OAuth callback.
    const statePayload = JSON.stringify({ user_id: user.id, origin, timestamp: Date.now() });
    const statePayloadB64 = btoa(statePayload);
    const hmacSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const keyData = new TextEncoder().encode(hmacSecret);
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(statePayloadB64));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
    const state = `${statePayloadB64}.${sigB64}`;
    const scopes = "instagram_business_basic,instagram_business_manage_insights";

    const authUrl = new URL("https://www.instagram.com/oauth/authorize");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);
    authUrl.hash = "weblink";

    console.log("Generated Instagram OAuth URL, user:", user.id, "origin:", origin);

    return new Response(JSON.stringify({ url: authUrl.toString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating OAuth URL:", error);
    return new Response(JSON.stringify({ error: "unexpected_error", details: "Failed to generate OAuth URL" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

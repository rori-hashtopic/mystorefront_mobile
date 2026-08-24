import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify this is called with the service role key
    const authHeader = req.headers.get("Authorization");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Allow either service_role key or anon key (for cron via pg_net)
    const token = authHeader?.replace("Bearer ", "") ?? "";
    if (token !== supabaseServiceKey && token !== supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find connections expiring within the next 7 days
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: connections, error: fetchError } = await supabase
      .from("instagram_connections")
      .select("id, creator_id, access_token_encrypted, token_expires_at, username")
      .eq("status", "connected")
      .lt("token_expires_at", sevenDaysFromNow);

    if (fetchError) {
      console.error("Error fetching connections:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch connections", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!connections || connections.length === 0) {
      console.log("No tokens need refreshing");
      return new Response(
        JSON.stringify({ success: true, refreshed: 0, failed: 0, message: "No tokens need refreshing" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${connections.length} token(s) to refresh`);

    let refreshed = 0;
    let failed = 0;

    for (const conn of connections) {
      try {
        const existingToken = conn.access_token_encrypted;
        if (!existingToken) {
          console.warn(`No token for connection ${conn.id}, skipping`);
          continue;
        }

        const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${existingToken}`;
        const response = await fetch(refreshUrl);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Token refresh failed for ${conn.username} (${conn.id}):`, errorText);

          await supabase
            .from("instagram_connections")
            .update({
              status: "token_expired",
              sync_error: `Token refresh failed: ${errorText.substring(0, 500)}`,
            })
            .eq("id", conn.id);

          // Also update profile flag
          await supabase
            .from("profiles")
            .update({ instagram_connected: false })
            .eq("id", conn.creator_id);

          failed++;
          continue;
        }

        const data = await response.json();
        const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

        await supabase
          .from("instagram_connections")
          .update({
            access_token_encrypted: data.access_token,
            token_expires_at: newExpiresAt,
            last_sync_at: new Date().toISOString(),
            sync_error: null,
          })
          .eq("id", conn.id);

        console.log(`Refreshed token for ${conn.username}, expires: ${newExpiresAt}`);
        refreshed++;
      } catch (err) {
        console.error(`Error refreshing token for connection ${conn.id}:`, err);

        await supabase
          .from("instagram_connections")
          .update({
            status: "token_expired",
            sync_error: `Refresh error: ${String(err).substring(0, 500)}`,
          })
          .eq("id", conn.id);

        failed++;
      }
    }

    console.log(`Token refresh complete: ${refreshed} refreshed, ${failed} failed`);

    // Fan-out: cache thumbnails for all currently-connected creators BEFORE
    // their tokens die. Dead-token creators can't be cached afterwards.
    const { data: liveConnections } = await supabase
      .from("instagram_connections")
      .select("creator_id")
      .eq("status", "connected");

    let cached = 0;
    let cacheFailed = 0;
    for (const c of liveConnections || []) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/instagram-refresh-profile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ creator_id: c.creator_id }),
        });
        if (res.ok) cached++;
        else cacheFailed++;
      } catch (e) {
        console.warn(`Cache fan-out failed for ${c.creator_id}:`, e);
        cacheFailed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, refreshed, failed, cached, cacheFailed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "unexpected_error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

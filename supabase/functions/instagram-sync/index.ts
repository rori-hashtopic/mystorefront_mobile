import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Refresh a long-lived token if it's within 7 days of expiry.
// Instagram's ig_refresh_token grant uses only the access token (no app secret).
async function maybeRefreshToken(
  accessToken: string,
  tokenExpiresAt: string | null,
): Promise<{ token: string; expiresAt: string | null; refreshed: boolean }> {
  if (!tokenExpiresAt) {
    return { token: accessToken, expiresAt: null, refreshed: false };
  }

  const expiryMs = new Date(tokenExpiresAt).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const needsRefresh = expiryMs - Date.now() < sevenDaysMs;

  if (!needsRefresh) {
    return { token: accessToken, expiresAt: tokenExpiresAt, refreshed: false };
  }

  console.log("Token expiring soon, refreshing...");
  const refreshUrl = new URL("https://graph.instagram.com/refresh_access_token");
  refreshUrl.searchParams.set("grant_type", "ig_refresh_token");
  refreshUrl.searchParams.set("access_token", accessToken);

  const res = await fetch(refreshUrl.toString());
  if (!res.ok) {
    const err = await res.text();
    console.error("Token refresh failed:", err);
    // Return original — sync can still proceed with the existing token
    return { token: accessToken, expiresAt: tokenExpiresAt, refreshed: false };
  }

  const data = await res.json();
  const newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString();
  console.log("Token refreshed, new expiry:", newExpiry);
  return { token: data.access_token, expiresAt: newExpiry, refreshed: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the calling user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse connectionId from body
    let connectionId: string | undefined;
    try {
      const body = await req.json();
      connectionId = body.connectionId;
    } catch {
      // No body
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the connection record — scoped to the calling user for safety
    const query = supabase
      .from("instagram_connections")
      .select("id, creator_id, access_token_encrypted, token_expires_at, status")
      .eq("creator_id", user.id);

    if (connectionId) {
      query.eq("id", connectionId);
    }

    const { data: connection, error: fetchError } = await query.maybeSingle();

    if (fetchError || !connection) {
      console.error("Connection not found:", fetchError);
      return new Response(JSON.stringify({ error: "Instagram connection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!connection.access_token_encrypted) {
      return new Response(JSON.stringify({ error: "No access token stored for this connection" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The token lives directly in `access_token_encrypted` — the column is named for
    // future-proofing but currently holds the plaintext token, matching how
    // instagram-oauth-callback writes it. Read it as-is (no decryption).
    const accessToken = connection.access_token_encrypted;

    // Refresh token if expiring soon
    const {
      token: currentToken,
      expiresAt: newExpiresAt,
      refreshed,
    } = await maybeRefreshToken(accessToken, connection.token_expires_at);

    // Fetch profile data from Instagram Graph API
    console.log("Fetching Instagram profile for connection:", connection.id);
    const profileRes = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type,media_count,biography,followers_count,follows_count,profile_picture_url&access_token=${currentToken}`,
    );

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      console.error("Instagram profile fetch failed:", errText);

      // Check if it's an auth error — mark token expired
      const isAuthError = profileRes.status === 401 || errText.includes("OAuthException");
      const newStatus = isAuthError ? "token_expired" : "error";

      await supabase
        .from("instagram_connections")
        .update({
          status: newStatus,
          sync_error: `Profile fetch failed: ${profileRes.status}`,
        })
        .eq("id", connection.id);

      return new Response(JSON.stringify({ error: "Failed to fetch Instagram profile", status: newStatus }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profile = await profileRes.json();
    console.log("Profile fetched:", profile.username, "followers:", profile.followers_count);

    // Fetch recent media for engagement calculation
    let engagementRate: number | null = null;
    try {
      const mediaRes = await fetch(
        `https://graph.instagram.com/me/media?fields=like_count,comments_count&limit=20&access_token=${currentToken}`,
      );
      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        const posts: { like_count: number; comments_count: number }[] = mediaData.data || [];
        // Require a meaningful follower base so tiny accounts don't produce
        // absurd rates, and clamp to 100% as a sanity bound.
        if (posts.length > 0 && (profile.followers_count ?? 0) >= 10) {
          const totalEngagement = posts.reduce(
            (sum: number, p: { like_count: number; comments_count: number }) =>
              sum + (p.like_count || 0) + (p.comments_count || 0),
            0,
          );
          const avgEngagement = totalEngagement / posts.length;
          const rate = (avgEngagement / profile.followers_count) * 100;
          engagementRate = parseFloat(Math.min(rate, 100).toFixed(2));
        }
      }
    } catch (err) {
      console.warn("Could not fetch media for engagement calculation:", err);
    }

    // Build the update payload
    const updatePayload: Record<string, unknown> = {
      username: profile.username,
      follower_count: profile.followers_count ?? null,
      following_count: profile.follows_count ?? null,
      profile_picture_url: profile.profile_picture_url ?? null,
      bio_description: profile.biography ?? null,
      status: "connected",
      sync_error: null,
      last_sync_at: new Date().toISOString(),
      ...(engagementRate !== null && { engagement_rate: engagementRate }),
    };

    // Persist the refreshed token (plaintext, matching how it is stored on connect)
    if (refreshed) {
      updatePayload.access_token_encrypted = currentToken;
      updatePayload.token_expires_at = newExpiresAt;
    }

    const { error: updateError } = await supabase
      .from("instagram_connections")
      .update(updatePayload)
      .eq("id", connection.id);

    if (updateError) {
      console.error("Failed to update connection:", updateError);
      return new Response(JSON.stringify({ error: "Failed to save sync data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also update creator_socials handle in case username changed
    await supabase
      .from("creator_socials")
      .update({ instagram_handle: profile.username })
      .eq("user_id", connection.creator_id);

    console.log("Instagram sync complete for connection:", connection.id);

    return new Response(
      JSON.stringify({
        success: true,
        username: profile.username,
        follower_count: profile.followers_count ?? null,
        engagement_rate: engagementRate,
        token_refreshed: refreshed,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error in instagram-sync:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ===========================================================================
// SHARED HELPERS — DUPLICATED in instagram-refresh.ts. If you edit one,
// edit both. (To dedupe properly, move these into a Supabase _shared folder
// and import from there — requires local CLI setup.)
// ===========================================================================

async function fetchProfile(accessToken: string) {
  const res = await fetch(
    `https://graph.instagram.com/me?fields=id,username,media_count,profile_picture_url,followers_count,follows_count&access_token=${accessToken}`,
  );
  if (!res.ok) throw new Error(`Profile fetch failed: ${await res.text()}`);
  return await res.json();
}

async function fetchInsights(accessToken: string): Promise<{ reach: number; views: number }> {
  let reach = 0;
  let views = 0;
  try {
    const until = Math.floor(Date.now() / 1000);
    const since = until - 30 * 24 * 60 * 60;
    const res = await fetch(
      `https://graph.instagram.com/me/insights?metric=reach,views&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${accessToken}`,
    );
    if (res.ok) {
      const json = await res.json();
      for (const metric of json.data || []) {
        const v = metric.total_value?.value ?? 0;
        if (metric.name === "reach") reach = v;
        if (metric.name === "views") views = v;
      }
    } else {
      console.warn("Insights fetch failed:", await res.text());
    }
  } catch (e) {
    console.warn("Insights fetch error:", e);
  }
  return { reach, views };
}

async function fetchMedia(accessToken: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=id,timestamp,media_url,media_type,caption,permalink,like_count,comments_count,thumbnail_url&limit=25&access_token=${accessToken}`,
    );
    if (!res.ok) {
      console.warn("Media fetch failed:", await res.text());
      return [];
    }
    const json = await res.json();
    return json.data || [];
  } catch (e) {
    console.warn("Media fetch error:", e);
    return [];
  }
}

async function upsertPosts(supabase: any, userId: string, posts: any[]) {
  if (posts.length === 0) return;
  const sponsoredRegex = /#ad\b|#sponsored|#paidpartnership|#partner\b|#gifted|paid partnership/i;
  const rows = posts.map((m: any) => ({
    creator_id: userId,
    ig_media_id: m.id,
    timestamp: m.timestamp,
    media_url: m.media_url || m.thumbnail_url || null,
    caption_snippet: m.caption ? String(m.caption).substring(0, 500) : null,
    like_count: m.like_count ?? 0,
    comment_count: m.comments_count ?? 0,
    permalink: m.permalink || null,
    is_sponsored: sponsoredRegex.test(m.caption || ""),
  }));
  const { error } = await supabase.from("instagram_posts").upsert(rows, { onConflict: "ig_media_id" });
  if (error) console.warn("Posts upsert failed:", error.message);
  else console.log(`Upserted ${rows.length} posts for ${userId}`);
}

async function upsertHashtagsAndMentions(supabase: any, userId: string, posts: any[]) {
  if (posts.length === 0) return;

  const hashtagCounts = new Map<string, number>();
  const mentionCounts = new Map<string, number>();
  const hashtagRe = /#([a-zA-Z0-9_]+)/g;
  const mentionRe = /@([a-zA-Z0-9_.]+)/g;

  for (const p of posts) {
    const caption = p.caption || "";
    for (const m of caption.matchAll(hashtagRe)) {
      const tag = m[1].toLowerCase();
      hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
    }
    for (const m of caption.matchAll(mentionRe)) {
      const mention = m[1].toLowerCase();
      mentionCounts.set(mention, (mentionCounts.get(mention) || 0) + 1);
    }
  }

  const totalHashtags = [...hashtagCounts.values()].reduce((a, b) => a + b, 0);
  const totalMentions = [...mentionCounts.values()].reduce((a, b) => a + b, 0);

  const hashtagRows = [...hashtagCounts.entries()].map(([hashtag, count]) => ({
    creator_id: userId,
    hashtag,
    usage_count: count,
    usage_percent: totalHashtags > 0 ? Math.round((count / totalHashtags) * 10000) / 100 : 0,
  }));

  const mentionRows = [...mentionCounts.entries()].map(([mention, count]) => ({
    creator_id: userId,
    mention,
    usage_count: count,
    usage_percent: totalMentions > 0 ? Math.round((count / totalMentions) * 10000) / 100 : 0,
  }));

  await supabase.from("instagram_hashtags").delete().eq("creator_id", userId);
  await supabase.from("instagram_mentions").delete().eq("creator_id", userId);

  if (hashtagRows.length > 0) {
    const { error } = await supabase.from("instagram_hashtags").insert(hashtagRows);
    if (error) console.warn("Hashtag insert failed:", error.message);
    else console.log(`Inserted ${hashtagRows.length} hashtags`);
  }
  if (mentionRows.length > 0) {
    const { error } = await supabase.from("instagram_mentions").insert(mentionRows);
    if (error) console.warn("Mention insert failed:", error.message);
    else console.log(`Inserted ${mentionRows.length} mentions`);
  }
}

async function upsertDemographics(supabase: any, userId: string, accessToken: string) {
  const breakdowns = ["age", "gender", "country", "city"];
  const allRows: any[] = [];

  for (const breakdown of breakdowns) {
    try {
      const url =
        `https://graph.instagram.com/me/insights` +
        `?metric=follower_demographics` +
        `&period=lifetime` +
        `&metric_type=total_value` +
        `&timeframe=last_90_days` +
        `&breakdown=${breakdown}` +
        `&access_token=${accessToken}`;

      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Demographics '${breakdown}' failed:`, await res.text());
        continue;
      }
      const json = await res.json();
      const metric = (json.data || [])[0];
      const segments = metric?.total_value?.breakdowns?.[0]?.results || [];
      const total = segments.reduce((sum: number, s: any) => sum + (s.value ?? 0), 0);
      if (total === 0) continue;

      for (const segment of segments) {
        const key = (segment.dimension_values || []).join(", ");
        if (!key) continue;
        allRows.push({
          creator_id: userId,
          demographic_type: breakdown,
          demographic_key: key,
          value: Math.round(((segment.value ?? 0) / total) * 10000) / 100,
          audience_type: "followers",
        });
      }
    } catch (e) {
      console.warn(`Demographics '${breakdown}' error:`, e);
    }
  }

  if (allRows.length === 0) {
    console.log("No demographics data to store");
    return;
  }

  await supabase.from("instagram_audience_demographics").delete().eq("creator_id", userId);

  const { error } = await supabase.from("instagram_audience_demographics").insert(allRows);
  if (error) console.warn("Demographics insert failed:", error.message);
  else console.log(`Inserted ${allRows.length} demographic rows`);
}

async function upsertGrowthSnapshot(supabase: any, userId: string, followerCount: number, followingCount: number) {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;

  const { error } = await supabase.from("instagram_growth_snapshots").upsert(
    {
      creator_id: userId,
      month,
      follower_count: followerCount,
      following_count: followingCount,
    },
    { onConflict: "creator_id,month" },
  );
  if (error) console.warn("Growth snapshot upsert failed:", error.message);
  else console.log(`Growth snapshot upserted for ${month}: ${followerCount} followers`);
}

/**
 * Full enrichment pipeline — called on OAuth connect AND on manual refresh.
 * Each step logs its own errors so one failing section doesn't break the rest.
 */
async function runFullSync(supabase: any, userId: string, accessToken: string, profile: any) {
  const { reach, views } = await fetchInsights(accessToken);
  const posts = await fetchMedia(accessToken);

  let engagementRate = 0;
  if (posts.length > 0 && (profile.followers_count ?? 0) > 0) {
    const totalLikes = posts.reduce((s: number, p: any) => s + (p.like_count ?? 0), 0);
    const totalComments = posts.reduce((s: number, p: any) => s + (p.comments_count ?? 0), 0);
    const avgLikes = totalLikes / posts.length;
    const avgComments = totalComments / posts.length;
    engagementRate = Math.round(((avgLikes + avgComments) / profile.followers_count) * 10000) / 100;
  }

  // Update connection with insights
  await supabase
    .from("instagram_connections")
    .update({ reach, impressions: views, engagement_rate: engagementRate })
    .eq("creator_id", userId);

  // Persist all derived data
  await upsertPosts(supabase, userId, posts);
  await upsertHashtagsAndMentions(supabase, userId, posts);
  await upsertDemographics(supabase, userId, accessToken);
  await upsertGrowthSnapshot(supabase, userId, profile.followers_count ?? 0, profile.follows_count ?? 0);

  return { reach, impressions: views, engagement_rate: engagementRate };
}

// ===========================================================================
// OAuth callback handler
// ===========================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, state } = await req.json();

    if (!code || !state) {
      return new Response(JSON.stringify({ error: "missing_parameters", details: "Missing code or state" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify HMAC-signed state to prevent user_id forgery.
    // Must stay in sync with instagram-oauth-start. Exact match only —
    // startsWith() would make "/" match every path.
    const ALLOWED_ORIGINS = ["/", "/shop", "/settings", "/analytics", "/onboarding"];
    let userId: string;
    let origin = "/shop";
    try {
      const [payloadB64, sigB64] = String(state).split(".");
      if (!payloadB64 || !sigB64) {
        throw new Error("malformed_state");
      }
      const hmacSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(hmacSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"],
      );
      const sigBytes = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
      const ok = await crypto.subtle.verify("HMAC", cryptoKey, sigBytes, new TextEncoder().encode(payloadB64));
      if (!ok) {
        return new Response(JSON.stringify({ error: "invalid_state_signature" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const stateData = JSON.parse(atob(payloadB64));

      const stateAge = Date.now() - (stateData.timestamp || 0);
      if (stateAge > 10 * 60 * 1000) {
        return new Response(JSON.stringify({ error: "state_expired", details: "OAuth state expired" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = stateData.user_id;
      const requestedOrigin = typeof stateData.origin === "string" ? stateData.origin.split("?")[0].split("#")[0] : "";
      if (ALLOWED_ORIGINS.includes(requestedOrigin)) {
        origin = requestedOrigin;
      }
    } catch (e) {
      console.error("Invalid state parameter:", e);
      return new Response(JSON.stringify({ error: "invalid_state", details: "Could not parse state" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appId = Deno.env.get("INSTAGRAM_APP_ID");
    const appSecret = Deno.env.get("INSTAGRAM_APP_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!appId || !appSecret) {
      return new Response(
        JSON.stringify({ error: "configuration_error", details: "Missing Instagram app credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check profile exists
    const { data: profileRow, error: profileErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr || !profileRow) {
      return new Response(
        JSON.stringify({
          error: "profile_not_found",
          details: "Your user profile was not found. Please complete onboarding first.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Exchange code for short-lived token
    const redirectUri = `${Deno.env.get("SITE_URL") || "https://mystorefront.io"}/auth/instagram/callback`;

    console.log("Exchanging code for access token...");
    const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return new Response(JSON.stringify({ error: "token_exchange_failed", details: errorText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenResponse.json();
    console.log("Got short-lived token, user_id:", tokenData.user_id);

    // Exchange for long-lived token
    console.log("Exchanging for long-lived token...");
    const longLivedUrl = new URL("https://graph.instagram.com/access_token");
    longLivedUrl.searchParams.set("grant_type", "ig_exchange_token");
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("access_token", tokenData.access_token);

    const longLivedResponse = await fetch(longLivedUrl.toString());

    if (!longLivedResponse.ok) {
      const errorText = await longLivedResponse.text();
      console.error("Long-lived token failed:", errorText);
      return new Response(JSON.stringify({ error: "long_lived_token_failed", details: errorText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const longLivedToken = await longLivedResponse.json();
    console.log("Got long-lived token, expires in:", longLivedToken.expires_in);

    // Fetch profile
    console.log("Fetching Instagram profile...");
    const profile = await fetchProfile(longLivedToken.access_token);
    console.log("Got profile:", profile.username);

    const tokenExpiresAt = new Date(Date.now() + longLivedToken.expires_in * 1000);

    // `instagram_connections` enforces TWO independent unique constraints:
    //   • creator_id  (one connection per creator)
    //   • ig_user_id  (one creator per Instagram account)
    // A single upsert onConflict target can only satisfy one of them, so if this
    // Instagram account is already linked to a DIFFERENT creator, upserting on
    // creator_id would INSERT and trip the ig_user_id unique constraint (Postgres
    // 23505 — the exact error we were seeing). Instagram OAuth proves the connecting
    // user controls this IG account, so "last authenticated connector wins": release
    // the account from any other creator first (clearing their now-stale connected
    // flags so they aren't shown as connected with no row), THEN upsert on creator_id
    // — which correctly handles this creator reconnecting the same OR switching to a
    // different account.
    const { data: otherHolders, error: lookupError } = await supabase
      .from("instagram_connections")
      .select("creator_id")
      .eq("ig_user_id", profile.id)
      .neq("creator_id", userId);

    if (lookupError) {
      console.error("Failed to look up existing Instagram link:", lookupError);
      return new Response(JSON.stringify({ error: "database_error", details: lookupError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (otherHolders && otherHolders.length > 0) {
      const otherIds = otherHolders.map((r: any) => r.creator_id);
      console.log("Releasing Instagram account from other creator(s):", otherIds);

      const { error: releaseError } = await supabase.from("instagram_connections").delete().in("creator_id", otherIds);

      if (releaseError) {
        console.error("Failed to release existing Instagram link:", releaseError);
        return new Response(JSON.stringify({ error: "database_error", details: releaseError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Keep the released creator(s) consistent — they no longer have a connection.
      await supabase.from("profiles").update({ instagram_connected: false }).in("id", otherIds);
      await supabase
        .from("creator_socials")
        .update({ instagram_connected: false, instagram_handle: null })
        .in("user_id", otherIds);
    }

    // Upsert Instagram connection (token stored directly — column is named
    // `access_token_encrypted` for future-proofing but is currently plaintext)
    const { error: upsertError } = await supabase.from("instagram_connections").upsert(
      {
        creator_id: userId,
        ig_user_id: profile.id,
        username: profile.username,
        access_token_encrypted: longLivedToken.access_token,
        token_expires_at: tokenExpiresAt.toISOString(),
        status: "connected",
        connected_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
        profile_picture_url: profile.profile_picture_url ?? null,
        follower_count: profile.followers_count ?? null,
        following_count: profile.follows_count ?? null,
        media_count: profile.media_count ?? null,
      },
      { onConflict: "creator_id" },
    );

    if (upsertError) {
      console.error("Failed to store connection:", upsertError);
      return new Response(JSON.stringify({ error: "database_error", details: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile + creator_socials flags
    await supabase.from("profiles").update({ instagram_connected: true }).eq("id", userId);

    await supabase.from("creator_socials").upsert(
      {
        user_id: userId,
        instagram_connected: true,
        instagram_handle: profile.username,
      },
      { onConflict: "user_id" },
    );

    console.log("Instagram connection created for user:", userId);

    // Run the FULL enrichment pipeline so brands see complete data
    // immediately without the creator needing to hit Refresh first.
    let syncResult = {};
    try {
      console.log("Running full sync pipeline on connect...");
      syncResult = await runFullSync(supabase, userId, longLivedToken.access_token, profile);
      console.log("Full sync complete:", syncResult);
    } catch (e) {
      // Sync errors don't block the connect — creator can retry via Refresh.
      console.warn("Full sync on connect had errors (creator can retry via Refresh):", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        username: profile.username,
        profile_picture_url: profile.profile_picture_url ?? null,
        follower_count: profile.followers_count ?? null,
        origin,
        ...syncResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Instagram OAuth error:", error);
    return new Response(JSON.stringify({ error: "unexpected_error", details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

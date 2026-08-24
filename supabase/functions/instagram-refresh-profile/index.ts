import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ===========================================================================
// Helpers — one per API concern. Each function returns its data or a safe
// default and logs errors rather than throwing, so one failing section
// doesn't poison the whole refresh.
// ===========================================================================

async function fetchProfile(accessToken: string) {
  const res = await fetch(
    `https://graph.instagram.com/me?fields=id,username,media_count,profile_picture_url,followers_count,follows_count&access_token=${accessToken}`,
  );
  if (!res.ok) throw new Error(`Profile fetch failed: ${await res.text()}`);
  return await res.json();
}

/**
 * Fetch reach + views over a rolling 30-day window.
 * NOTE: `impressions` was deprecated by Meta on April 21, 2025 in favour of
 * the unified `views` metric. We still store the result in the DB's
 * `impressions` column to avoid a migration; rename later if desired.
 */
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
      console.warn("Insights fetch failed (business account required):", await res.text());
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

/**
 * Persist media to `instagram_posts`. Flags sponsored posts by caption
 * heuristic — proper branded content detection would require additional
 * permissions Meta hasn't approved for this app.
 */
/**
 * Download an Instagram CDN image and upload to private storage bucket
 * `instagram-media`. IG CDN URLs expire after hours/days, so we cache the
 * thumbnail and serve it via a signed URL from the app.
 * Returns the storage path on success, or null on failure.
 */
async function cacheThumbnail(
  supabase: any,
  userId: string,
  igMediaId: string,
  sourceUrl: string,
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      console.warn(`Thumbnail download ${igMediaId} failed: ${res.status}`);
      return null;
    }
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    // Never cache mp4/video bytes — <img> can't render them.
    if (!contentType.startsWith("image/")) {
      console.warn(`Thumbnail skip ${igMediaId}: non-image content-type ${contentType}`);
      return null;
    }
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const path = `${userId}/${igMediaId}.${ext}`;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const { error } = await supabase.storage
      .from("instagram-media")
      .upload(path, bytes, { contentType, upsert: true });
    if (error) {
      console.warn(`Thumbnail upload ${igMediaId} failed:`, error.message);
      return null;
    }
    return path;
  } catch (e) {
    console.warn(`Thumbnail cache ${igMediaId} error:`, e);
    return null;
  }
}

async function upsertPosts(supabase: any, userId: string, posts: any[], opts?: { forceRecache?: boolean }) {
  if (posts.length === 0) return;
  const sponsoredRegex = /#ad\b|#sponsored|#paidpartnership|#partner\b|#gifted|paid partnership/i;
  const forceRecache = !!opts?.forceRecache;

  const ids = posts.map((p: any) => p.id);
  const { data: existing } = await supabase
    .from("instagram_posts")
    .select("ig_media_id, cached_media_path")
    .in("ig_media_id", ids);
  const cachedMap = new Map<string, string | null>(
    (existing || []).map((r: any) => [r.ig_media_id, r.cached_media_path]),
  );

  const rows = await Promise.all(
    posts.map(async (m: any) => {
      const isVideo = m.media_type === "VIDEO" || m.media_type === "REEL";
      // Choose IMAGE source: VIDEO/REEL → thumbnail_url; others → media_url.
      const sourceUrl = isVideo
        ? m.thumbnail_url || m.media_url
        : m.media_url || m.thumbnail_url;

      const existingPath = cachedMap.get(m.id) || null;
      let cachedPath: string | null = existingPath;

      // Only overwrite a working path when the new attempt SUCCEEDS.
      if (sourceUrl && (forceRecache || !cachedPath)) {
        const newPath = await cacheThumbnail(supabase, userId, m.id, sourceUrl);
        if (newPath) cachedPath = newPath;
      }

      return {
        creator_id: userId,
        ig_media_id: m.id,
        timestamp: m.timestamp,
        media_url: sourceUrl || null,
        thumbnail_url: m.thumbnail_url || null,
        media_type: m.media_type || null,
        cached_media_path: cachedPath,
        caption_snippet: m.caption ? String(m.caption).substring(0, 500) : null,
        like_count: m.like_count ?? 0,
        comment_count: m.comments_count ?? 0,
        permalink: m.permalink || null,
        is_sponsored: sponsoredRegex.test(m.caption || ""),
      };
    }),
  );

  const { error } = await supabase.from("instagram_posts").upsert(rows, { onConflict: "ig_media_id" });
  if (error) console.warn("Posts upsert failed:", error.message);
  else console.log(`Upserted ${rows.length} posts for ${userId} (cached ${rows.filter((r) => r.cached_media_path).length})`);

  // Reconcile deleted/archived posts, but ONLY within the window this fetch
  // covers (the 25 most-recent). fetchMedia does not paginate, so anything older
  // than the oldest fetched post is outside our view and must be kept.
  const fetchedIds = new Set(posts.map((p: any) => p.id));
  const oldestTs = posts
    .map((p: any) => p.timestamp)
    .reduce((min: string, t: string) => (t < min ? t : min));
  const { data: windowRows } = await supabase
    .from("instagram_posts")
    .select("ig_media_id")
    .eq("creator_id", userId)
    .gte("timestamp", oldestTs);
  const staleIds = (windowRows || [])
    .map((r: any) => r.ig_media_id)
    .filter((id: string) => !fetchedIds.has(id));
  if (staleIds.length > 0) {
    const { error: delErr } = await supabase
      .from("instagram_posts")
      .delete()
      .eq("creator_id", userId)
      .in("ig_media_id", staleIds);
    if (delErr) console.warn("Stale-post prune failed:", delErr.message);
    else console.log(`Pruned ${staleIds.length} stale posts for ${userId}`);
  }
}

/**
 * Parse #hashtags and @mentions from the last 25 captions, compute usage
 * counts + percentages, and replace the creator's rows in
 * `instagram_hashtags` and `instagram_mentions`. No external API call —
 * works entirely off the media data we already fetched.
 */
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

  // Replace-all: the dataset represents the creator's RECENT usage (last 25
  // posts), not all-time. Clearing first keeps the list aligned.
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

/**
 * Fetch follower demographics for age / gender / country / city, convert
 * absolute counts to percentages, and persist to
 * `instagram_audience_demographics`. Meta requires one breakdown per call.
 *
 * Limitations (per Meta docs):
 *   - Requires 100+ followers
 *   - Returns only the top 45 segments
 *   - Data can lag up to 48 hours
 *
 * Stored with audience_type="followers". The "likers" audience type is not
 * exposed by any Meta API — that UI column will always show "--".
 */
async function upsertDemographics(supabase: any, userId: string, accessToken: string, igUserId?: string) {
  const breakdowns = ["age", "gender", "country", "city"];
  const perBreakdown: Record<string, { status: string; error?: any; segments?: number; inserted?: number }> = {};

  let totalInserted = 0;

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
        const bodyText = await res.text();
        let parsed: any = bodyText;
        try { parsed = JSON.parse(bodyText); } catch { /* ignore */ }
        const metaErr = parsed?.error ?? { message: bodyText };
        console.warn(`Demographics '${breakdown}' failed:`, JSON.stringify(metaErr));
        perBreakdown[breakdown] = {
          status: "meta_error",
          error: { code: metaErr.code, subcode: metaErr.error_subcode, message: metaErr.message, type: metaErr.type },
        };
        continue;
      }

      const json = await res.json();
      const metric = (json.data || [])[0];
      const segments = metric?.total_value?.breakdowns?.[0]?.results || [];
      const total = segments.reduce((sum: number, s: any) => sum + (s.value ?? 0), 0);
      if (total === 0 || segments.length === 0) {
        await supabase
          .from("instagram_audience_demographics")
          .delete()
          .eq("creator_id", userId)
          .eq("demographic_type", breakdown)
          .eq("audience_type", "followers");
        perBreakdown[breakdown] = { status: "empty", segments: segments.length };
        continue;
      }

      const rows: any[] = [];
      for (const segment of segments) {
        const key = (segment.dimension_values || []).join(", ");
        if (!key) continue;
        rows.push({
          creator_id: userId,
          demographic_type: breakdown,
          demographic_key: key,
          value: Math.round(((segment.value ?? 0) / total) * 10000) / 100,
          audience_type: "followers",
        });
      }

      if (rows.length > 0) {
        const { error: deleteError } = await supabase
          .from("instagram_audience_demographics")
          .delete()
          .eq("creator_id", userId)
          .eq("demographic_type", breakdown)
          .eq("audience_type", "followers");
        if (deleteError) {
          console.warn(`Demographics '${breakdown}' replace failed:`, deleteError.message);
          perBreakdown[breakdown] = { status: "delete_error", error: { message: deleteError.message }, segments: segments.length };
          continue;
        }

        const { error } = await supabase.from("instagram_audience_demographics").insert(rows);
        if (error) {
          console.warn(`Demographics '${breakdown}' insert failed:`, error.message);
          perBreakdown[breakdown] = { status: "insert_error", error: { message: error.message }, segments: segments.length };
        } else {
          totalInserted += rows.length;
          perBreakdown[breakdown] = { status: "ok", segments: segments.length, inserted: rows.length };
        }
      } else {
        perBreakdown[breakdown] = { status: "empty", segments: 0 };
      }
    } catch (e: any) {
      console.warn(`Demographics '${breakdown}' error:`, e);
      perBreakdown[breakdown] = { status: "exception", error: { message: String(e?.message ?? e) } };
    }
  }

  console.log(`Demographics summary for ${userId}:`, JSON.stringify(perBreakdown), `total_inserted=${totalInserted}`);

  const unavailable = breakdowns.every(
    (breakdown) =>
      perBreakdown[breakdown]?.status === "meta_error" && Number(perBreakdown[breakdown]?.error?.code) === 10,
  );

  if (unavailable) {
    await supabase
      .from("instagram_connections")
      .update({
        sync_error:
          "demographics_unavailable: Instagram denied audience demographics for this account. Ask the creator to reconnect Instagram and allow insights access; if it still fails, the account may not be eligible for audience insights.",
      })
      .eq("creator_id", userId);
  }

  // Always persist a diagnostic row so admins can inspect exactly what Meta returned.
  try {
    await supabase.from("instagram_sync_diagnostics").insert({
      creator_id: userId,
      scope: "demographics",
      ig_user_id: igUserId ?? null,
      payload: { per_breakdown: perBreakdown, total_inserted: totalInserted },
    });
  } catch (e) {
    console.warn("Diagnostic insert failed:", e);
  }

  return { per_breakdown: perBreakdown, total_inserted: totalInserted, unavailable };
}

/**
 * Write/update this month's growth snapshot. Upserting on (creator_id, month)
 * means multiple refreshes in the same month just update the latest follower
 * count — one row per creator per month. Feeds the Growth line chart.
 * Instagram doesn't expose historical follower counts, so the chart builds
 * up month-by-month from whenever this function first runs.
 */
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

// ===========================================================================
// Main orchestrator
// ===========================================================================

/**
 * Detect Instagram OAuth 190 / token invalidation from Graph API error text.
 */
function isTokenExpiredError(msg: string): boolean {
  const m = (msg || "").toLowerCase();
  return (
    m.includes("oauthexception") ||
    m.includes('"code":190') ||
    m.includes("code: 190") ||
    m.includes("access token") ||
    m.includes("session has expired") ||
    m.includes("session has been invalidated")
  );
}

async function fetchInsightsAndUpdate(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  accessToken: string,
  opts?: { forceRecache?: boolean },
) {
  // 1. Profile — first API call; if the token is dead we detect it here and
  //    mark the connection expired WITHOUT touching cached data.
  let profile: any;
  try {
    profile = await fetchProfile(accessToken);
  } catch (e) {
    const msg = String(e);
    if (isTokenExpiredError(msg)) {
      await supabaseAdmin
        .from("instagram_connections")
        .update({ status: "token_expired", sync_error: msg.substring(0, 500) })
        .eq("creator_id", userId);
      const err: any = new Error("token_expired");
      err.tokenExpired = true;
      throw err;
    }
    throw e;
  }

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

  const updateData = {
    follower_count: profile.followers_count ?? 0,
    following_count: profile.follows_count ?? 0,
    media_count: profile.media_count ?? 0,
    profile_picture_url: profile.profile_picture_url ?? null,
    reach,
    impressions: views,
    engagement_rate: engagementRate,
    last_sync_at: new Date().toISOString(),
    status: "connected",
    sync_error: null,
  };
  const { error: updateError } = await supabaseAdmin
    .from("instagram_connections")
    .update(updateData)
    .eq("creator_id", userId);
  if (updateError) throw new Error(`Connection update failed: ${updateError.message}`);

  await upsertPosts(supabaseAdmin, userId, posts, { forceRecache: !!opts?.forceRecache });
  await upsertHashtagsAndMentions(supabaseAdmin, userId, posts);
  const demographics = await upsertDemographics(
    supabaseAdmin,
    userId,
    accessToken,
    profile?.id ? String(profile.id) : undefined,
  );
  await upsertGrowthSnapshot(supabaseAdmin, userId, profile.followers_count ?? 0, profile.follows_count ?? 0);

  return {
    username: profile.username,
    follower_count: updateData.follower_count,
    following_count: updateData.following_count,
    media_count: updateData.media_count,
    profile_picture_url: updateData.profile_picture_url,
    reach,
    impressions: views,
    engagement_rate: engagementRate,
    demographics,
    last_sync_at: updateData.last_sync_at,
  };
}

// ===========================================================================
// HTTP handler
// ===========================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let body: any = null;
    try {
      body = await req.clone().json();
    } catch {
      body = null;
    }

    // ---- Auth: allow either a user JWT OR the service role key (for internal
    // cron backfills). Service-role callers MUST pass creator_id explicitly.
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const isServiceCall = bearer === supabaseServiceKey;

    let targetCreatorId: string | null = null;
    let triggeredBy = "service_role";

    if (isServiceCall) {
      if (!body || typeof body.creator_id !== "string") {
        return new Response(JSON.stringify({ error: "creator_id required for service calls" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetCreatorId = body.creator_id;
    } else {
      // Use getClaims (JWT signature verification) rather than getUser (which
      // hits /auth/v1/user and fails with 401 if the session row was revoked
      // even when the JWT itself is still valid and unexpired).
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
      const { data: claimsData, error: authError } = await supabaseAuth.auth.getClaims(bearer);
      const user = claimsData?.claims ? { id: claimsData.claims.sub as string } : null;
      if (authError || !user?.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      triggeredBy = user.id;
      targetCreatorId = user.id;

      if (body && typeof body.creator_id === "string" && body.creator_id !== user.id) {
        const [{ data: roleRow }, { data: brandRow }] = await Promise.all([
          supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
          supabaseAdmin.from("brand_accounts").select("id, status").eq("owner_user_id", user.id).maybeSingle(),
        ]);
        const isAdmin = !!roleRow;
        const isBrand = !!brandRow && brandRow.status === "approved";
        if (!isAdmin && !isBrand) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        targetCreatorId = body.creator_id;
      }
    }

    const { data: connection, error: connError } = await supabaseAdmin
      .from("instagram_connections")
      .select("access_token_encrypted, status")
      .eq("creator_id", targetCreatorId!)
      .maybeSingle();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "No Instagram connection found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!connection.access_token_encrypted) {
      return new Response(JSON.stringify({ error: "No access token available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const result = await fetchInsightsAndUpdate(
        supabaseAdmin,
        targetCreatorId!,
        connection.access_token_encrypted,
        { forceRecache: !!body?.force_recache },
      );
      console.log("Full refresh successful for creator:", targetCreatorId, "triggered by:", triggeredBy);
      return new Response(JSON.stringify({ success: true, ...result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e: any) {
      if (e && e.tokenExpired) {
        // Expected state, not a failure: return 200 with a token_expired payload
        // so the client can prompt reconnect without surfacing a 401 runtime
        // error. Cached data stays intact.
        return new Response(
          JSON.stringify({
            success: false,
            error: "token_expired",
            message: "Instagram token expired — please reconnect.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw e;
    }
  } catch (error) {
    console.error("Instagram refresh error:", error);
    return new Response(JSON.stringify({ error: "refresh_failed", details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

export { fetchInsightsAndUpdate };

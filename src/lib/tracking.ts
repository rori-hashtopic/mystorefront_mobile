import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function getAnonymousSessionId(): string {
  const storageKey = "storefront_anon_session";
  let sessionId = localStorage.getItem(storageKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(storageKey, sessionId);
  }
  return sessionId;
}

/**
 * Build the share-able affiliate redirect URL for a given link.
 * The redirect endpoint generates a unique click_id per visit and
 * 302s to the brand store with `?click_id=...` appended.
 */
export function buildAffiliateRedirectUrl(linkId: string, creatorUsername?: string, sourcePage?: string): string {
  const base = `${SUPABASE_URL}/functions/v1/affiliate-redirect/${linkId}`;
  const u = new URL(base);
  if (creatorUsername) u.searchParams.set("ref", creatorUsername);
  if (sourcePage) u.searchParams.set("source", sourcePage);
  return u.toString();
}

interface TrackOutboundClickParams {
  linkId: string;
  creatorId: string;
  brandId?: string | null;
  userId?: string | null;
  sourcePage?: string;
}

/**
 * Legacy client-side tracker — kept for places (e.g. shop browsing) that
 * record a click without redirecting. The share-link flow now uses the
 * server-side redirect (buildAffiliateRedirectUrl) instead.
 */
export async function trackOutboundClick({
  linkId,
  creatorId,
  brandId,
  userId,
  sourcePage = "shop",
}: TrackOutboundClickParams): Promise<string | null> {
  try {
    const anonymousSessionId = userId ? null : getAnonymousSessionId();
    const clickId = crypto.randomUUID();

    let resolvedBrandId = brandId || null;
    if (!resolvedBrandId) {
      const { data: resolvedId } = await supabase.rpc("resolve_brand_id_for_link", {
        p_link_id: linkId,
      });
      resolvedBrandId = resolvedId || null;
    }

    const { error: outboundError } = await supabase.from("outbound_clicks").insert({
      link_id: linkId,
      creator_id: creatorId,
      viewer_user_id: userId || null,
      anonymous_session_id: anonymousSessionId,
      source_page: sourcePage,
    });
    if (outboundError) console.error("outbound_clicks insert failed:", outboundError.message);

    const { error: affiliateError } = await supabase.from("affiliate_clicks" as any).insert({
      click_id: clickId,
      link_id: linkId,
      creator_id: creatorId,
      brand_id: resolvedBrandId,
      viewer_user_id: userId || null,
      anonymous_session_id: anonymousSessionId,
      source_page: sourcePage,
    });
    if (affiliateError) console.error("affiliate_clicks insert failed:", affiliateError.message);

    return clickId;
  } catch (error) {
    console.error("Error tracking click:", error);
    return null;
  }
}

/**
 * Append tracking params to an already-built destination URL.
 * Kept for backward compatibility with non-share contexts.
 */
export function appendTrackingParams(url: string, clickId: string | null, creatorId?: string): string {
  try {
    const parsed = new URL(url);
    if (clickId) parsed.searchParams.set("click_id", clickId);
    if (creatorId) parsed.searchParams.set("ref", creatorId);
    return parsed.toString();
  } catch {
    return url;
  }
}

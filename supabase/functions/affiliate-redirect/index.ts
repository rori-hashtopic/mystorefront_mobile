import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const linkId = parts[parts.length - 1];

  if (!linkId || !/^[0-9a-f-]{36}$/i.test(linkId)) {
    return new Response("Invalid or missing link ID", { status: 400 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Fetch link
  const { data: link, error: linkError } = await supabase
    .from("links")
    .select("id, user_id, affiliate_url")
    .eq("id", linkId)
    .maybeSingle();

  if (linkError || !link?.affiliate_url) {
    console.warn("[redirect] Link not found or missing url:", linkId, linkError?.message);
    return new Response("Link not found", { status: 404 });
  }

  // Validate destination URL
  let destination: URL;
  try {
    destination = new URL(link.affiliate_url);
  } catch {
    return new Response("Invalid destination URL", { status: 500 });
  }

  // Resolve brand_id
  const { data: resolvedBrandId, error: brandError } = await supabase.rpc("resolve_brand_id_for_link", {
    p_link_id: linkId,
  });

  if (brandError) {
    console.warn("[redirect] Brand resolution RPC failed; continuing without brand attribution:", brandError.message);
  }

  if (!resolvedBrandId) {
    console.warn("[redirect] No brand_id resolved for link; continuing with creator/click attribution only:", linkId);
  }

  // Generate IDs
  const clickId = crypto.randomUUID();
  const anonymousSessionId = crypto.randomUUID();
  const refParam = url.searchParams.get("ref");
  const sourcePage = url.searchParams.get("source") || "share_link";

  // Insert affiliate click
  const { error: clickError } = await supabase.from("affiliate_clicks").insert({
    click_id: clickId,
    link_id: linkId,
    creator_id: link.user_id,
    brand_id: resolvedBrandId || null,
    anonymous_session_id: anonymousSessionId,
    source_page: sourcePage,
  });

  if (clickError) {
    console.error("[redirect] affiliate_clicks insert failed:", clickError.message);
  }

  // Insert outbound click
  const { error: outboundError } = await supabase.from("outbound_clicks").insert({
    link_id: linkId,
    creator_id: link.user_id,
    anonymous_session_id: anonymousSessionId,
    source_page: sourcePage,
  });

  if (outboundError) {
    console.error("[redirect] outbound_clicks insert failed:", outboundError.message);
  }

  // Append params to destination
  destination.searchParams.set("click_id", clickId);
  if (refParam) destination.searchParams.set("ref", refParam);

  // Log success
  console.log("[redirect] Tracked click:", {
    click_id: clickId,
    link_id: linkId,
    creator_id: link.user_id,
    brand_id: resolvedBrandId,
    destination: destination.toString(),
  });

  // Redirect user
  return Response.redirect(destination.toString(), 302);
});

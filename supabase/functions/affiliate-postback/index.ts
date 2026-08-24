import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const calculateRefundClawback = ({
  refundOrderTotal,
  originalOrderTotal,
  originalCommissionAmount,
  currentCommissionAmount,
}: {
  refundOrderTotal: number;
  originalOrderTotal: number;
  originalCommissionAmount: number;
  currentCommissionAmount: number;
}) => {
  const refundAmountAbs = Math.abs(refundOrderTotal);
  const immutableOrderTotal = Math.abs(originalOrderTotal);
  const refundRatio = immutableOrderTotal > 0 ? Math.min(refundAmountAbs / immutableOrderTotal, 1) : 0;
  const calculatedClawback = Math.max(originalCommissionAmount, 0) * refundRatio;
  const currentRemainingCommission = Math.max(currentCommissionAmount, 0);
  const actualAppliedClawback = Math.min(calculatedClawback, currentRemainingCommission);
  const newCommission = Math.max(currentRemainingCommission - actualAppliedClawback, 0);

  return {
    refundAmountAbs,
    refundRatio,
    calculatedClawback,
    actualAppliedClawback,
    newCommission,
  };
};

const resolvePlatform = async (supabase: any, click: any, body: any) => {
  let platform = "unknown";

  if (click.link_id) {
    const { data: link } = await supabase.from("links").select("platform").eq("id", click.link_id).maybeSingle();
    platform = link?.platform || "unknown";
  }

  if (platform === "unknown") {
    const payloadPlatform = body?.store?.platform || body?.metadata?.store?.platform;

    if (payloadPlatform === "woocommerce") {
      platform = "woocommerce";
    }

    if (payloadPlatform === "shopify") {
      platform = "shopify";
    }
  }

  if (platform === "unknown") {
    console.warn("[postback] Platform still unknown after fallback", {
      click_id: body?.click_id,
      link_id: click.link_id,
      payload: body?.store,
    });
  }

  return platform;
};

const updateBrandPostbackStatus = async (supabase: any, brandId: string, platform: string) => {
  const now = new Date().toISOString();
  const updateData: Record<string, string> = {
    tracking_status: "receiving_postbacks",
    last_postback_at: now,
  };

  if (platform === "shopify") {
    updateData.shopify_last_postback_at = now;
  }

  if (platform === "woocommerce") {
    updateData.woocommerce_last_postback_at = now;
  }

  await supabase.from("brand_accounts").update(updateData).eq("id", brandId);
};

const validateWebhookSecret = async (supabase: any, req: Request, brandId: string) => {
  const { data: brand } = await supabase
    .from("brand_accounts")
    .select("webhook_secret, commission_percent")
    .eq("id", brandId)
    .maybeSingle();

  if (!brand?.webhook_secret) {
    return { error: jsonResponse({ error: "No webhook secret" }, 403), brand: null };
  }

  const authHeader = req.headers.get("authorization");
  const xWebhookHeader = req.headers.get("x-webhook-secret");
  const token = authHeader?.replace(/^Bearer\s+/i, "") || xWebhookHeader;

  if (!token || token !== brand.webhook_secret) {
    return { error: jsonResponse({ error: "Invalid webhook secret" }, 403), brand: null };
  }

  return { error: null, brand };
};

const handlePurchasePostback = async ({ supabase, body, click, brand, platform }: any) => {
  const { click_id, order_id, order_total, commission_amount, currency, metadata } = body;

  if (typeof order_total !== "number" || order_total < 0) {
    return jsonResponse({ error: "Invalid order_total" }, 400);
  }

  const commission = commission_amount ?? (order_total * (brand.commission_percent || 0)) / 100;

  const { data: order, error: orderError } = await supabase
    .from("affiliate_orders")
    .insert({
      click_id: click.click_id,
      brand_id: click.brand_id,
      creator_id: click.creator_id,
      order_id: String(order_id),
      order_total,
      original_order_total: order_total,
      commission_amount: commission,
      original_commission_amount: commission,
      currency: currency || "ZAR",
      metadata: metadata || null,
    })
    .select()
    .single();

  if (orderError) {
    console.error("[postback] Insert error:", orderError);

    if (orderError.code === "23505") {
      return jsonResponse({ success: true, duplicate: true }, 200);
    }

    throw orderError;
  }

  await updateBrandPostbackStatus(supabase, click.brand_id, platform);

  if (click.link_id) {
    const { data: currentLink } = await supabase
      .from("links")
      .select("orders, earned")
      .eq("id", click.link_id)
      .single();

    if (currentLink) {
      await supabase
        .from("links")
        .update({
          orders: (currentLink.orders || 0) + 1,
          earned: Math.max(toNumber(currentLink.earned) + commission, 0),
        })
        .eq("id", click.link_id);
    }
  }

  return jsonResponse({ success: true, order_id: order.id, commission }, 201);
};

const validateRefundPayload = (body: any) => {
  if (!body.click_id || !body.order_id || !body.refund_id || body.order_total === undefined) {
    return "Missing required refund fields";
  }

  if (typeof body.order_total !== "number") {
    return "Invalid refund order_total";
  }

  if (body.metadata?.event !== "refund") {
    return "Invalid refund event";
  }

  return null;
};

const insertRefundRecord = async ({
  supabase,
  body,
  originalOrder,
  click,
  refundAmountAbs,
  refundRatio,
  actualAppliedClawback,
}: any) => {
  const refundMetadata = body.metadata || {};
  const { error } = await supabase.from("affiliate_refunds").insert({
    affiliate_order_id: originalOrder?.id || null,
    brand_id: originalOrder?.brand_id || click?.brand_id || null,
    creator_id: originalOrder?.creator_id || click?.creator_id || null,
    link_id: originalOrder?.link_id || click?.link_id || null,
    click_id: String(body.click_id),
    order_id: String(body.order_id),
    refund_id: String(body.refund_id),
    order_total: body.order_total,
    currency: body.currency || "ZAR",
    refund_amount_abs: refundAmountAbs,
    refund_ratio: refundRatio,
    commission_clawback_amount: actualAppliedClawback,
    refund_reference: refundMetadata.refund_reference || body.refund_id || null,
    refund_note: refundMetadata.refund_note ?? null,
    items_count: Number.isInteger(refundMetadata.items_count) ? refundMetadata.items_count : null,
    line_items: Array.isArray(refundMetadata.line_items) ? refundMetadata.line_items : null,
    metadata: body,
    processed_at: new Date().toISOString(),
  });

  if (error && error.code !== "23505") {
    throw error;
  }

  return error;
};

const handleRefundPostback = async ({ supabase, body, click, platform }: any) => {
  const validationError = validateRefundPayload(body);

  if (validationError) {
    return jsonResponse({ error: validationError }, 400);
  }

  const { data: existingRefund } = await supabase
    .from("affiliate_refunds")
    .select("id")
    .eq("refund_id", String(body.refund_id))
    .maybeSingle();

  if (existingRefund) {
    console.log("[postback] Duplicate refund — returning success without reprocessing", {
      click_id: body.click_id,
      order_id: body.order_id,
      refund_id: body.refund_id,
    });

    return jsonResponse({ success: true, duplicate: true, event: "refund" }, 200);
  }

  const { data: originalOrder, error: orderLookupError } = await supabase
    .from("affiliate_orders")
    .select(
      "id, click_id, order_id, brand_id, creator_id, order_total, original_order_total, commission_amount, original_commission_amount",
    )
    .eq("click_id", String(body.click_id))
    .eq("order_id", String(body.order_id))
    .maybeSingle();

  if (orderLookupError) {
    throw orderLookupError;
  }

  if (!originalOrder) {
    console.warn("[postback] Refund received with no matching commission record", {
      click_id: body.click_id,
      order_id: body.order_id,
      refund_id: body.refund_id,
    });

    if (body.click_id && body.order_id && body.refund_id) {
      const refundAmountAbs = Math.abs(body.order_total);
      await insertRefundRecord({
        supabase,
        body,
        originalOrder: null,
        click,
        refundAmountAbs,
        refundRatio: 0,
        actualAppliedClawback: 0,
      });
    }

    if (click?.brand_id) {
      await updateBrandPostbackStatus(supabase, click.brand_id, platform);
    }

    return jsonResponse({ success: true, event: "refund", no_matching_commission: true }, 200);
  }

  const { refundAmountAbs, refundRatio, actualAppliedClawback, newCommission } = calculateRefundClawback({
    refundOrderTotal: body.order_total,
    originalOrderTotal: toNumber(originalOrder.original_order_total, toNumber(originalOrder.order_total)),
    originalCommissionAmount: toNumber(
      originalOrder.original_commission_amount,
      toNumber(originalOrder.commission_amount),
    ),
    currentCommissionAmount: toNumber(originalOrder.commission_amount),
  });

  const refundInsertError = await insertRefundRecord({
    supabase,
    body,
    originalOrder,
    click,
    refundAmountAbs,
    refundRatio,
    actualAppliedClawback,
  });

  if (refundInsertError?.code === "23505") {
    return jsonResponse({ success: true, duplicate: true, event: "refund" }, 200);
  }

  const { error: updateOrderError } = await supabase
    .from("affiliate_orders")
    .update({
      commission_amount: newCommission,
      updated_at: new Date().toISOString(),
    })
    .eq("id", originalOrder.id);

  if (updateOrderError) {
    throw updateOrderError;
  }

  if (click.link_id && actualAppliedClawback > 0) {
    const { data: currentLink } = await supabase.from("links").select("earned").eq("id", click.link_id).single();

    if (currentLink) {
      await supabase
        .from("links")
        .update({ earned: Math.max(toNumber(currentLink.earned) - actualAppliedClawback, 0) })
        .eq("id", click.link_id);
    }
  }

  await updateBrandPostbackStatus(supabase, click.brand_id, platform);

  return jsonResponse(
    {
      success: true,
      event: "refund",
      refund_id: body.refund_id,
      commission_clawback_amount: actualAppliedClawback,
      remaining_commission_amount: newCommission,
    },
    200,
  );
};

export const handleAffiliatePostback = async (req: Request, createSupabaseClient = createClient): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const { click_id, order_id, order_total, currency, metadata } = body;
    const event = metadata?.event || "purchase";

    console.log("[postback] Received:", {
      event,
      click_id: click_id || "(missing)",
      order_id: order_id || "(missing)",
      refund_id: body.refund_id || "(none)",
      order_total,
      currency: currency || "(default ZAR)",
      test: body.test,
      has_metadata: Boolean(metadata),
      store: body.store?.site_url || body.metadata?.store?.site_url || "(unknown)",
    });

    const isTest = body.test === true || (typeof click_id === "string" && click_id.startsWith("test_click_"));

    if (isTest) {
      console.log("[postback] Test postback received");
      const supabase = createSupabaseClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const authHeader = req.headers.get("authorization");
      const xHeader = req.headers.get("x-webhook-secret");
      const token = authHeader?.replace(/^Bearer\s+/i, "") || xHeader;
      console.log("[postback] Test auth token present:", Boolean(token), "| header:", authHeader?.slice(0, 20));
      if (token) {
        const { data: brand, error } = await supabase
          .from("brand_accounts")
          .select("id")
          .eq("webhook_secret", token)
          .maybeSingle();
        console.log("[postback] Test brand lookup:", brand?.id || "NOT FOUND", "error:", error?.message);
        if (brand?.id) {
          // Resolve the platform from the test payload so the RIGHT integration
          // is marked connected. This previously hard-coded shopify_last_postback_at,
          // which made a WooCommerce test postback light up the Shopify tab.
          const payloadPlatform = body?.store?.platform || body?.metadata?.store?.platform;
          const platform =
            payloadPlatform === "woocommerce"
              ? "woocommerce"
              : payloadPlatform === "shopify"
                ? "shopify"
                : "unknown";
          console.log("[postback] Test platform resolved:", platform);
          await updateBrandPostbackStatus(supabase, brand.id, platform);
        }
      }
      return jsonResponse({ success: true, test: true }, 200);
    }


    if (!click_id || !order_id || order_total === undefined) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    if (event !== "purchase" && event !== "refund") {
      return jsonResponse({ error: "Unsupported postback event" }, 400);
    }

    const supabase = createSupabaseClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: click } = await supabase
      .from("affiliate_clicks")
      .select("click_id, creator_id, brand_id, link_id")
      .eq("click_id", click_id)
      .maybeSingle();

    if (!click) {
      // No matching click in affiliate_clicks. This is NOT an error — it just
      // means the conversion can't be attributed to a creator (e.g. the order
      // wasn't driven by a tracked MyStorefront link, or — during Shopify's app
      // review — the reviewer used a made-up click_id on a clean test store).
      //
      // Previously this returned 404, which the Shopify app records as a failed
      // delivery and which Shopify's reviewer reads as a broken app (404 =
      // "endpoint not found"), triggering the App Store suspension under
      // requirement 2.1.1. A postback receiver must ACKNOWLEDGE receipt with a
      // 2xx even when it can't attribute the sale. We return 202 (Accepted) and
      // record nothing, mirroring how the refund path already returns 200 for a
      // refund with no matching commission.
      console.warn("[postback] No matching click_id — acknowledging as unattributed", {
        click_id,
        order_id,
        event,
      });
      return jsonResponse(
        {
          success: true,
          attributed: false,
          message: "Conversion received but no matching click; recorded as unattributed.",
        },
        200,
      );
    }

    const platform = await resolvePlatform(supabase, click, body);
    const { error: authError, brand } = await validateWebhookSecret(supabase, req, click.brand_id);

    if (authError) {
      return authError;
    }

    if (event === "refund") {
      return await handleRefundPostback({ supabase, body, click, brand, platform });
    }

    return await handlePurchasePostback({ supabase, body, click, brand, platform });
  } catch (error) {
    console.error("[postback] Error:", error);

    return jsonResponse({ error: "Internal server error" }, 500);
  }
};

if (import.meta.main) {
  Deno.serve((req) => handleAffiliatePostback(req));
}

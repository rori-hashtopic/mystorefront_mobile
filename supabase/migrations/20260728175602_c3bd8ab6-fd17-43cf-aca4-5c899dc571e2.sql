REVOKE SELECT (webhook_secret, mystorefront_api_key) ON public.brand_accounts FROM authenticated, anon;
REVOKE SELECT ON public.brand_accounts FROM authenticated, anon;
GRANT SELECT (
  id, name, logo_url, status, owner_user_id, created_at, updated_at, website_url,
  category, instagram_url, tiktok_url, logo_upload_url, commission_percent,
  tracking_status, last_postback_at, slug, hero_image_url, description,
  is_partner, is_trending, store_url, refund_buffer_days,
  shopify_last_postback_at, woocommerce_last_postback_at, plan_tier
) ON public.brand_accounts TO authenticated;
GRANT ALL ON public.brand_accounts TO service_role;
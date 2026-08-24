
-- Revoke full SELECT on brand_accounts from authenticated and anon
REVOKE SELECT ON public.brand_accounts FROM authenticated, anon;

-- Grant SELECT on only non-sensitive columns
GRANT SELECT (
  id, name, status, owner_user_id, created_at, updated_at,
  commission_percent, last_postback_at, is_partner, is_trending,
  logo_url, website_url, category, instagram_url, tiktok_url,
  logo_upload_url, tracking_status, slug, hero_image_url, description
) ON public.brand_accounts TO authenticated;

GRANT SELECT (
  id, name, status, owner_user_id, created_at, updated_at,
  commission_percent, last_postback_at, is_partner, is_trending,
  logo_url, website_url, category, instagram_url, tiktok_url,
  logo_upload_url, tracking_status, slug, hero_image_url, description
) ON public.brand_accounts TO anon;

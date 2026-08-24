-- WooCommerce settings: hide API key
REVOKE SELECT ON public.brand_woocommerce_settings FROM authenticated, anon;
GRANT SELECT (id, brand_id, woocommerce_site_url, woocommerce_webhook_url, is_verified, last_verified_at, created_at, updated_at)
  ON public.brand_woocommerce_settings TO authenticated;
GRANT ALL ON public.brand_woocommerce_settings TO service_role;

-- TikTok connections: hide access/refresh tokens
REVOKE SELECT ON public.tiktok_connections FROM authenticated, anon;
GRANT SELECT (id, creator_id, tiktok_user_id, username, token_expires_at, connected_at, last_sync_at, sync_error, status,
              follower_count, following_count, video_count, likes_count, profile_picture_url, display_name, bio_description,
              created_at, updated_at)
  ON public.tiktok_connections TO authenticated;
GRANT ALL ON public.tiktok_connections TO service_role;

-- Defensive re-revokes on already-hardened tables
REVOKE SELECT (mystorefront_api_key, webhook_secret) ON public.brand_accounts FROM authenticated, anon;
REVOKE SELECT (mystorefront_api_key) ON public.brand_shopify_settings FROM authenticated, anon;
REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM authenticated, anon;
REVOKE SELECT (merchant_key_encrypted, account_number_encrypted) ON public.payout_accounts FROM authenticated, anon;
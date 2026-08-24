
-- brand_accounts secrets
REVOKE SELECT (mystorefront_api_key, webhook_secret) ON public.brand_accounts FROM anon, authenticated;

-- brand_shopify_settings
REVOKE SELECT (mystorefront_api_key) ON public.brand_shopify_settings FROM anon, authenticated;

-- brand_woocommerce_settings
REVOKE SELECT (woocommerce_api_key, woocommerce_webhook_url) ON public.brand_woocommerce_settings FROM anon, authenticated;

-- instagram_connections token
REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM anon, authenticated;

-- tiktok_connections tokens
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON public.tiktok_connections FROM anon, authenticated;

-- payout_accounts merchant key
REVOKE SELECT (merchant_key_encrypted) ON public.payout_accounts FROM anon, authenticated;

-- profiles email — client code must fetch its own email via get_own_profile SECURITY DEFINER RPC
REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;

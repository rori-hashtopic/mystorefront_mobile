
REVOKE SELECT (mystorefront_api_key, webhook_secret) ON public.brand_accounts FROM authenticated, anon;
REVOKE SELECT (mystorefront_api_key) ON public.brand_shopify_settings FROM authenticated, anon;
REVOKE SELECT (woocommerce_api_key) ON public.brand_woocommerce_settings FROM authenticated, anon;
REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM authenticated, anon;
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON public.tiktok_connections FROM authenticated, anon;
REVOKE SELECT (merchant_key_encrypted) ON public.payout_accounts FROM authenticated, anon;

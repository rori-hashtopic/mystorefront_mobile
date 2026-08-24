
REVOKE SELECT (mystorefront_api_key) ON public.brand_shopify_settings FROM anon, authenticated;
REVOKE SELECT (woocommerce_api_key) ON public.brand_woocommerce_settings FROM anon, authenticated;
REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM anon, authenticated;
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON public.tiktok_connections FROM anon, authenticated;

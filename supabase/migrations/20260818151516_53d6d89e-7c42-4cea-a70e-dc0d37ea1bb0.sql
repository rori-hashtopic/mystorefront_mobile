-- Defensive, idempotent lockdown of sensitive columns.
REVOKE SELECT ON TABLE public.brand_accounts FROM anon, authenticated;
REVOKE SELECT (webhook_secret, mystorefront_api_key) ON public.brand_accounts FROM anon, authenticated;

REVOKE SELECT ON TABLE public.instagram_connections FROM anon, authenticated;
REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM anon, authenticated;

REVOKE SELECT ON TABLE public.tiktok_connections FROM anon, authenticated;
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON public.tiktok_connections FROM anon, authenticated;

REVOKE SELECT ON TABLE public.profiles FROM anon, authenticated;
REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;

GRANT ALL ON public.brand_accounts TO service_role;
GRANT ALL ON public.instagram_connections TO service_role;
GRANT ALL ON public.tiktok_connections TO service_role;
GRANT ALL ON public.profiles TO service_role;
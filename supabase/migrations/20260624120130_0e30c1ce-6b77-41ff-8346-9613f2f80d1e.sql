
-- brand_accounts: hide secrets from non-owner authenticated users (creators)
REVOKE SELECT (webhook_secret, mystorefront_api_key) ON public.brand_accounts FROM authenticated;
REVOKE SELECT (webhook_secret, mystorefront_api_key) ON public.brand_accounts FROM anon;

-- brand_shopify_settings: hide mystorefront_api_key from PostgREST
REVOKE SELECT (mystorefront_api_key) ON public.brand_shopify_settings FROM authenticated;
REVOKE SELECT (mystorefront_api_key) ON public.brand_shopify_settings FROM anon;

-- creator_referrals: hide referred_email from referrer client queries
REVOKE SELECT (referred_email) ON public.creator_referrals FROM authenticated;
REVOKE SELECT (referred_email) ON public.creator_referrals FROM anon;

-- instagram_connections: hide access_token_encrypted from any client (only service role uses it)
REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM authenticated;
REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM anon;

-- tiktok_connections: hide access + refresh tokens
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON public.tiktok_connections FROM authenticated;
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON public.tiktok_connections FROM anon;

-- instagram-media bucket: explicit owner-only SELECT policy (folder = auth.uid())
DROP POLICY IF EXISTS "Creators can read own instagram media" ON storage.objects;
CREATE POLICY "Creators can read own instagram media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'instagram-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

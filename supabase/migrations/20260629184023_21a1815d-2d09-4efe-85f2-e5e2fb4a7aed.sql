
-- 1. Revoke encrypted token columns from authenticated role
REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM authenticated;
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON public.tiktok_connections FROM authenticated;

-- 2. Drop overly broad payment-proofs storage policies
DROP POLICY IF EXISTS "Public read access for payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;

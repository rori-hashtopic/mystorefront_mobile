
-- 1. Brand secrets: revoke column-level SELECT from authenticated/anon
-- Owner reads brand_accounts via SECURITY DEFINER RPC get_own_brand_account (bypasses col grants).
-- Admin reads via has_role check / admin RPCs.
REVOKE SELECT (webhook_secret, mystorefront_api_key) ON public.brand_accounts FROM anon, authenticated;

-- 2. Instagram tokens: revoke from authenticated/anon
REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM anon, authenticated;

-- 3. TikTok tokens: revoke from authenticated/anon
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON public.tiktok_connections FROM anon, authenticated;

-- 4. Brand payments: restrict creators from reading brand payment records (admin notes, proofs, etc.).
DROP POLICY IF EXISTS "Creators can view payments for brands they have orders with" ON public.brand_payments;

-- 5. Profiles: require authentication for discoverable lookup, and revoke email from anon.
DROP POLICY IF EXISTS "Authenticated can view discoverable creator profiles" ON public.profiles;
CREATE POLICY "Authenticated can view discoverable creator profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_discoverable = true);

REVOKE SELECT (email) ON public.profiles FROM anon;

-- 6. user_roles: remove unrestricted INSERT policy that allowed self-assigning admin/brand.
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- 7. Storage: avatars - remove broad UPDATE policy (scoped one already exists)
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;

-- 8. Storage: gift-campaign-images - restrict DELETE to brand owner
DROP POLICY IF EXISTS "Users can delete their gift campaign images" ON storage.objects;
CREATE POLICY "Brand owners can delete their gift campaign images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'gift-campaign-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.brand_accounts WHERE owner_user_id = auth.uid()
  )
);

-- 9. Storage: payment-proofs SELECT - restrict to owning brand
DROP POLICY IF EXISTS "Brand owners can view their payment proofs" ON storage.objects;
CREATE POLICY "Brand owners can view their payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.brand_accounts WHERE owner_user_id = auth.uid()
  )
);

-- Also tighten gift-campaign-images upload to brand owners' folder, and payment-proofs upload similarly
DROP POLICY IF EXISTS "Brand owners can upload gift campaign images" ON storage.objects;
CREATE POLICY "Brand owners can upload gift campaign images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gift-campaign-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.brand_accounts WHERE owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Brand owners can upload payment proofs" ON storage.objects;
CREATE POLICY "Brand owners can upload payment proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.brand_accounts WHERE owner_user_id = auth.uid()
  )
);

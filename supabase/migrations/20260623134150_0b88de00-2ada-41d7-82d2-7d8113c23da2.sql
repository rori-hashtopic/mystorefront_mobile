
-- 1) Lock down WooCommerce API key column
REVOKE SELECT (woocommerce_api_key) ON public.brand_woocommerce_settings FROM authenticated;
REVOKE SELECT (woocommerce_api_key) ON public.brand_woocommerce_settings FROM anon;

-- 2) Re-assert column-level revokes for already-protected sensitive columns (idempotent safety net)
REVOKE SELECT (email) ON public.profiles FROM authenticated;
REVOKE SELECT (email) ON public.profiles FROM anon;

REVOKE SELECT (webhook_secret, mystorefront_api_key) ON public.brand_accounts FROM authenticated;
REVOKE SELECT (webhook_secret, mystorefront_api_key) ON public.brand_accounts FROM anon;

REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM authenticated;
REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM anon;

REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON public.tiktok_connections FROM authenticated;
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON public.tiktok_connections FROM anon;

-- 3) Fix brand-logos storage policies (they referenced brand_accounts.name instead of the storage object's path)
DROP POLICY IF EXISTS "Brand owners can update their logo" ON storage.objects;
DROP POLICY IF EXISTS "Brand owners can delete their logo" ON storage.objects;
DROP POLICY IF EXISTS "Brand owners can upload their logo" ON storage.objects;

CREATE POLICY "Brand owners can upload their logo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-logos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.brand_accounts ba
    WHERE ba.owner_user_id = auth.uid()
      AND ba.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Brand owners can update their logo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-logos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.brand_accounts ba
    WHERE ba.owner_user_id = auth.uid()
      AND ba.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Brand owners can delete their logo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-logos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.brand_accounts ba
    WHERE ba.owner_user_id = auth.uid()
      AND ba.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

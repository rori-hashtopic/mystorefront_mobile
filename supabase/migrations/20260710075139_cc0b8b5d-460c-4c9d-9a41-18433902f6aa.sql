
-- 1) brand_accounts: revoke secrets from authenticated/anon (RPC still works via SECURITY DEFINER)
REVOKE SELECT (mystorefront_api_key, webhook_secret) ON public.brand_accounts FROM authenticated;
REVOKE SELECT (mystorefront_api_key, webhook_secret) ON public.brand_accounts FROM anon;

-- 2) brand_shopify_settings / brand_woocommerce_settings: revoke API key columns from clients
REVOKE SELECT (mystorefront_api_key) ON public.brand_shopify_settings FROM authenticated;
REVOKE SELECT (mystorefront_api_key) ON public.brand_shopify_settings FROM anon;
REVOKE SELECT (woocommerce_api_key) ON public.brand_woocommerce_settings FROM authenticated;
REVOKE SELECT (woocommerce_api_key) ON public.brand_woocommerce_settings FROM anon;

-- 3) instagram_connections / tiktok_connections: revoke access tokens from clients
REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM authenticated;
REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM anon;
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON public.tiktok_connections FROM authenticated;
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON public.tiktok_connections FROM anon;

-- 4) collab-submissions storage: switch to exact path match
ALTER TABLE public.paid_collab_submissions ADD COLUMN IF NOT EXISTS storage_path text;

-- Backfill storage_path from existing file_url values that include /collab-submissions/<path>
UPDATE public.paid_collab_submissions
SET storage_path = regexp_replace(
  split_part(file_url, '?', 1),
  '^.*/collab-submissions/',
  ''
)
WHERE storage_path IS NULL
  AND file_url ~ '/collab-submissions/';

DROP POLICY IF EXISTS "Brand owners read submissions on their collabs" ON storage.objects;
CREATE POLICY "Brand owners read submissions on their collabs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'collab-submissions'
  AND EXISTS (
    SELECT 1
    FROM public.paid_collab_submissions s
    JOIN public.paid_collab_participants p ON p.id = s.participant_id
    WHERE s.storage_path = storage.objects.name
      AND public.is_brand_owner_of_collab(p.collab_id)
  )
);

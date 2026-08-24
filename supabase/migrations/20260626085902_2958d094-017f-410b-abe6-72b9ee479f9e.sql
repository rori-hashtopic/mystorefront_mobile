
-- Re-apply column-level revokes for sensitive credential columns
REVOKE SELECT (webhook_secret, mystorefront_api_key) ON public.brand_accounts FROM authenticated, anon;
REVOKE SELECT (mystorefront_api_key) ON public.brand_shopify_settings FROM authenticated, anon;
REVOKE SELECT (merchant_key_encrypted) ON public.payout_accounts FROM authenticated, anon;
REVOKE SELECT (referred_email, referred_name) ON public.creator_referrals FROM authenticated, anon;

-- instagram-media bucket: scoped INSERT/UPDATE/DELETE policies mirroring SELECT
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Creators can upload own instagram media') THEN
    CREATE POLICY "Creators can upload own instagram media" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'instagram-media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Creators can update own instagram media') THEN
    CREATE POLICY "Creators can update own instagram media" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'instagram-media' AND (storage.foldername(name))[1] = auth.uid()::text)
      WITH CHECK (bucket_id = 'instagram-media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Creators can delete own instagram media') THEN
    CREATE POLICY "Creators can delete own instagram media" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'instagram-media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

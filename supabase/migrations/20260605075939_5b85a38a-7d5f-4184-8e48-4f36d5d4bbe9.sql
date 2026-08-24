
-- 1. brand_accounts: exclude webhook_secret + mystorefront_api_key
REVOKE SELECT ON public.brand_accounts FROM anon, authenticated;
GRANT SELECT (
  id, name, logo_url, status, owner_user_id, created_at, updated_at,
  website_url, category, instagram_url, tiktok_url, logo_upload_url,
  commission_percent, tracking_status, last_postback_at, slug,
  hero_image_url, description, is_partner, is_trending, store_url,
  refund_buffer_days, shopify_last_postback_at, woocommerce_last_postback_at
) ON public.brand_accounts TO authenticated;

-- 2. instagram_connections: exclude access_token_encrypted
REVOKE SELECT ON public.instagram_connections FROM anon, authenticated;
GRANT SELECT (
  id, creator_id, ig_user_id, username, token_expires_at, connected_at,
  last_sync_at, sync_error, status, follower_count, following_count,
  profile_picture_url, bio_description, reach, impressions, engagement_rate,
  media_count
) ON public.instagram_connections TO authenticated;

-- 3. tiktok_connections: exclude access_token_encrypted + refresh_token_encrypted
REVOKE SELECT ON public.tiktok_connections FROM anon, authenticated;
GRANT SELECT (
  id, creator_id, tiktok_user_id, username, token_expires_at, connected_at,
  last_sync_at, sync_error, status, follower_count, following_count,
  video_count, likes_count, profile_picture_url, display_name,
  bio_description, created_at, updated_at
) ON public.tiktok_connections TO authenticated;

-- 4. profiles: exclude email
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, display_name, bio, photo_url, tier, onboarding_completed,
  onboarding_step, created_at, updated_at, location_tags, niche_tags,
  instagram_connected, last_activity_at, tiktok_connected, username,
  is_discoverable, marketing_consent, marketing_consent_updated_at,
  cover_image_url
) ON public.profiles TO authenticated;
-- Owner-only access to email preserved via get_own_profile (SECURITY DEFINER).

-- 5. user_roles UPDATE restricted to shopper
DROP POLICY IF EXISTS "Users can update their own role to creator or shopper" ON public.user_roles;
CREATE POLICY "Users can only update their own role to shopper"
ON public.user_roles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND role = 'shopper');

-- 6. brand-logos storage: require folder == owned brand id
DROP POLICY IF EXISTS "Brand owners can update their logo" ON storage.objects;
DROP POLICY IF EXISTS "Brand owners can delete their logo" ON storage.objects;
DROP POLICY IF EXISTS "Brand owners can upload their logo" ON storage.objects;

CREATE POLICY "Brand owners can upload their logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-logos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.brand_accounts
    WHERE owner_user_id = auth.uid()
      AND id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Brand owners can update their logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'brand-logos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.brand_accounts
    WHERE owner_user_id = auth.uid()
      AND id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Brand owners can delete their logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brand-logos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.brand_accounts
    WHERE owner_user_id = auth.uid()
      AND id::text = (storage.foldername(name))[1]
  )
);

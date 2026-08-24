
-- Add brand SELECT policy on instagram_hashtags (missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'instagram_hashtags' AND policyname = 'Brands can view hashtags'
  ) THEN
    EXECUTE 'CREATE POLICY "Brands can view hashtags" ON public.instagram_hashtags FOR SELECT TO authenticated USING (has_role(auth.uid(), ''brand''::app_role))';
  END IF;
END $$;

-- Ensure column-level grants include reach, impressions, engagement_rate for anon and authenticated
GRANT SELECT (id, creator_id, username, follower_count, following_count, reach, impressions, engagement_rate, biography, profile_picture_url, status, last_sync_at, connected_at, ig_user_id, sync_error, token_expires_at) ON public.instagram_connections TO authenticated;
GRANT SELECT (id, creator_id, username, follower_count, following_count, reach, impressions, engagement_rate, biography, profile_picture_url, status, last_sync_at, connected_at, ig_user_id, sync_error, token_expires_at) ON public.instagram_connections TO anon;

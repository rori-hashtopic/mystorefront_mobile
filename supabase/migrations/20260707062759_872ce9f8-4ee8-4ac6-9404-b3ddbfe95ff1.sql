
-- Instagram connections: hide OAuth token from all client roles
REVOKE SELECT ON public.instagram_connections FROM anon, authenticated;
GRANT SELECT (
  id, creator_id, ig_user_id, username, connected_at, last_sync_at, sync_error, status,
  follower_count, following_count, profile_picture_url, bio_description,
  reach, impressions, engagement_rate, media_count, token_expires_at
) ON public.instagram_connections TO authenticated;
GRANT ALL ON public.instagram_connections TO service_role;

-- TikTok connections: hide access and refresh tokens from all client roles
REVOKE SELECT ON public.tiktok_connections FROM anon, authenticated;
GRANT SELECT (
  id, creator_id, tiktok_user_id, username, connected_at, last_sync_at, sync_error, status,
  follower_count, following_count, video_count, likes_count, profile_picture_url,
  display_name, bio_description, token_expires_at, created_at, updated_at
) ON public.tiktok_connections TO authenticated;
GRANT ALL ON public.tiktok_connections TO service_role;

-- Links: hide earnings/orders/clicks from public and non-owner authenticated users.
-- Owning creators read their own full rows via SECURITY DEFINER RPC get_own_links_full.
REVOKE SELECT ON public.links FROM anon, authenticated;
GRANT SELECT (
  id, user_id, product_id, product_title, product_image_url, retailer, affiliate_url,
  content_url, created_at, updated_at, description, sort_order, is_deleted, platform
) ON public.links TO anon, authenticated;
GRANT ALL ON public.links TO service_role;

-- Fix PUBLIC_DATA_EXPOSURE: Instagram and TikTok Access Tokens Exposed to Brands and Admins
-- Apply column-level security to exclude token fields from SELECT grants

-- ===========================================
-- INSTAGRAM CONNECTIONS: Column-Level Security
-- ===========================================

-- Revoke default SELECT access from authenticated users
REVOKE SELECT ON public.instagram_connections FROM anon, authenticated;

-- Grant SELECT only on safe columns (excluding access_token_encrypted)
GRANT SELECT (
  id,
  creator_id,
  ig_user_id,
  username,
  token_expires_at,
  connected_at,
  last_sync_at,
  sync_error,
  status,
  follower_count,
  following_count,
  profile_picture_url,
  biography
) ON public.instagram_connections TO authenticated;

-- ===========================================
-- TIKTOK CONNECTIONS: Column-Level Security
-- ===========================================

-- Revoke default SELECT access from authenticated users
REVOKE SELECT ON public.tiktok_connections FROM anon, authenticated;

-- Grant SELECT only on safe columns (excluding access_token_encrypted and refresh_token_encrypted)
GRANT SELECT (
  id,
  creator_id,
  tiktok_user_id,
  username,
  display_name,
  bio_description,
  profile_picture_url,
  follower_count,
  following_count,
  likes_count,
  video_count,
  token_expires_at,
  connected_at,
  last_sync_at,
  sync_error,
  status,
  created_at,
  updated_at
) ON public.tiktok_connections TO authenticated;
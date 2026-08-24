-- Fix: Protect email from public exposure by using column-level security
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view creator profiles by username" ON public.profiles;

-- Create a more restrictive public policy that requires is_discoverable = true
CREATE POLICY "Public can view discoverable creator profiles"
ON public.profiles FOR SELECT
USING (username IS NOT NULL AND is_discoverable = true);

-- Revoke default SELECT on profiles from anon role
REVOKE SELECT ON public.profiles FROM anon;

-- Grant SELECT only on non-sensitive columns to anon role
GRANT SELECT (
  id, username, display_name, bio, photo_url, cover_image_url,
  niche_tags, location_tags, tier, is_discoverable,
  instagram_connected, tiktok_connected, created_at, updated_at
) ON public.profiles TO anon;
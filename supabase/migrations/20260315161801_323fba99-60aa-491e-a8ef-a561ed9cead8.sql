-- Fix security definer view by recreating as security invoker
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT
  id,
  display_name,
  username,
  bio,
  photo_url,
  cover_image_url,
  tier,
  niche_tags,
  location_tags,
  is_discoverable,
  instagram_connected,
  tiktok_connected,
  created_at
FROM public.profiles
WHERE username IS NOT NULL AND is_discoverable = true;

GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;
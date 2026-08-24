CREATE OR REPLACE FUNCTION public.get_public_creator_profile(p_username text)
RETURNS TABLE (
  id uuid,
  display_name text,
  photo_url text,
  username text,
  bio text,
  niche_tags text[],
  location_tags text[],
  tier text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.display_name,
    p.photo_url,
    p.username,
    p.bio,
    p.niche_tags,
    p.location_tags,
    p.tier::text
  FROM public.profiles p
  WHERE p.username = p_username
    AND COALESCE(p.is_discoverable, true) = true
  LIMIT 1;
$$;
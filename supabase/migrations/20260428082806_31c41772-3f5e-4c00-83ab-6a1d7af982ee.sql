DROP FUNCTION IF EXISTS public.get_public_creator_profile(text);

CREATE OR REPLACE FUNCTION public.get_public_creator_profile(p_username text)
RETURNS TABLE (
  id uuid,
  display_name text,
  photo_url text,
  username text,
  bio text,
  niche_tags text[],
  location_tags text[],
  attribute_tags text[],
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
    COALESCE(NULLIF(p.niche_tags, ARRAY[]::text[]), ct.niches) AS niche_tags,
    COALESCE(NULLIF(p.location_tags, ARRAY[]::text[]), ct.locations) AS location_tags,
    ct.attributes AS attribute_tags,
    p.tier::text
  FROM public.profiles p
  LEFT JOIN public.creator_tags ct ON ct.user_id = p.id
  WHERE p.username = p_username
    AND COALESCE(p.is_discoverable, true) = true
  LIMIT 1;
$$;
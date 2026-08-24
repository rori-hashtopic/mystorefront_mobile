CREATE OR REPLACE FUNCTION public.get_discoverable_creators_with_instagram()
RETURNS TABLE (
  id uuid,
  display_name text,
  photo_url text,
  cover_image_url text,
  username text,
  bio text,
  niche_tags text[],
  tier text,
  created_at timestamptz
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
    p.cover_image_url,
    p.username,
    p.bio,
    p.niche_tags,
    p.tier::text,
    p.created_at
  FROM public.profiles p
  JOIN public.user_roles ur
    ON ur.user_id = p.id AND ur.role = 'creator'::app_role
  JOIN public.instagram_connections ic
    ON ic.creator_id = p.id AND ic.status = 'connected'::instagram_connection_status
  WHERE p.is_discoverable = true
    AND p.onboarding_completed = true
    AND p.username IS NOT NULL
    AND p.display_name IS NOT NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.get_discoverable_creators_with_instagram() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_discoverable_creators_with_instagram() TO authenticated;

-- Roll back the previous permissive user_roles policy; access is now via RPC.
DROP POLICY IF EXISTS "Authenticated can view creator roles" ON public.user_roles;
-- Restrict authenticated role to only safe columns on profiles
REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (
  id, display_name, username, bio, photo_url, cover_image_url,
  tier, niche_tags, location_tags, is_discoverable,
  instagram_connected, tiktok_connected,
  onboarding_completed, onboarding_step,
  created_at, updated_at, last_activity_at
) ON public.profiles TO authenticated;

-- Create security definer function for users to read their own full profile (including email, marketing_consent)
CREATE OR REPLACE FUNCTION public.get_own_profile(p_user_id uuid)
RETURNS SETOF profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM profiles WHERE id = p_user_id LIMIT 1;
$$;

-- Create admin function for full profile access
CREATE OR REPLACE FUNCTION public.get_all_profiles_admin()
RETURNS SETOF profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM profiles
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY created_at DESC;
$$;
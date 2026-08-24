-- 1. get_own_profile: remove uuid-parameter overload (IDOR) and scope to auth.uid()
DROP FUNCTION IF EXISTS public.get_own_profile(uuid);

CREATE OR REPLACE FUNCTION public.get_own_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_own_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_profile() TO authenticated;

-- 2. get_own_links: remove uuid-parameter overload, scope to auth.uid()
DROP FUNCTION IF EXISTS public.get_own_links(uuid);

CREATE OR REPLACE FUNCTION public.get_own_links()
RETURNS SETOF public.links
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT *
  FROM public.links
  WHERE user_id = auth.uid()
    AND is_deleted = false;
$$;

REVOKE ALL ON FUNCTION public.get_own_links() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_links() TO authenticated;

-- 3. profiles: keep sensitive columns unreadable by other authenticated users
REVOKE SELECT (email) ON public.profiles FROM authenticated, anon;
REVOKE SELECT (marketing_consent, marketing_consent_updated_at) ON public.profiles FROM authenticated, anon;

-- Narrow the broad discovery policy to profiles that are actually publishable
DROP POLICY IF EXISTS "Authenticated can view discoverable creator profiles" ON public.profiles;
CREATE POLICY "Authenticated can view discoverable creator profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_discoverable = true AND username IS NOT NULL);
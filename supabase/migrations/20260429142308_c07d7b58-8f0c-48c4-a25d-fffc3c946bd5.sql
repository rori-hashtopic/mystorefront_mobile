CREATE OR REPLACE FUNCTION public.resolve_creator_referrer(p_ref text)
RETURNS TABLE(id uuid, display_name text, username text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.username
  FROM public.profiles p
  WHERE public.has_role(p.id, 'creator')
    AND (
      lower(p.username) = lower(trim(p_ref))
      OR p.id::text = trim(p_ref)
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_creator_referrer(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_creator_referrer(text) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_creator_referrer(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_creator_referrer(text) TO service_role;
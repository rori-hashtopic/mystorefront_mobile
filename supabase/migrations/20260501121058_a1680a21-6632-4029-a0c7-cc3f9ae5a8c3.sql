CREATE OR REPLACE FUNCTION public.admin_find_auth_user_by_email(p_email text)
RETURNS TABLE(id uuid, email text, raw_user_meta_data jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id, u.email, u.raw_user_meta_data
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.admin_find_auth_user_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_find_auth_user_by_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_find_auth_user_by_email(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_find_auth_user_by_email(text) TO service_role;
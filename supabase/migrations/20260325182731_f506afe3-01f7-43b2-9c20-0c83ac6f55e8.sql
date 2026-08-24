CREATE OR REPLACE FUNCTION public.get_profile_admin(_user_id uuid)
RETURNS SETOF profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM profiles
  WHERE id = _user_id
    AND public.has_role(auth.uid(), 'admin');
$$;
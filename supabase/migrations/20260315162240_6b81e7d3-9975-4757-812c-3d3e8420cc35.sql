-- Create admin function for full brand_accounts access
CREATE OR REPLACE FUNCTION public.get_all_brand_accounts()
RETURNS SETOF brand_accounts
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM brand_accounts
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_own_brand_account()
RETURNS SETOF brand_accounts
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM brand_accounts WHERE owner_user_id = auth.uid() LIMIT 1;
$$;

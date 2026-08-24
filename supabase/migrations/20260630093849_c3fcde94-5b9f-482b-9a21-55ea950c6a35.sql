
CREATE OR REPLACE FUNCTION public.get_brand_owner_user_id(p_brand_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_user_id FROM public.brand_accounts WHERE id = p_brand_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_brand_owner_user_id(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_brand(p_brand_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete brand accounts';
  END IF;

  -- Remove rows that have no ON DELETE CASCADE
  DELETE FROM affiliate_orders WHERE brand_id = p_brand_id;
  DELETE FROM affiliate_clicks WHERE brand_id = p_brand_id;
  DELETE FROM mention_requests WHERE brand_id = p_brand_id;

  -- Mirrored public.brands row (cascades products)
  DELETE FROM brands WHERE id = p_brand_id;

  -- Finally the brand account (cascades remaining dependents)
  DELETE FROM brand_accounts WHERE id = p_brand_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_brand(uuid) TO authenticated;
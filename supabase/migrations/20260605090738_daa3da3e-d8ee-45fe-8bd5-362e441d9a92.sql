CREATE OR REPLACE FUNCTION public.admin_delete_brand(p_brand_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete brand accounts';
  END IF;

  -- Remove refund records attached to this brand's orders before deleting orders.
  DELETE FROM public.affiliate_refunds ar
  USING public.affiliate_orders ao
  WHERE ar.affiliate_order_id = ao.id
    AND ao.brand_id = p_brand_id;

  -- Remove rows that have no ON DELETE CASCADE.
  DELETE FROM public.affiliate_orders WHERE brand_id = p_brand_id;
  DELETE FROM public.affiliate_clicks WHERE brand_id = p_brand_id;
  DELETE FROM public.mention_requests WHERE brand_id = p_brand_id;

  -- Mirrored public.brands row (cascades products).
  DELETE FROM public.brands WHERE id = p_brand_id;

  -- Finally the brand account (cascades remaining dependents).
  DELETE FROM public.brand_accounts WHERE id = p_brand_id;
END;
$function$;
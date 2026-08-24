CREATE OR REPLACE FUNCTION public.get_creator_balance(p_creator_id uuid)
 RETURNS TABLE(total_earned numeric, locked_amount numeric, paid_amount numeric, available_balance numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH order_totals AS (
    SELECT
      COALESCE(SUM(ao.commission_amount), 0) AS all_commissions,
      COALESCE(SUM(CASE WHEN ao.status = 'confirmed' THEN ao.commission_amount ELSE 0 END), 0) AS confirmed_commissions
    FROM affiliate_orders ao
    WHERE ao.creator_id = p_creator_id
  ),
  payout_totals AS (
    SELECT
      COALESCE(SUM(CASE WHEN pr.status = 'paid' THEN pr.amount ELSE 0 END), 0) AS paid_out,
      COALESCE(SUM(CASE WHEN pr.status IN ('paid', 'pending', 'approved') THEN pr.amount ELSE 0 END), 0) AS committed
    FROM payout_requests pr
    WHERE pr.creator_id = p_creator_id
  )
  SELECT
    ot.all_commissions AS total_earned,
    ot.confirmed_commissions AS locked_amount,
    pt.paid_out AS paid_amount,
    GREATEST(ot.confirmed_commissions - pt.committed, 0) AS available_balance
  FROM order_totals ot, payout_totals pt;
$function$;
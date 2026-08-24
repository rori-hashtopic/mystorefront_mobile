CREATE POLICY "Creators can view payments for brands they have orders with"
ON public.brand_payments
FOR SELECT
TO authenticated
USING (
  brand_id IN (
    SELECT DISTINCT ao.brand_id
    FROM affiliate_orders ao
    WHERE ao.creator_id = auth.uid()
  )
);
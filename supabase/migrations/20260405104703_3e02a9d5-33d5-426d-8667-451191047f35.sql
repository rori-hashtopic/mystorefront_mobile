CREATE POLICY "Creators can view campaigns for their gift requests"
ON public.gift_campaigns
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT campaign_id FROM public.gift_requests
    WHERE creator_id = auth.uid()
  )
);
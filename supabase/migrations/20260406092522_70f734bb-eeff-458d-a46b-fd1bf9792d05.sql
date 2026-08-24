-- Allow creators to view mention_campaigns for campaigns they have requests in
CREATE POLICY "Creators can view campaigns for their requests"
  ON public.mention_campaigns FOR SELECT TO authenticated
  USING (id IN (SELECT campaign_id FROM public.mention_requests WHERE creator_id = auth.uid()));

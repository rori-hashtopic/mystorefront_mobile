CREATE POLICY "Brands can view creator tags"
ON public.creator_tags
FOR SELECT
TO public
USING (has_role(auth.uid(), 'brand'::app_role));
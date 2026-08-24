-- Allow admins to read and manage all creator_tags
CREATE POLICY "Admins can manage all creator tags"
ON public.creator_tags
FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
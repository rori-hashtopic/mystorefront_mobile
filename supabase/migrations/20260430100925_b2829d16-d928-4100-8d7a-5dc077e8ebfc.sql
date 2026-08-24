CREATE POLICY "Admins can delete waitlist"
ON public.creator_waitlist
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));
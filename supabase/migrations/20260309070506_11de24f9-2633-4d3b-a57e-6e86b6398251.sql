CREATE POLICY "Admins can delete messages"
ON public.messages
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
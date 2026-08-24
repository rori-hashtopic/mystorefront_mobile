CREATE POLICY "Users can update their own role to creator or shopper"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    (auth.uid() = user_id)
    AND (role = ANY (ARRAY['creator'::app_role, 'shopper'::app_role]))
  );
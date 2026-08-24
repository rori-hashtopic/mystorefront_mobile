DROP POLICY IF EXISTS "Users can only insert creator or shopper roles" ON public.user_roles;

CREATE POLICY "Users can only self-assign shopper role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND role = 'shopper'
);
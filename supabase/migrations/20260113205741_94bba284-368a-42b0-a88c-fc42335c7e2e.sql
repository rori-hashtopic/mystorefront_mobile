-- Allow public to see which users have the 'creator' role (needed for Explore page)
CREATE POLICY "Public can view creator roles"
ON public.user_roles
FOR SELECT
USING (role = 'creator'::app_role);
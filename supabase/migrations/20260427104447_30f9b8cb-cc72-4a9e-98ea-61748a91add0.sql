DROP POLICY IF EXISTS "Users can create their own creator applications" ON public.creator_applications;

CREATE POLICY "Anyone can submit creator applications"
ON public.creator_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

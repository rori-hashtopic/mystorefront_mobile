
DROP POLICY IF EXISTS "Authenticated can view discoverable creator profiles" ON public.profiles;
CREATE POLICY "Authenticated can view discoverable creator profiles"
  ON public.profiles FOR SELECT
  USING (is_discoverable = true);

CREATE OR REPLACE FUNCTION public.get_paid_collab_allowlisted_creator()
RETURNS TABLE(id uuid, display_name text, photo_url text, username text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.photo_url, p.username
  FROM public.profiles p
  WHERE p.id = '04cd8206-2eed-4392-8837-64b1dfe779e0'::uuid
    AND EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND lower(u.email) = 'capturedbymelofficial@gmail.com'
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_paid_collab_allowlisted_creator() TO authenticated;
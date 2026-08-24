
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read for hashtags" ON public.instagram_hashtags;
DROP POLICY IF EXISTS "Public can view creator roles" ON public.user_roles;
CREATE POLICY "Authenticated can view creator roles" ON public.user_roles FOR SELECT TO authenticated USING (role = 'creator'::app_role);

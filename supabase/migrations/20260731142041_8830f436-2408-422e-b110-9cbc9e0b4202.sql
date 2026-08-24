CREATE OR REPLACE FUNCTION public.brand_can_view_creator(p_creator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'brand'::app_role)
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = p_creator_id AND p.is_discoverable = true
      )
      OR public.brand_has_creator_relationship(p_creator_id)
    );
$$;

-- instagram_hashtags
DROP POLICY IF EXISTS "Brands can view hashtags" ON public.instagram_hashtags;
CREATE POLICY "Brands can view hashtags"
  ON public.instagram_hashtags FOR SELECT TO authenticated
  USING (public.brand_can_view_creator(creator_id));
DROP POLICY IF EXISTS "Creators can view their own hashtags" ON public.instagram_hashtags;
CREATE POLICY "Creators can view their own hashtags"
  ON public.instagram_hashtags FOR SELECT TO authenticated
  USING (creator_id = auth.uid());
DROP POLICY IF EXISTS "Admins can view all hashtags" ON public.instagram_hashtags;
CREATE POLICY "Admins can view all hashtags"
  ON public.instagram_hashtags FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- instagram_mentions
DROP POLICY IF EXISTS "Brands can view mentions" ON public.instagram_mentions;
CREATE POLICY "Brands can view mentions"
  ON public.instagram_mentions FOR SELECT TO authenticated
  USING (public.brand_can_view_creator(creator_id));

-- instagram_posts
DROP POLICY IF EXISTS "Brands can view creator posts" ON public.instagram_posts;
CREATE POLICY "Brands can view creator posts"
  ON public.instagram_posts FOR SELECT TO authenticated
  USING (public.brand_can_view_creator(creator_id));

-- instagram_growth_snapshots
DROP POLICY IF EXISTS "Brands can view snapshots" ON public.instagram_growth_snapshots;
CREATE POLICY "Brands can view snapshots"
  ON public.instagram_growth_snapshots FOR SELECT TO authenticated
  USING (public.brand_can_view_creator(creator_id));

-- instagram_audience_demographics
DROP POLICY IF EXISTS "Brands can view demographics" ON public.instagram_audience_demographics;
CREATE POLICY "Brands can view demographics"
  ON public.instagram_audience_demographics FOR SELECT TO authenticated
  USING (public.brand_can_view_creator(creator_id));

-- creator_kpi_snapshots
DROP POLICY IF EXISTS "Brands can view KPIs" ON public.creator_kpi_snapshots;
CREATE POLICY "Brands can view KPIs"
  ON public.creator_kpi_snapshots FOR SELECT TO authenticated
  USING (public.brand_can_view_creator(creator_id));

-- placeholder_analytics
DROP POLICY IF EXISTS "Brands can view placeholders" ON public.placeholder_analytics;
CREATE POLICY "Brands can view placeholders"
  ON public.placeholder_analytics FOR SELECT TO authenticated
  USING (public.brand_can_view_creator(creator_id));

-- user_roles
DROP POLICY IF EXISTS "Brands can view creator roles" ON public.user_roles;
CREATE POLICY "Brands can view creator roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (role = 'creator'::app_role AND public.brand_can_view_creator(user_id));
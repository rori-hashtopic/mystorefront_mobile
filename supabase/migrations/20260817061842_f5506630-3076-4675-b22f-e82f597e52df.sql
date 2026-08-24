-- 1) creator_tags: gate brand access behind discoverability/relationship
DROP POLICY IF EXISTS "Brands can view creator tags" ON public.creator_tags;
CREATE POLICY "Brands can view creator tags"
ON public.creator_tags
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'brand'::app_role) AND public.brand_can_view_creator(user_id));

REVOKE SELECT ON public.creator_tags FROM anon;

-- 2) profiles: ensure email + other PII never selectable by broad roles
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (
  id, display_name, bio, photo_url, tier, onboarding_completed, onboarding_step,
  created_at, updated_at, location_tags, niche_tags, instagram_connected,
  last_activity_at, tiktok_connected, username, is_discoverable, cover_image_url
) ON public.profiles TO authenticated;
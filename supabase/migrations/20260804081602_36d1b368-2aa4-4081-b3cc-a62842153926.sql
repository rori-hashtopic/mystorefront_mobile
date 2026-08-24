REVOKE SELECT ON public.profiles FROM authenticated, anon;

GRANT SELECT (
  id, display_name, bio, photo_url, tier, onboarding_completed, onboarding_step,
  created_at, updated_at, location_tags, niche_tags, instagram_connected,
  last_activity_at, tiktok_connected, username, is_discoverable,
  marketing_consent, marketing_consent_updated_at, cover_image_url
) ON public.profiles TO authenticated;

REVOKE SELECT (email) ON public.profiles FROM authenticated, anon;

GRANT ALL ON public.profiles TO service_role;
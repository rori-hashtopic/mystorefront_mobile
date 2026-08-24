-- Defensive: ensure no broad table-level SELECT on profiles, and that email
-- (and any other private contact fields) are never readable by anon/authenticated.
REVOKE SELECT ON public.profiles FROM anon, authenticated;

DO $$
DECLARE
  col text;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'id','display_name','bio','photo_url','tier','onboarding_completed','onboarding_step',
    'created_at','updated_at','location_tags','niche_tags','instagram_connected',
    'last_activity_at','tiktok_connected','username','is_discoverable',
    'marketing_consent','marketing_consent_updated_at','cover_image_url'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_attribute a
      WHERE a.attrelid = 'public.profiles'::regclass
        AND a.attname = col AND a.attnum > 0 AND NOT a.attisdropped
    ) THEN
      EXECUTE format('GRANT SELECT (%I) ON public.profiles TO authenticated', col);
    END IF;
  END LOOP;
END $$;

REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
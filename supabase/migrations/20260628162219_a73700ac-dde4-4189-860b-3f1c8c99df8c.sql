DROP TRIGGER IF EXISTS trg_cleanup_creator_waitlist_on_signup ON auth.users;
DROP FUNCTION IF EXISTS public.cleanup_creator_waitlist_on_signup();

CREATE OR REPLACE FUNCTION public.cleanup_creator_waitlist_on_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.onboarding_completed = true
     AND (OLD.onboarding_completed IS DISTINCT FROM NEW.onboarding_completed)
     AND NEW.email IS NOT NULL THEN
    DELETE FROM public.creator_waitlist
    WHERE lower(email) = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_creator_waitlist_on_onboarding ON public.profiles;
CREATE TRIGGER trg_cleanup_creator_waitlist_on_onboarding
AFTER UPDATE OF onboarding_completed ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_creator_waitlist_on_onboarding();

INSERT INTO public.creator_waitlist
  (full_name, email, primary_platform, social_handle, niche, follower_range, referral_source, status, invite_used_at)
SELECT
  COALESCE(p.display_name, split_part(u.email, '@', 1)),
  u.email,
  'unknown',
  COALESCE(p.username, split_part(u.email, '@', 1)),
  'unknown',
  'unknown',
  'backfill',
  'invite_sent'::creator_waitlist_status,
  u.created_at
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'creator'
LEFT JOIN public.profiles p ON p.id = u.id
WHERE COALESCE(p.onboarding_completed, false) = false
  AND u.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.creator_waitlist cw
    WHERE lower(cw.email) = lower(u.email)
  );
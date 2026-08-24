CREATE OR REPLACE FUNCTION public.cleanup_creator_waitlist_on_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.onboarding_completed = true
     AND (OLD.onboarding_completed IS DISTINCT FROM NEW.onboarding_completed)
     AND NEW.email IS NOT NULL THEN
    DELETE FROM public.creator_waitlist
    WHERE lower(email) = lower(NEW.email);

    DELETE FROM public.creator_applications
    WHERE lower(email) = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill: remove application rows for creators who have already onboarded
DELETE FROM public.creator_applications ca
USING public.profiles p
WHERE lower(ca.email) = lower(p.email)
  AND p.onboarding_completed = true;
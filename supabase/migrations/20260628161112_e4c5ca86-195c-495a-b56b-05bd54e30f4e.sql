CREATE OR REPLACE FUNCTION public.cleanup_creator_waitlist_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.creator_waitlist
  WHERE lower(email) = lower(NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_creator_waitlist_on_signup ON auth.users;
CREATE TRIGGER trg_cleanup_creator_waitlist_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_creator_waitlist_on_signup();

-- Backfill: remove waitlist rows for emails that already have auth users
DELETE FROM public.creator_waitlist cw
USING auth.users u
WHERE lower(cw.email) = lower(u.email);
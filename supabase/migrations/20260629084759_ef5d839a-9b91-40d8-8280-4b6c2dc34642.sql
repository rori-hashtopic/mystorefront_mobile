DO $$
DECLARE
  v_uid uuid := '03033ea1-3bef-4fa7-8be0-11d39627502e';
  v_email text := 'roxi.mystorefront@gmail.com';
BEGIN
  DELETE FROM public.creator_waitlist WHERE lower(email) = lower(v_email);
  DELETE FROM public.creator_applications WHERE lower(email) = lower(v_email);
  DELETE FROM public.creator_referrals WHERE lower(referred_email) = lower(v_email);
  DELETE FROM public.brand_waitlist WHERE lower(email) = lower(v_email);
  DELETE FROM public.suppressed_emails WHERE lower(email) = lower(v_email);
  DELETE FROM public.user_roles WHERE user_id = v_uid;
  DELETE FROM public.profiles WHERE id = v_uid;
  DELETE FROM auth.users WHERE id = v_uid;
END $$;
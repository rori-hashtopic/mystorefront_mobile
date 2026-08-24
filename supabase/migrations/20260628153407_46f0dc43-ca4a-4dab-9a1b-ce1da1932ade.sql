
DO $$
DECLARE
  v_user_id uuid := 'ecd39280-9317-422f-af15-6765521853bf';
  v_email text := 'andredejong08@gmail.com';
BEGIN
  DELETE FROM public.creator_waitlist WHERE lower(email) = v_email;
  DELETE FROM public.creator_applications WHERE lower(email) = v_email OR user_id = v_user_id;
  DELETE FROM public.creator_referrals WHERE lower(referred_email) = v_email OR referrer_id = v_user_id;
  DELETE FROM public.suppressed_emails WHERE lower(email) = v_email;
  DELETE FROM public.email_unsubscribe_tokens WHERE lower(email) = v_email;
  DELETE FROM public.email_send_log WHERE lower(recipient_email) = v_email;
  DELETE FROM auth.users WHERE id = v_user_id;
END $$;

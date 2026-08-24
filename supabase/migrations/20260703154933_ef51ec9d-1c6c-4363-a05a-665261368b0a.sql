CREATE OR REPLACE FUNCTION public.get_email_queue_service_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
BEGIN
  -- Only the service_role may retrieve this secret. Any other caller (anon,
  -- authenticated, admin users) is denied so the key cannot leak via PostgREST.
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  RETURN v_secret;
END;
$$;

REVOKE ALL ON FUNCTION public.get_email_queue_service_key() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_queue_service_key() TO service_role;
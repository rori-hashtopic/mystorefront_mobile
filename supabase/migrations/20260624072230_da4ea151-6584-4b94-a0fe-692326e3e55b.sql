
-- Create an internal shared secret (only if not already present) used to
-- authenticate database triggers when calling the push-discount-code function.
DO $$
DECLARE
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM vault.secrets WHERE name = 'push_discount_internal_token';
  IF v_existing IS NULL THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'push_discount_internal_token',
      'Shared secret between discount-code DB triggers and the push-discount-code edge function'
    );
  END IF;
END $$;

-- Update INSERT/UPDATE trigger to pass the secret in a header
CREATE OR REPLACE FUNCTION public.notify_push_discount_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'push_discount_internal_token'
  LIMIT 1;

  PERFORM net.http_post(
    url := 'https://lhzqnkrjqaebcfxcmlgd.supabase.co/functions/v1/push-discount-code',
    body := jsonb_build_object('record', row_to_json(NEW)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', COALESCE(v_secret, '')
    )
  );
  RETURN NEW;
END;
$function$;

-- Update DELETE trigger to pass the secret in a header
CREATE OR REPLACE FUNCTION public.handle_discount_code_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'push_discount_internal_token'
  LIMIT 1;

  PERFORM net.http_post(
    url := 'https://lhzqnkrjqaebcfxcmlgd.supabase.co/functions/v1/push-discount-code',
    body := jsonb_build_object(
      'event', 'DELETE',
      'old_record', row_to_json(OLD)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', COALESCE(v_secret, '')
    )
  );
  RETURN OLD;
END;
$function$;

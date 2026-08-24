CREATE OR REPLACE FUNCTION public.notify_push_discount_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  service_key text;
BEGIN
  service_key := current_setting('app.settings.service_role_key', true);

  PERFORM net.http_post(
    url := 'https://lhzqnkrjqaebcfxcmlgd.supabase.co/functions/v1/push-discount-code',
    body := jsonb_build_object('record', row_to_json(NEW)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    )
  );
  RETURN NEW;
END;
$function$;

ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS shopify_sync_error text,
  ADD COLUMN IF NOT EXISTS shopify_sync_attempts integer NOT NULL DEFAULT 0;
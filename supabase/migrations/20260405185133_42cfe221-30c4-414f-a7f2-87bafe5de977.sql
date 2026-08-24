
-- Enable pg_net for async HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function that calls the push-discount-code edge function
CREATE OR REPLACE FUNCTION public.notify_push_discount_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://lhzqnkrjqaebcfxcmlgd.supabase.co/functions/v1/push-discount-code',
    body := jsonb_build_object('record', row_to_json(NEW)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );
  RETURN NEW;
END;
$$;

-- Trigger on discount_codes for INSERT and UPDATE
CREATE TRIGGER on_discount_code_change
  AFTER INSERT OR UPDATE ON public.discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_push_discount_code();

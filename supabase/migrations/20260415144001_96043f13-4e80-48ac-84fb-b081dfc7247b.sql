-- Add last_synced_at column
ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- BEFORE DELETE trigger to push delete to Shopify
CREATE OR REPLACE FUNCTION public.handle_discount_code_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://lhzqnkrjqaebcfxcmlgd.supabase.co/functions/v1/push-discount-code',
    body := jsonb_build_object(
      'event', 'DELETE',
      'old_record', row_to_json(OLD)
    ),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  RETURN OLD;
END;
$function$;

CREATE TRIGGER before_discount_code_delete
BEFORE DELETE ON public.discount_codes
FOR EACH ROW
EXECUTE FUNCTION public.handle_discount_code_delete();
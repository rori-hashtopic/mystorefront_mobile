-- Auto-remove creator waitlist rows once they've signed up or been rejected
CREATE OR REPLACE FUNCTION public.cleanup_creator_waitlist_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('account_created', 'not_accepting') THEN
    DELETE FROM public.creator_waitlist WHERE id = NEW.id;
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_creator_waitlist ON public.creator_waitlist;
CREATE TRIGGER trg_cleanup_creator_waitlist
AFTER UPDATE OF status ON public.creator_waitlist
FOR EACH ROW
WHEN (NEW.status IN ('account_created', 'not_accepting'))
EXECUTE FUNCTION public.cleanup_creator_waitlist_on_status_change();

-- Backfill: remove any existing rows that already match
DELETE FROM public.creator_waitlist
WHERE status IN ('account_created', 'not_accepting');
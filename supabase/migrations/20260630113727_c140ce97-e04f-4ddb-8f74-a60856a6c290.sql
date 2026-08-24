
CREATE OR REPLACE FUNCTION public.sync_paid_collab_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_id uuid;
BEGIN
  IF NEW.creator_ids IS NULL THEN
    RETURN NEW;
  END IF;

  FOREACH c_id IN ARRAY NEW.creator_ids LOOP
    INSERT INTO public.paid_collab_participants (collab_id, creator_id, status)
    VALUES (NEW.id, c_id, 'pending')
    ON CONFLICT (collab_id, creator_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_paid_collab_participants ON public.paid_collabs;
CREATE TRIGGER trg_sync_paid_collab_participants
AFTER INSERT OR UPDATE OF creator_ids ON public.paid_collabs
FOR EACH ROW EXECUTE FUNCTION public.sync_paid_collab_participants();

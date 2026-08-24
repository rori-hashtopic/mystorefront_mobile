
CREATE OR REPLACE FUNCTION public.increment_link_clicks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE links SET clicks = COALESCE(clicks, 0) + 1 WHERE id = NEW.link_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_outbound_click_increment
  AFTER INSERT ON public.outbound_clicks
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_link_clicks();

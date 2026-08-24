-- Remove the old overly permissive policy if it still exists (may fail silently if already removed)
DROP POLICY IF EXISTS "Anyone can insert outbound clicks" ON public.outbound_clicks;
-- Update the outbound_clicks RLS policy to require either authenticated user or valid anonymous session
DROP POLICY IF EXISTS "Anyone can insert outbound clicks" ON public.outbound_clicks;

CREATE POLICY "Authenticated or validated anonymous clicks"
ON public.outbound_clicks
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  OR (
    anonymous_session_id IS NOT NULL 
    AND anonymous_session_id <> ''
    AND length(anonymous_session_id) = 36  -- UUID format validation
  )
);
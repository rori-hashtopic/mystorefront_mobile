
-- Drop the overly permissive INSERT policy
DROP POLICY "Allow insert for tracked clicks" ON public.affiliate_clicks;

-- Replace with validated insert: must be authenticated or have a valid anonymous session
CREATE POLICY "Authenticated or validated anonymous affiliate clicks"
  ON public.affiliate_clicks FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL) 
    OR (anonymous_session_id IS NOT NULL AND anonymous_session_id <> '' AND length(anonymous_session_id) = 36)
  );

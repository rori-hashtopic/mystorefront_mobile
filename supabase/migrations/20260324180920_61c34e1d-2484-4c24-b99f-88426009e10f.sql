
-- Fix 1: Remove overly permissive public policy on instagram_mentions
DROP POLICY IF EXISTS "Public read for mentions" ON public.instagram_mentions;

-- Add proper scoped policies
CREATE POLICY "Creators can view own mentions"
ON public.instagram_mentions FOR SELECT
USING (creator_id = auth.uid());

CREATE POLICY "Brands can view mentions"
ON public.instagram_mentions FOR SELECT
USING (has_role(auth.uid(), 'brand'::app_role));

CREATE POLICY "Admins can view all mentions"
ON public.instagram_mentions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

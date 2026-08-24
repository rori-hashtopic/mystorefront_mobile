
-- Drop the overly permissive brand policy
DROP POLICY IF EXISTS "Brands can view creator profiles" ON public.profiles;

-- Re-create with proper row filtering: only discoverable creators
CREATE POLICY "Brands can view discoverable creator profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_discoverable = true
  AND username IS NOT NULL
  AND has_role(auth.uid(), 'brand'::app_role)
);

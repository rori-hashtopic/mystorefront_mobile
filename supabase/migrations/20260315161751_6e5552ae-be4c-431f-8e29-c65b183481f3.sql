-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view discoverable creator profiles" ON public.profiles;

-- Create a new policy for authenticated users to view discoverable profiles (all columns)
CREATE POLICY "Authenticated can view discoverable creator profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (username IS NOT NULL AND is_discoverable = true);

-- Create a secure view for anonymous/public access without email
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  display_name,
  username,
  bio,
  photo_url,
  cover_image_url,
  tier,
  niche_tags,
  location_tags,
  is_discoverable,
  instagram_connected,
  tiktok_connected,
  created_at
FROM public.profiles
WHERE username IS NOT NULL AND is_discoverable = true;

-- Grant anon access to the view
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;
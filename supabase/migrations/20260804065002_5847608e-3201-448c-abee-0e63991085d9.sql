CREATE OR REPLACE FUNCTION public.get_public_brand_logos()
RETURNS TABLE (name text, logo_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.name, COALESCE(NULLIF(b.logo_upload_url, ''), b.logo_url) AS logo_url
  FROM public.brand_accounts b
  WHERE b.status = 'approved'
    AND COALESCE(NULLIF(b.logo_upload_url, ''), b.logo_url) IS NOT NULL
    AND b.name NOT IN ('Captured By Mel', 'HashTopic')
  ORDER BY b.name
$$;

REVOKE ALL ON FUNCTION public.get_public_brand_logos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_brand_logos() TO anon, authenticated;
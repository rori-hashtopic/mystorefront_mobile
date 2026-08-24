-- Revoke full table SELECT from authenticated, then re-grant only safe columns
REVOKE SELECT ON public.brand_accounts FROM authenticated;

GRANT SELECT (
  id, name, slug, status, category, description,
  website_url, instagram_url, tiktok_url,
  logo_url, logo_upload_url, hero_image_url,
  is_partner, is_trending,
  created_at, updated_at
) ON public.brand_accounts TO authenticated;

-- Owners and admins still need full access via RLS + service_role
-- service_role already has full access, but let's ensure owner queries work
-- by creating a security definer function for sensitive brand fields

CREATE OR REPLACE FUNCTION public.get_own_brand_account(p_user_id uuid)
RETURNS SETOF brand_accounts
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM brand_accounts WHERE owner_user_id = p_user_id LIMIT 1;
$$;
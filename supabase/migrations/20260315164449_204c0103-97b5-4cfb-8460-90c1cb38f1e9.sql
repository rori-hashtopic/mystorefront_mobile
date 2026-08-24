
-- Revoke full SELECT, then grant only safe columns to anon and authenticated
REVOKE SELECT ON public.links FROM anon;
REVOKE SELECT ON public.links FROM authenticated;

-- Grant only non-financial columns to anon (for public shop pages)
GRANT SELECT (id, user_id, product_title, product_image_url, affiliate_url, retailer, description, content_url, product_id, created_at, updated_at) ON public.links TO anon;

-- Grant only non-financial columns to authenticated by default
GRANT SELECT (id, user_id, product_title, product_image_url, affiliate_url, retailer, description, content_url, product_id, created_at, updated_at) ON public.links TO authenticated;

-- Grant financial columns only to the link owner via a security definer function
-- Also grant INSERT/UPDATE/DELETE back to authenticated (these were not revoked but ensuring consistency)
GRANT INSERT, UPDATE, DELETE ON public.links TO authenticated;

-- Create a function for creators to read their own full link data including financial columns
CREATE OR REPLACE FUNCTION public.get_own_links(p_user_id uuid)
RETURNS SETOF links
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT * FROM links WHERE user_id = p_user_id ORDER BY created_at DESC;
$$;

-- Create a function for admins to read all links
CREATE OR REPLACE FUNCTION public.get_all_links_admin()
RETURNS SETOF links
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT * FROM links
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY created_at DESC;
$$;

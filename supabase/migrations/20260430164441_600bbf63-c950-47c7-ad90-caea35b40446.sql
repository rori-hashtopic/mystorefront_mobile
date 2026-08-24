CREATE OR REPLACE FUNCTION public.get_public_creator_links(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  product_title text,
  product_image_url text,
  affiliate_url text,
  retailer text,
  description text,
  sort_order integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, product_title, product_image_url, affiliate_url, retailer, description, sort_order, created_at
  FROM public.links
  WHERE user_id = p_user_id
    AND is_deleted = false
  ORDER BY COALESCE(sort_order, 0) ASC, created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_creator_links(uuid) TO anon, authenticated;
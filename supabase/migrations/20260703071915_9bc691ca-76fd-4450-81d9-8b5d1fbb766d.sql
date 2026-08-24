
-- 1. brand_accounts: hide secret columns from anon/authenticated. Owner reads via get_own_brand_account() SECURITY DEFINER RPC.
REVOKE SELECT (mystorefront_api_key, webhook_secret) ON public.brand_accounts FROM anon, authenticated;

-- 2. instagram_connections: hide access token from anon/authenticated. Edge functions use service_role.
REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM anon, authenticated;

-- 3. tiktok_connections: hide tokens from anon/authenticated.
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON public.tiktok_connections FROM anon, authenticated;

-- 4. links: hide earnings/order/click stats from public. Create a SECURITY DEFINER RPC for owner access.
REVOKE SELECT (earned, orders, clicks) ON public.links FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_own_links_full(p_include_archived boolean DEFAULT false)
 RETURNS SETOF public.links
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT *
  FROM public.links
  WHERE user_id = auth.uid()
    AND (p_include_archived OR is_deleted = false)
  ORDER BY COALESCE(sort_order, 0) ASC, created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_own_links_full(boolean) TO authenticated;

-- Upgrade existing get_own_links to SECURITY DEFINER so column REVOKE does not break it.
CREATE OR REPLACE FUNCTION public.get_own_links(p_user_id uuid)
 RETURNS SETOF public.links
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT *
  FROM public.links
  WHERE user_id = auth.uid()
    AND is_deleted = false;
$$;

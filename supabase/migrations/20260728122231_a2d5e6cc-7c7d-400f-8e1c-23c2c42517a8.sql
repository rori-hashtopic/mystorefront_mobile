-- Helper: does the calling brand user have a real relationship with this creator?
CREATE OR REPLACE FUNCTION public.brand_has_creator_relationship(p_creator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.brand_accounts ba ON ba.id = c.brand_id
    WHERE c.creator_id = p_creator_id AND ba.owner_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.paid_collab_participants pcp
    JOIN public.paid_collabs pc ON pc.id = pcp.collab_id
    JOIN public.brand_accounts ba ON ba.id = pc.brand_id
    WHERE pcp.creator_id = p_creator_id AND ba.owner_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.gift_requests gr
    JOIN public.brand_accounts ba ON ba.id = gr.brand_id
    WHERE gr.creator_id = p_creator_id AND ba.owner_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.mention_requests mr
    JOIN public.brand_accounts ba ON ba.id = mr.brand_id
    WHERE mr.creator_id = p_creator_id AND ba.owner_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.affiliate_orders ao
    JOIN public.brand_accounts ba ON ba.id = ao.brand_id
    WHERE ao.creator_id = p_creator_id AND ba.owner_user_id = auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION public.brand_has_creator_relationship(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.brand_has_creator_relationship(uuid) TO authenticated, service_role;

-- Instagram: brands only see creators who opted into discovery, or creators they work with
DROP POLICY IF EXISTS "Brands can view connected creator data" ON public.instagram_connections;
CREATE POLICY "Brands can view connected creator data"
ON public.instagram_connections
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'brand'::app_role)
  AND status = 'connected'::instagram_connection_status
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = instagram_connections.creator_id AND p.is_discoverable = true
    )
    OR public.brand_has_creator_relationship(instagram_connections.creator_id)
  )
);

-- TikTok: same scoping
DROP POLICY IF EXISTS "Brands can view connected TikTok data" ON public.tiktok_connections;
CREATE POLICY "Brands can view connected TikTok data"
ON public.tiktok_connections
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'brand'::app_role)
  AND status = 'connected'::tiktok_connection_status
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = tiktok_connections.creator_id AND p.is_discoverable = true
    )
    OR public.brand_has_creator_relationship(tiktok_connections.creator_id)
  )
);

-- Re-assert column-level revokes on secret columns (idempotent hardening)
REVOKE SELECT (mystorefront_api_key, webhook_secret) ON public.brand_accounts FROM authenticated, anon;
REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM authenticated, anon;
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON public.tiktok_connections FROM authenticated, anon;
REVOKE SELECT (email) ON public.profiles FROM authenticated, anon;
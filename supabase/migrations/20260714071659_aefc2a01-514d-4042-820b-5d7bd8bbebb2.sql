
-- 1) brand_accounts secret columns
REVOKE SELECT (webhook_secret, mystorefront_api_key) ON public.brand_accounts FROM anon, authenticated;

-- 2) brand_creator_invites token hash
REVOKE SELECT (token_hash) ON public.brand_creator_invites FROM anon, authenticated;

-- 3) brand_shopify_settings API key
REVOKE SELECT (mystorefront_api_key) ON public.brand_shopify_settings FROM anon, authenticated;

-- 4) brand_woocommerce_settings API key
REVOKE SELECT (woocommerce_api_key) ON public.brand_woocommerce_settings FROM anon, authenticated;

-- 5) instagram/tiktok tokens
REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM anon, authenticated;
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON public.tiktok_connections FROM anon, authenticated;

-- 6) payout_accounts merchant key
REVOKE SELECT (merchant_key_encrypted) ON public.payout_accounts FROM anon, authenticated;

-- 7) links: restrict public policy to non-deleted rows and revoke sensitive stats columns from anon/authenticated.
-- Owners still access full data via the get_own_links_full SECURITY DEFINER RPC, which bypasses column grants.
DROP POLICY IF EXISTS "Public can view links for shop pages" ON public.links;
CREATE POLICY "Public can view non-deleted links"
  ON public.links
  FOR SELECT
  USING (is_deleted = false);

REVOKE SELECT (earned, orders, clicks) ON public.links FROM anon, authenticated;

-- 8) user_roles UPDATE: enforce role='shopper' in USING as well as WITH CHECK
DROP POLICY IF EXISTS "Users can only update their own role to shopper" ON public.user_roles;
CREATE POLICY "Users can only update their own role to shopper"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND role = 'shopper'::app_role)
  WITH CHECK (auth.uid() = user_id AND role = 'shopper'::app_role);

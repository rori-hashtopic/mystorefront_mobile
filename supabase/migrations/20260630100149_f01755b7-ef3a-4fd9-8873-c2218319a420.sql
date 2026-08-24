
-- 1 & 2: Revoke encrypted token columns from authenticated
REVOKE SELECT (access_token_encrypted) ON public.instagram_connections FROM authenticated;
REVOKE SELECT (access_token_encrypted, refresh_token_encrypted) ON public.tiktok_connections FROM authenticated;

-- 3: Revoke Shopify api key column
REVOKE SELECT (mystorefront_api_key) ON public.brand_shopify_settings FROM authenticated;

-- 4: Allow invited creators to read their paid_collabs
CREATE POLICY "Invited creators can view their paid collabs"
ON public.paid_collabs
FOR SELECT
TO authenticated
USING (auth.uid() = ANY(creator_ids));

-- 5: Restrict creator-role enumeration on user_roles to brand role only
DROP POLICY IF EXISTS "Authenticated can view creator roles" ON public.user_roles;
CREATE POLICY "Brands can view creator roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (role = 'creator'::app_role AND public.has_role(auth.uid(), 'brand'::app_role));

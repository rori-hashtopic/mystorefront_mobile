
-- 1. Revoke API key column read access on brand_shopify_settings
REVOKE SELECT (mystorefront_api_key) ON public.brand_shopify_settings FROM authenticated, anon;

-- 2. Revoke referred_email column from authenticated on creator_referrals
REVOKE SELECT (referred_email) ON public.creator_referrals FROM authenticated, anon;

-- 3. Tighten gift_requests brand access: split ALL policy into write-only ALL and SELECT with status filter
DROP POLICY IF EXISTS "Brand owners can manage their gift requests" ON public.gift_requests;

CREATE POLICY "Brand owners can write their gift requests"
ON public.gift_requests
FOR INSERT
TO authenticated
WITH CHECK (brand_id IN (SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid()));

CREATE POLICY "Brand owners can update their gift requests"
ON public.gift_requests
FOR UPDATE
TO authenticated
USING (brand_id IN (SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid()))
WITH CHECK (brand_id IN (SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid()));

CREATE POLICY "Brand owners can delete their gift requests"
ON public.gift_requests
FOR DELETE
TO authenticated
USING (brand_id IN (SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid()));

CREATE POLICY "Brand owners can view active gift requests"
ON public.gift_requests
FOR SELECT
TO authenticated
USING (
  brand_id IN (SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid())
  AND status IN ('approved','accepted','shipped','delivered','completed','fulfilled')
);

-- 4. Add restrictive policy to ensure self-insert on user_roles is only ever 'shopper' (defense in depth)
CREATE POLICY "Restrict self-assigned roles to shopper"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (auth.uid() = user_id AND role = 'shopper'::app_role)
);

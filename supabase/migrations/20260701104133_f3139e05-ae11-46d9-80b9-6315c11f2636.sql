
REVOKE SELECT (mystorefront_api_key) ON public.brand_shopify_settings FROM authenticated, anon;
REVOKE SELECT (referred_email) ON public.creator_referrals FROM authenticated, anon;

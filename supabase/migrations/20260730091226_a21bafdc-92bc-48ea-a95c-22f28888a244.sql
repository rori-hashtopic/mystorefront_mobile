REVOKE SELECT ON public.brand_shopify_settings FROM authenticated, anon;
GRANT SELECT (brand_id, shop_domain, plugin_base_url, is_verified, created_at, updated_at) ON public.brand_shopify_settings TO authenticated;

REVOKE SELECT ON public.payout_accounts FROM authenticated, anon;
GRANT SELECT (id, user_id, type, status, bank_name, account_holder, account_number_masked, account_type, branch_code, merchant_id, passphrase_set, signature_enabled, created_at, updated_at) ON public.payout_accounts TO authenticated;

GRANT ALL ON public.brand_shopify_settings TO service_role;
GRANT ALL ON public.payout_accounts TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS idx_discount_codes_shopify_price_rule_id
ON public.discount_codes (shopify_price_rule_id)
WHERE shopify_price_rule_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.brand_shopify_settings (
  brand_id UUID PRIMARY KEY REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  plugin_base_url TEXT NOT NULL DEFAULT 'https://mystorefront-postback.onrender.com',
  mystorefront_api_key TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_shopify_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners manage their Shopify settings"
  ON public.brand_shopify_settings FOR ALL
  USING (brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid()))
  WITH CHECK (brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid()));

ALTER TABLE public.discount_codes ADD COLUMN IF NOT EXISTS shopify_price_rule_id TEXT;
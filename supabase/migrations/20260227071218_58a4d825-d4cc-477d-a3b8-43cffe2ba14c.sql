
-- Table to store tracked affiliate clicks with unique click_ids
CREATE TABLE public.affiliate_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  click_id text NOT NULL UNIQUE,
  link_id uuid NOT NULL REFERENCES public.links(id),
  creator_id uuid NOT NULL,
  brand_id uuid REFERENCES public.brand_accounts(id),
  viewer_user_id uuid,
  anonymous_session_id text,
  source_page text NOT NULL DEFAULT 'shop',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table to store confirmed affiliate orders from brand postbacks
CREATE TABLE public.affiliate_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  click_id text NOT NULL REFERENCES public.affiliate_clicks(click_id),
  brand_id uuid NOT NULL REFERENCES public.brand_accounts(id),
  creator_id uuid NOT NULL,
  order_id text NOT NULL,
  order_total numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, order_id)
);

-- Add webhook_secret to brand_accounts for postback authentication
ALTER TABLE public.brand_accounts ADD COLUMN IF NOT EXISTS webhook_secret text;

-- Index for fast click_id lookups
CREATE INDEX idx_affiliate_clicks_click_id ON public.affiliate_clicks(click_id);
CREATE INDEX idx_affiliate_orders_creator_id ON public.affiliate_orders(creator_id);
CREATE INDEX idx_affiliate_orders_brand_id ON public.affiliate_orders(brand_id);
CREATE INDEX idx_affiliate_orders_status ON public.affiliate_orders(status);

-- RLS for affiliate_clicks
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (tracked via storefront, may be anonymous)
CREATE POLICY "Allow insert for tracked clicks"
  ON public.affiliate_clicks FOR INSERT
  WITH CHECK (true);

-- Creators can view clicks attributed to them
CREATE POLICY "Creators can view their clicks"
  ON public.affiliate_clicks FOR SELECT
  USING (creator_id = auth.uid());

-- Brand owners can view clicks for their brand
CREATE POLICY "Brand owners can view their clicks"
  ON public.affiliate_clicks FOR SELECT
  USING (brand_id IN (
    SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid()
  ));

-- Admins can view all clicks
CREATE POLICY "Admins can view all affiliate clicks"
  ON public.affiliate_clicks FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS for affiliate_orders
ALTER TABLE public.affiliate_orders ENABLE ROW LEVEL SECURITY;

-- Creators can view orders attributed to them
CREATE POLICY "Creators can view their orders"
  ON public.affiliate_orders FOR SELECT
  USING (creator_id = auth.uid());

-- Brand owners can view their orders
CREATE POLICY "Brand owners can view their orders"
  ON public.affiliate_orders FOR SELECT
  USING (brand_id IN (
    SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid()
  ));

-- Admins can view all orders
CREATE POLICY "Admins can view all affiliate orders"
  ON public.affiliate_orders FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Service role inserts orders (via edge function), no user INSERT policy needed

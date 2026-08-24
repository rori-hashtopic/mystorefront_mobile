
-- Gift Campaigns table
CREATE TABLE public.gift_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  product_name text NOT NULL,
  product_image_url text,
  product_value numeric(10,2),
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners can manage their campaigns"
  ON public.gift_campaigns FOR ALL
  USING (brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid()));

CREATE POLICY "Admins can view all campaigns"
  ON public.gift_campaigns FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_gift_campaigns_updated_at
  BEFORE UPDATE ON public.gift_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Gift Requests table
CREATE TABLE public.gift_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.gift_campaigns(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  shipping_address text,
  tracking_number text,
  notes text,
  creator_post_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners can manage their gift requests"
  ON public.gift_requests FOR ALL
  USING (brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid()));

CREATE POLICY "Creators can view their own gift requests"
  ON public.gift_requests FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "Creators can update their own gift requests"
  ON public.gift_requests FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "Admins can view all gift requests"
  ON public.gift_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_gift_requests_updated_at
  BEFORE UPDATE ON public.gift_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

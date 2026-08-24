
-- Commission settings per brand (platform_fee_percent is what platform keeps, creator_payout_percent is what creator gets)
CREATE TABLE public.brand_commission_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  platform_fee_percent numeric NOT NULL DEFAULT 5,
  creator_payout_percent numeric NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id)
);

-- Brand payments (EFT proof of payment)
CREATE TYPE public.brand_payment_status AS ENUM ('pending', 'under_review', 'verified', 'rejected');

CREATE TABLE public.brand_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'ZAR',
  period_start date NOT NULL,
  period_end date NOT NULL,
  proof_of_payment_url text,
  notes text,
  status brand_payment_status NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for brand_commission_settings
ALTER TABLE public.brand_commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all commission settings"
  ON public.brand_commission_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Brand owners can view their commission settings"
  ON public.brand_commission_settings FOR SELECT
  USING (brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid()));

-- RLS for brand_payments
ALTER TABLE public.brand_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all brand payments"
  ON public.brand_payments FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Brand owners can view their payments"
  ON public.brand_payments FOR SELECT
  USING (brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid()));

CREATE POLICY "Brand owners can insert their payments"
  ON public.brand_payments FOR INSERT
  WITH CHECK (brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid()));

CREATE POLICY "Brand owners can update pending payments"
  ON public.brand_payments FOR UPDATE
  USING (brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid()) AND status = 'pending');

-- Storage bucket for proof of payment
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);

-- Storage RLS: brand owners can upload to their folder
CREATE POLICY "Brand owners can upload payment proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Brand owners can view their payment proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view all payment proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at
CREATE TRIGGER update_brand_commission_settings_updated_at
  BEFORE UPDATE ON public.brand_commission_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_payments_updated_at
  BEFORE UPDATE ON public.brand_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

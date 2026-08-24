
-- Create discount_codes table
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brand_accounts(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric(10,2) NOT NULL,
  minimum_order_value numeric(10,2),
  expiry_date date,
  usage_limit integer,
  usage_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, code)
);

-- Enable RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Brand owners can manage their own codes
CREATE POLICY "Brand owners can manage their discount codes"
ON public.discount_codes
FOR ALL
USING (brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid()));

-- Creators can view active codes assigned to them
CREATE POLICY "Creators can view their assigned active codes"
ON public.discount_codes
FOR SELECT
USING (creator_id = auth.uid() AND is_active = true);

-- Admins can view all codes
CREATE POLICY "Admins can view all discount codes"
ON public.discount_codes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_discount_codes_updated_at
BEFORE UPDATE ON public.discount_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

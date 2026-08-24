ALTER TABLE public.affiliate_orders
ADD COLUMN IF NOT EXISTS original_order_total numeric,
ADD COLUMN IF NOT EXISTS original_commission_amount numeric;

UPDATE public.affiliate_orders
SET
  original_order_total = COALESCE(original_order_total, order_total),
  original_commission_amount = COALESCE(original_commission_amount, commission_amount)
WHERE original_order_total IS NULL
   OR original_commission_amount IS NULL;

ALTER TABLE public.affiliate_orders
ALTER COLUMN original_order_total SET NOT NULL,
ALTER COLUMN original_order_total SET DEFAULT 0,
ALTER COLUMN original_commission_amount SET NOT NULL,
ALTER COLUMN original_commission_amount SET DEFAULT 0;

CREATE OR REPLACE FUNCTION public.prevent_affiliate_order_original_value_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.original_order_total IS NOT NULL
     AND OLD.original_commission_amount IS NOT NULL
     AND (
       NEW.original_order_total IS DISTINCT FROM OLD.original_order_total
       OR NEW.original_commission_amount IS DISTINCT FROM OLD.original_commission_amount
     ) THEN
    RAISE EXCEPTION 'Original affiliate order values are immutable once set';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_affiliate_order_original_value_changes ON public.affiliate_orders;
CREATE TRIGGER prevent_affiliate_order_original_value_changes
BEFORE UPDATE ON public.affiliate_orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_affiliate_order_original_value_changes();

CREATE TABLE IF NOT EXISTS public.affiliate_refunds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_order_id uuid REFERENCES public.affiliate_orders(id),
  brand_id uuid,
  creator_id uuid,
  link_id uuid,
  click_id text NOT NULL,
  order_id text NOT NULL,
  refund_id text NOT NULL UNIQUE,
  order_total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  refund_amount_abs numeric NOT NULL DEFAULT 0,
  refund_ratio numeric NOT NULL DEFAULT 0,
  commission_clawback_amount numeric NOT NULL DEFAULT 0,
  refund_reference text,
  refund_note text,
  items_count integer,
  line_items jsonb,
  metadata jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_refunds_order_id ON public.affiliate_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_refunds_click_id ON public.affiliate_refunds(click_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_refunds_brand_id ON public.affiliate_refunds(brand_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_refunds_creator_id ON public.affiliate_refunds(creator_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_refunds_affiliate_order_id ON public.affiliate_refunds(affiliate_order_id);

ALTER TABLE public.affiliate_refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all affiliate refunds" ON public.affiliate_refunds;
CREATE POLICY "Admins can view all affiliate refunds"
ON public.affiliate_refunds
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Brand owners can view their affiliate refunds" ON public.affiliate_refunds;
CREATE POLICY "Brand owners can view their affiliate refunds"
ON public.affiliate_refunds
FOR SELECT
USING (brand_id IN (
  SELECT public.brand_accounts.id
  FROM public.brand_accounts
  WHERE public.brand_accounts.owner_user_id = auth.uid()
));

DROP POLICY IF EXISTS "Creators can view their affiliate refunds" ON public.affiliate_refunds;
CREATE POLICY "Creators can view their affiliate refunds"
ON public.affiliate_refunds
FOR SELECT
USING (creator_id = auth.uid());
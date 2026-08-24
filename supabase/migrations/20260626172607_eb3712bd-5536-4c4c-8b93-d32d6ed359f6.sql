ALTER TABLE public.paid_collabs
  ADD COLUMN IF NOT EXISTS request_shipping_address boolean NOT NULL DEFAULT true;
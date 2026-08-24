ALTER TABLE public.paid_collabs
  ADD COLUMN IF NOT EXISTS gift_campaign_id uuid REFERENCES public.gift_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS product_value numeric,
  ADD COLUMN IF NOT EXISTS product_image_url text;
ALTER TABLE public.instagram_connections
  ADD COLUMN IF NOT EXISTS reach integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impressions integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_rate numeric DEFAULT 0;
-- Add cover_image_url to profiles for creator hero images
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Add website_url to brands for the secondary link
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS website_url TEXT;
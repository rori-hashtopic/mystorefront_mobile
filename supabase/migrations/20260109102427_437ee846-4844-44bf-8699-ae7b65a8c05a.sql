-- Add new columns to brand_accounts
ALTER TABLE public.brand_accounts
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
ADD COLUMN IF NOT EXISTS logo_upload_url TEXT,
ADD COLUMN IF NOT EXISTS commission_percent NUMERIC,
ADD COLUMN IF NOT EXISTS tracking_status TEXT DEFAULT 'not_connected',
ADD COLUMN IF NOT EXISTS last_postback_at TIMESTAMP WITH TIME ZONE;

-- Create storage bucket for brand logos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('brand-logos', 'brand-logos', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for brand logos
CREATE POLICY "Brand logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-logos');

CREATE POLICY "Brand owners can upload their logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-logos' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.brand_accounts 
    WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Brand owners can update their logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'brand-logos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.brand_accounts 
    WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Brand owners can delete their logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brand-logos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.brand_accounts 
    WHERE owner_user_id = auth.uid()
  )
);

-- Update RLS policy for brand owners to update their account
DROP POLICY IF EXISTS "Brand owners can update their own account" ON public.brand_accounts;
CREATE POLICY "Brand owners can update their own account"
ON public.brand_accounts FOR UPDATE
USING (owner_user_id = auth.uid());
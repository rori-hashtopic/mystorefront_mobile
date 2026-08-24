
-- Add product_images array column
ALTER TABLE public.gift_campaigns
ADD COLUMN product_images text[] DEFAULT '{}';

-- Migrate existing single image URLs into the array
UPDATE public.gift_campaigns
SET product_images = ARRAY[product_image_url]
WHERE product_image_url IS NOT NULL AND product_image_url != '';

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('gift-campaign-images', 'gift-campaign-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Gift campaign images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'gift-campaign-images');

-- Brand owners can upload
CREATE POLICY "Brand owners can upload gift campaign images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'gift-campaign-images' AND auth.uid() IS NOT NULL);

-- Brand owners can delete their uploads
CREATE POLICY "Users can delete their gift campaign images"
ON storage.objects FOR DELETE
USING (bucket_id = 'gift-campaign-images' AND auth.uid() IS NOT NULL);

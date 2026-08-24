-- Step 1: Add missing columns to brand_accounts for explore page display
ALTER TABLE public.brand_accounts 
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS hero_image_url text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS is_partner boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_trending boolean DEFAULT false;

-- Step 2: Create function to generate URL-friendly slugs
CREATE OR REPLACE FUNCTION public.generate_brand_slug(brand_name text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN lower(regexp_replace(brand_name, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$;

-- Step 3: Create sync trigger function
CREATE OR REPLACE FUNCTION public.sync_approved_brand_to_brands()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO brands (
      id, name, slug, logo_url, hero_image_url, website_url, 
      description, commission_percent, is_partner, is_trending
    )
    VALUES (
      NEW.id,
      NEW.name,
      COALESCE(NEW.slug, generate_brand_slug(NEW.name)),
      COALESCE(NEW.logo_url, NEW.logo_upload_url),
      NEW.hero_image_url,
      NEW.website_url,
      NEW.description,
      NEW.commission_percent,
      COALESCE(NEW.is_partner, false),
      COALESCE(NEW.is_trending, false)
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      slug = EXCLUDED.slug,
      logo_url = EXCLUDED.logo_url,
      hero_image_url = EXCLUDED.hero_image_url,
      website_url = EXCLUDED.website_url,
      description = EXCLUDED.description,
      commission_percent = EXCLUDED.commission_percent,
      is_partner = EXCLUDED.is_partner,
      is_trending = EXCLUDED.is_trending;
  ELSIF NEW.status IN ('rejected', 'suspended') AND OLD.status = 'approved' THEN
    DELETE FROM brands WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 4: Create the trigger
CREATE TRIGGER on_brand_account_status_change
AFTER INSERT OR UPDATE OF status ON public.brand_accounts
FOR EACH ROW
EXECUTE FUNCTION public.sync_approved_brand_to_brands();

-- Step 5: Backfill existing approved brands (including Country Roads)
INSERT INTO public.brands (id, name, slug, logo_url, website_url, commission_percent, is_partner, is_trending)
SELECT 
  id, 
  name, 
  generate_brand_slug(name),
  COALESCE(logo_url, logo_upload_url),
  website_url,
  commission_percent,
  false,
  false
FROM public.brand_accounts
WHERE status = 'approved'
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.resolve_brand_id_for_link(p_link_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_retailer text;
  v_affiliate_url text;
  v_brand_id uuid;
  v_link_domain text;
BEGIN
  -- Get link details
  SELECT retailer, affiliate_url INTO v_retailer, v_affiliate_url
  FROM links WHERE id = p_link_id;

  IF v_retailer IS NOT NULL THEN
    -- Try 1: Match retailer name against brands table
    SELECT id INTO v_brand_id
    FROM brands
    WHERE lower(trim(name)) = lower(trim(v_retailer))
    LIMIT 1;

    -- Try 2: Match retailer name against brand_accounts table
    IF v_brand_id IS NULL THEN
      SELECT id INTO v_brand_id
      FROM brand_accounts
      WHERE lower(trim(name)) = lower(trim(v_retailer))
      LIMIT 1;
    END IF;
  END IF;

  -- Try 3: URL-based fallback
  IF v_brand_id IS NULL AND v_affiliate_url IS NOT NULL THEN
    BEGIN
      v_link_domain := regexp_replace(
        regexp_replace(v_affiliate_url, '^https?://(www\.)?', ''),
        '/.*$', ''
      );
      
      SELECT id INTO v_brand_id
      FROM brand_accounts
      WHERE website_url IS NOT NULL
        AND regexp_replace(
              regexp_replace(website_url, '^https?://(www\.)?', ''),
              '/.*$', ''
            ) = v_link_domain
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      -- Skip on parse error
      NULL;
    END;
  END IF;

  RETURN v_brand_id;
END;
$$;

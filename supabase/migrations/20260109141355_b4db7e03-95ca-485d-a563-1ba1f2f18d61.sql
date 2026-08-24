-- Update handle_new_user function to sanitize user-controlled input (display_name)
-- This prevents potential injection of unexpected characters and limits length
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_display_name TEXT;
  raw_display_name TEXT;
BEGIN
  -- Get raw display name from metadata or fallback to email prefix
  raw_display_name := COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Sanitize: remove dangerous characters, limit to 100 chars
  -- Allow alphanumeric, spaces, hyphens, underscores, and common Unicode letters
  safe_display_name := substring(
    regexp_replace(raw_display_name, '[^\w\s\-]', '', 'g'),
    1,
    100
  );
  
  -- Ensure we have at least something (fallback to email prefix if sanitized is empty)
  IF safe_display_name IS NULL OR length(trim(safe_display_name)) = 0 THEN
    safe_display_name := split_part(NEW.email, '@', 1);
  END IF;
  
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, safe_display_name);
  
  RETURN NEW;
END;
$$;
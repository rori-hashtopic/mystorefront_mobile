
CREATE OR REPLACE FUNCTION public.admin_create_brand(
  p_name text,
  p_owner_user_id uuid,
  p_website_url text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_commission_percent numeric DEFAULT NULL,
  p_status text DEFAULT 'approved'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can create brand accounts';
  END IF;

  INSERT INTO public.brand_accounts (
    name, owner_user_id, website_url, description, category, commission_percent, status
  ) VALUES (
    p_name, p_owner_user_id, p_website_url, p_description, p_category, p_commission_percent, p_status::brand_account_status
  )
  RETURNING row_to_json(brand_accounts.*) INTO v_result;

  RETURN v_result;
END;
$$;

-- Look up a brand's creator invite by the email address it was sent to.
-- Used by the brand-creator-invite edge function to detect duplicate active
-- invites and to surface invite status when a brand re-enters an address.

CREATE OR REPLACE FUNCTION public.get_brand_invite_by_email(
  p_brand_id uuid,
  p_email text
)
RETURNS TABLE(
  id uuid,
  status public.brand_invite_status,
  invited_name text,
  welcome_message text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone,
  email_sent_at timestamp with time zone,
  redeemed_by_user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    status,
    invited_name,
    welcome_message,
    expires_at,
    created_at,
    email_sent_at,
    redeemed_by_user_id
  FROM public.brand_creator_invites
  WHERE brand_id = p_brand_id
    AND invited_email = lower(p_email)
  ORDER BY created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_brand_invite_by_email(uuid, text) TO authenticated, service_role;

-- Speed up duplicate checks in the edge function.
CREATE INDEX IF NOT EXISTS idx_brand_creator_invites_brand_lower_email
  ON public.brand_creator_invites(brand_id, lower(invited_email));

-- The previous migration created get_brand_invite_by_email as SECURITY DEFINER.
-- Postgres defaults to granting EXECUTE to public, so we must explicitly revoke
-- it for anon and the public pseudo-role, then keep only authenticated/service_role.

REVOKE EXECUTE ON FUNCTION public.get_brand_invite_by_email(uuid, text) FROM anon, public;

-- Ensure the intended callers retain access.
GRANT EXECUTE ON FUNCTION public.get_brand_invite_by_email(uuid, text) TO authenticated, service_role;

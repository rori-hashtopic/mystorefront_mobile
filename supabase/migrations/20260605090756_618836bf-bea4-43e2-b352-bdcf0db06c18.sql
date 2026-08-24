REVOKE ALL ON FUNCTION public.admin_delete_brand(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_brand(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_brand(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.notify_brand_on_paid_collab_status_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_brand_on_paid_collab_status_change() FROM anon;
REVOKE ALL ON FUNCTION public.notify_brand_on_paid_collab_status_change() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.notify_brand_on_paid_collab_status_change() TO service_role;
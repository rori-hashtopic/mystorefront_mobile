REVOKE ALL ON FUNCTION public.resolve_creator_referrer(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_creator_referrer(text) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_creator_referrer(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_creator_referrer(text) TO service_role;

REVOKE ALL ON FUNCTION public.get_creator_referral_stats(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_creator_referral_stats(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_creator_referral_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_referral_stats(uuid) TO service_role;
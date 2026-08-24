-- Restrict access to PII column email on profiles
REVOKE SELECT (email) ON public.profiles FROM anon;
REVOKE SELECT (email) ON public.profiles FROM authenticated;

-- Restrict public exposure of per-link earnings to anonymous visitors
REVOKE SELECT (earned) ON public.links FROM anon;
CREATE TABLE public.creator_referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  application_id uuid NULL,
  referred_user_id uuid NULL,
  referred_email text NOT NULL,
  referred_name text NULL,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone NULL,
  account_created_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT creator_referrals_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'account_created')),
  CONSTRAINT creator_referrals_no_self_referral CHECK (referred_user_id IS NULL OR referred_user_id <> referrer_id)
);

CREATE UNIQUE INDEX creator_referrals_application_id_key
ON public.creator_referrals (application_id)
WHERE application_id IS NOT NULL;

CREATE UNIQUE INDEX creator_referrals_referrer_email_key
ON public.creator_referrals (referrer_id, lower(referred_email));

CREATE INDEX creator_referrals_referrer_id_idx ON public.creator_referrals (referrer_id);
CREATE INDEX creator_referrals_status_idx ON public.creator_referrals (status);

ALTER TABLE public.creator_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view their own referrals"
ON public.creator_referrals
FOR SELECT
USING (auth.uid() = referrer_id);

CREATE POLICY "Admins can manage all creator referrals"
ON public.creator_referrals
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_creator_referrals_updated_at
BEFORE UPDATE ON public.creator_referrals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.resolve_creator_referrer(p_ref text)
RETURNS TABLE(id uuid, display_name text, username text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.username
  FROM public.profiles p
  WHERE COALESCE(p.onboarding_completed, false) = true
    AND public.has_role(p.id, 'creator')
    AND (
      lower(p.username) = lower(trim(p_ref))
      OR p.id::text = trim(p_ref)
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_creator_referral_stats(p_user_id uuid)
RETURNS TABLE(pending_count integer, accepted_count integer, declined_count integer, account_created_count integer, total_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending')::integer AS pending_count,
    COUNT(*) FILTER (WHERE status IN ('accepted', 'account_created'))::integer AS accepted_count,
    COUNT(*) FILTER (WHERE status = 'declined')::integer AS declined_count,
    COUNT(*) FILTER (WHERE status = 'account_created')::integer AS account_created_count,
    COUNT(*)::integer AS total_count
  FROM public.creator_referrals
  WHERE referrer_id = p_user_id
    AND (auth.uid() = p_user_id OR public.has_role(auth.uid(), 'admin'));
$$;
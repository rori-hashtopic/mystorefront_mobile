DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'creator_waitlist_status') THEN
    CREATE TYPE public.creator_waitlist_status AS ENUM (
      'pending_review',
      'invite_sent',
      'account_created',
      'expired',
      'not_accepting'
    );
  END IF;
END $$;

ALTER TABLE public.creator_waitlist
  ADD COLUMN IF NOT EXISTS status public.creator_waitlist_status NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS last_invite_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS invite_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS invite_used_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS invited_user_id UUID,
  ADD COLUMN IF NOT EXISTS regret_email_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_creator_waitlist_status ON public.creator_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_creator_waitlist_invite_token_hash ON public.creator_waitlist(invite_token_hash) WHERE invite_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_creator_waitlist_invite_expires_at ON public.creator_waitlist(invite_expires_at) WHERE invite_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_creator_waitlist_email_lower ON public.creator_waitlist(lower(email));

DROP TRIGGER IF EXISTS update_creator_waitlist_updated_at ON public.creator_waitlist;
CREATE TRIGGER update_creator_waitlist_updated_at
BEFORE UPDATE ON public.creator_waitlist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.expire_creator_waitlist_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.creator_waitlist
  SET status = 'expired', updated_at = now()
  WHERE status = 'invite_sent'
    AND invite_used_at IS NULL
    AND invite_expires_at IS NOT NULL
    AND invite_expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_creator_waitlist_invite_by_hash(p_token_hash text)
RETURNS TABLE(
  id uuid,
  full_name text,
  email text,
  status public.creator_waitlist_status,
  invite_expires_at timestamp with time zone,
  invite_used_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cw.id,
    cw.full_name,
    cw.email,
    cw.status,
    cw.invite_expires_at,
    cw.invite_used_at
  FROM public.creator_waitlist cw
  WHERE cw.invite_token_hash = p_token_hash
  LIMIT 1;
$$;

DROP POLICY IF EXISTS "Admins can update waitlist" ON public.creator_waitlist;
CREATE POLICY "Admins can update waitlist"
ON public.creator_waitlist
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

GRANT EXECUTE ON FUNCTION public.expire_creator_waitlist_invites() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_waitlist_invite_by_hash(text) TO anon, authenticated;
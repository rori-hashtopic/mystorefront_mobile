
DO $$ BEGIN
  CREATE TYPE public.brand_invite_status AS ENUM ('active','redeemed','revoked','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.brand_creator_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  welcome_message text,
  status public.brand_invite_status NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  redeemed_by_user_id uuid,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_creator_invites_brand_id ON public.brand_creator_invites(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_creator_invites_status ON public.brand_creator_invites(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_creator_invites TO authenticated;
GRANT ALL ON public.brand_creator_invites TO service_role;

ALTER TABLE public.brand_creator_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners manage own invites" ON public.brand_creator_invites
  FOR ALL TO authenticated
  USING (brand_id IN (SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid()))
  WITH CHECK (brand_id IN (SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid()));

CREATE POLICY "Admins view all invites" ON public.brand_creator_invites
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_brand_creator_invites_updated_at
  BEFORE UPDATE ON public.brand_creator_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_brand_invite_by_hash(p_token_hash text)
RETURNS TABLE(
  id uuid,
  brand_id uuid,
  brand_name text,
  brand_logo_url text,
  welcome_message text,
  status public.brand_invite_status,
  expires_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT bci.id, bci.brand_id, ba.name AS brand_name,
         COALESCE(ba.logo_url, ba.logo_upload_url) AS brand_logo_url,
         bci.welcome_message, bci.status, bci.expires_at
  FROM public.brand_creator_invites bci
  JOIN public.brand_accounts ba ON ba.id = bci.brand_id
  WHERE bci.token_hash = p_token_hash
  LIMIT 1;
$$;

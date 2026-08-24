CREATE TABLE IF NOT EXISTS public.instagram_sync_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  scope text NOT NULL,
  ig_user_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ig_sync_diag_creator ON public.instagram_sync_diagnostics(creator_id, created_at DESC);

GRANT SELECT ON public.instagram_sync_diagnostics TO authenticated;
GRANT ALL ON public.instagram_sync_diagnostics TO service_role;

ALTER TABLE public.instagram_sync_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read diagnostics"
  ON public.instagram_sync_diagnostics
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role writes diagnostics"
  ON public.instagram_sync_diagnostics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.admin_get_instagram_diagnostics(p_creator_id uuid)
RETURNS SETOF public.instagram_sync_diagnostics
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.instagram_sync_diagnostics
  WHERE creator_id = p_creator_id
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY created_at DESC
  LIMIT 20;
$$;
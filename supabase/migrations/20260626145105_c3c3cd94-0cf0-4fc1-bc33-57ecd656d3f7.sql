
CREATE TABLE public.paid_collabs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id uuid NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  platforms text[] NOT NULL DEFAULT '{}',
  compensation_type text NOT NULL,
  fee_amount numeric,
  deliverables text,
  go_live_date date,
  submission_deadline date,
  required_hashtags text,
  required_mentions text,
  dos_and_donts text,
  usage_rights text,
  additional_notes text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paid_collabs TO authenticated;
GRANT ALL ON public.paid_collabs TO service_role;

ALTER TABLE public.paid_collabs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners manage their paid collabs"
  ON public.paid_collabs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_accounts ba
      WHERE ba.id = paid_collabs.brand_id AND ba.owner_user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brand_accounts ba
      WHERE ba.id = paid_collabs.brand_id AND ba.owner_user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE INDEX paid_collabs_brand_id_idx ON public.paid_collabs(brand_id);

CREATE TRIGGER update_paid_collabs_updated_at
  BEFORE UPDATE ON public.paid_collabs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

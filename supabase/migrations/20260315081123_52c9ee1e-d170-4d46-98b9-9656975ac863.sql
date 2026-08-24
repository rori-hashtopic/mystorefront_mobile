CREATE TABLE public.brand_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  biggest_challenge TEXT,
  goals TEXT,
  partnership_types TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit to brand_waitlist"
  ON public.brand_waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view brand_waitlist"
  ON public.brand_waitlist
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.creator_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  primary_platform TEXT NOT NULL,
  social_handle TEXT NOT NULL,
  niche TEXT NOT NULL,
  follower_range TEXT NOT NULL,
  biggest_challenge TEXT,
  referral_source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public waitlist signup)
CREATE POLICY "Anyone can submit waitlist" ON public.creator_waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view entries
CREATE POLICY "Admins can view waitlist" ON public.creator_waitlist
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

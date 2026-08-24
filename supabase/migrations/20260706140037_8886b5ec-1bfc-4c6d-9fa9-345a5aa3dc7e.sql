ALTER TABLE public.creator_waitlist ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.creator_applications ADD COLUMN IF NOT EXISTS admin_notes text;
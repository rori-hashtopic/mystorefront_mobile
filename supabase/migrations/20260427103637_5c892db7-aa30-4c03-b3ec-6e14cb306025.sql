DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'creator_application_status') THEN
    CREATE TYPE public.creator_application_status AS ENUM ('pending', 'approved', 'declined', 'more_info_needed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.creator_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  whatsapp_number text NULL,
  instagram_handle text NULL,
  tiktok_handle text NULL,
  youtube_handle text NULL,
  other_link text NULL,
  primary_platform text NOT NULL,
  follower_range text NOT NULL,
  about_content text NULL,
  status public.creator_application_status NOT NULL DEFAULT 'pending',
  admin_notes text NULL,
  decline_reason text NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz NULL,
  reviewed_by uuid NULL
);

ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_creator_applications_email ON public.creator_applications (lower(email));
CREATE INDEX IF NOT EXISTS idx_creator_applications_user_id ON public.creator_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_creator_applications_status ON public.creator_applications (status);
CREATE INDEX IF NOT EXISTS idx_creator_applications_submitted_at ON public.creator_applications (submitted_at DESC);

CREATE POLICY "Users can create their own creator applications"
ON public.creator_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own creator applications"
ON public.creator_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all creator applications"
ON public.creator_applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update creator applications"
ON public.creator_applications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete creator applications"
ON public.creator_applications
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

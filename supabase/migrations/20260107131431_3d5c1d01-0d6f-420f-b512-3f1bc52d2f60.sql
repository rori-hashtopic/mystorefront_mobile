-- Add unified marketing consent fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS marketing_consent_updated_at timestamp with time zone;

-- Create index for efficient filtering by marketing consent
CREATE INDEX IF NOT EXISTS idx_profiles_marketing_consent ON public.profiles (marketing_consent);

-- Create admin_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on admin_logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view and insert logs
CREATE POLICY "Admins can view all logs"
ON public.admin_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert logs"
ON public.admin_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
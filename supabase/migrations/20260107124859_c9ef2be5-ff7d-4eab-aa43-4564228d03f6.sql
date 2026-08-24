-- Create shopper_profiles table for marketing consent and name storage
CREATE TABLE IF NOT EXISTS public.shopper_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  marketing_consent boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopper_profiles ENABLE ROW LEVEL SECURITY;

-- Shopper profiles policies
CREATE POLICY "Users can view their own shopper profile"
ON public.shopper_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopper profile"
ON public.shopper_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopper profile"
ON public.shopper_profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all shopper profiles"
ON public.shopper_profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add anonymous session tracking to outbound clicks
-- First create the outbound_clicks table for comprehensive tracking
CREATE TABLE IF NOT EXISTS public.outbound_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  viewer_user_id uuid,
  anonymous_session_id text,
  source_page text NOT NULL DEFAULT 'shop',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on outbound_clicks
ALTER TABLE public.outbound_clicks ENABLE ROW LEVEL SECURITY;

-- Outbound clicks policies
CREATE POLICY "Anyone can insert outbound clicks"
ON public.outbound_clicks
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Creators can view clicks on their links"
ON public.outbound_clicks
FOR SELECT
USING (auth.uid() = creator_id);

CREATE POLICY "Admins can view all outbound clicks"
ON public.outbound_clicks
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on shopper_profiles
CREATE TRIGGER update_shopper_profiles_updated_at
  BEFORE UPDATE ON public.shopper_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
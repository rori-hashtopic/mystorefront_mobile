-- Fix 1: Add UUID format validation constraint on outbound_clicks.anonymous_session_id
ALTER TABLE public.outbound_clicks 
ADD CONSTRAINT check_anonymous_session_uuid 
CHECK (anonymous_session_id IS NULL OR anonymous_session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Fix 2: Update RLS policy to prevent self-assignment of admin/brand roles
-- First, drop the existing insert policy on user_roles
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- Create a restrictive insert policy that only allows creator and shopper roles
CREATE POLICY "Users can only insert creator or shopper roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND role IN ('creator', 'shopper')
);
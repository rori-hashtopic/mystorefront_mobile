-- Add description field to links table for user notes
ALTER TABLE public.links 
ADD COLUMN IF NOT EXISTS description text;
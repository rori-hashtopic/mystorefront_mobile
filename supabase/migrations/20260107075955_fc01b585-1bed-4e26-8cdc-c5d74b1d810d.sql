-- Add 'shopper' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'shopper';

-- Add username/shop_slug to profiles table for public shop URLs
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Create shopper_follows table for following creators
CREATE TABLE public.shopper_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shopper_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shopper_id, creator_id)
);

-- Enable RLS on shopper_follows
ALTER TABLE public.shopper_follows ENABLE ROW LEVEL SECURITY;

-- Shoppers can view their own follows
CREATE POLICY "Shoppers can view their own follows"
ON public.shopper_follows
FOR SELECT
USING (auth.uid() = shopper_id);

-- Shoppers can insert their own follows
CREATE POLICY "Shoppers can follow creators"
ON public.shopper_follows
FOR INSERT
WITH CHECK (auth.uid() = shopper_id);

-- Shoppers can unfollow creators
CREATE POLICY "Shoppers can unfollow creators"
ON public.shopper_follows
FOR DELETE
USING (auth.uid() = shopper_id);

-- Creators can see who follows them
CREATE POLICY "Creators can see their followers"
ON public.shopper_follows
FOR SELECT
USING (auth.uid() = creator_id);

-- Create shopper_wishlists table for saving products
CREATE TABLE public.shopper_wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shopper_id UUID NOT NULL,
  link_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shopper_id, link_id)
);

-- Enable RLS on shopper_wishlists
ALTER TABLE public.shopper_wishlists ENABLE ROW LEVEL SECURITY;

-- Shoppers can view their own wishlist
CREATE POLICY "Shoppers can view their own wishlist"
ON public.shopper_wishlists
FOR SELECT
USING (auth.uid() = shopper_id);

-- Shoppers can add to wishlist
CREATE POLICY "Shoppers can add to wishlist"
ON public.shopper_wishlists
FOR INSERT
WITH CHECK (auth.uid() = shopper_id);

-- Shoppers can remove from wishlist
CREATE POLICY "Shoppers can remove from wishlist"
ON public.shopper_wishlists
FOR DELETE
USING (auth.uid() = shopper_id);

-- Create shopper_activity table for feed generation
CREATE TABLE public.shopper_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shopper_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'follow', 'wishlist_add', 'shop_view', 'link_click'
  creator_id UUID,
  link_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on shopper_activity
ALTER TABLE public.shopper_activity ENABLE ROW LEVEL SECURITY;

-- Shoppers can view their own activity
CREATE POLICY "Shoppers can view their own activity"
ON public.shopper_activity
FOR SELECT
USING (auth.uid() = shopper_id);

-- Shoppers can insert their own activity
CREATE POLICY "Shoppers can log their activity"
ON public.shopper_activity
FOR INSERT
WITH CHECK (auth.uid() = shopper_id);

-- Update profiles RLS to allow public viewing by username for shop pages
CREATE POLICY "Public can view creator profiles by username"
ON public.profiles
FOR SELECT
USING (username IS NOT NULL);

-- Update links RLS to allow public viewing for shop pages
CREATE POLICY "Public can view links for shop pages"
ON public.links
FOR SELECT
USING (true);

-- Update collections RLS to allow public viewing (already has a policy but let's ensure it works)
-- The existing policy "Collections are publicly viewable" should work
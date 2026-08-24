-- TikTok connection status enum (similar to Instagram)
CREATE TYPE public.tiktok_connection_status AS ENUM ('connected', 'disconnected', 'error', 'token_expired');

-- TikTok connections table
CREATE TABLE public.tiktok_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    tiktok_user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_error TEXT,
    status tiktok_connection_status NOT NULL DEFAULT 'connected',
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    profile_picture_url TEXT,
    display_name TEXT,
    bio_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tiktok_connections ENABLE ROW LEVEL SECURITY;

-- Creators can view their own connection
CREATE POLICY "Creators can view their own TikTok connection"
ON public.tiktok_connections
FOR SELECT
USING (creator_id = auth.uid());

-- Creators can insert their own connection
CREATE POLICY "Creators can insert their own TikTok connection"
ON public.tiktok_connections
FOR INSERT
WITH CHECK (creator_id = auth.uid());

-- Creators can update their own connection
CREATE POLICY "Creators can update their own TikTok connection"
ON public.tiktok_connections
FOR UPDATE
USING (creator_id = auth.uid());

-- Creators can delete their own connection
CREATE POLICY "Creators can delete their own TikTok connection"
ON public.tiktok_connections
FOR DELETE
USING (creator_id = auth.uid());

-- Brands can view connected creators' TikTok data
CREATE POLICY "Brands can view connected TikTok data"
ON public.tiktok_connections
FOR SELECT
USING (
    status = 'connected' AND
    public.has_role(auth.uid(), 'brand'::app_role)
);

-- Admins can view all connections
CREATE POLICY "Admins can view all TikTok connections"
ON public.tiktok_connections
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_tiktok_connections_updated_at
    BEFORE UPDATE ON public.tiktok_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add tiktok_connected field to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tiktok_connected BOOLEAN DEFAULT false;

-- Update creator_socials to include tiktok_connected boolean
ALTER TABLE public.creator_socials 
ADD COLUMN IF NOT EXISTS tiktok_connected BOOLEAN DEFAULT false;

-- Index for efficient lookups
CREATE INDEX idx_tiktok_connections_creator_id ON public.tiktok_connections(creator_id);
CREATE INDEX idx_tiktok_connections_status ON public.tiktok_connections(status);
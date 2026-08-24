-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('creator', 'brand', 'admin');

-- Create user_roles table (per security best practices)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Brand account status enum
CREATE TYPE public.brand_account_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Brand accounts table
CREATE TABLE public.brand_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    status brand_account_status NOT NULL DEFAULT 'pending',
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners can view their own account"
ON public.brand_accounts
FOR SELECT
USING (owner_user_id = auth.uid());

CREATE POLICY "Admins can manage all brand accounts"
ON public.brand_accounts
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Approved brands visible to creators"
ON public.brand_accounts
FOR SELECT
USING (status = 'approved' AND public.has_role(auth.uid(), 'creator'::app_role));

-- Instagram connection status enum
CREATE TYPE public.instagram_connection_status AS ENUM ('connected', 'disconnected', 'error', 'token_expired');

-- Instagram connections table
CREATE TABLE public.instagram_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    ig_user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_error TEXT,
    status instagram_connection_status NOT NULL DEFAULT 'connected',
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    profile_picture_url TEXT,
    biography TEXT
);

ALTER TABLE public.instagram_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view their own connection"
ON public.instagram_connections
FOR SELECT
USING (creator_id = auth.uid());

CREATE POLICY "Creators can manage their own connection"
ON public.instagram_connections
FOR ALL
USING (creator_id = auth.uid());

CREATE POLICY "Brands can view connected creator data"
ON public.instagram_connections
FOR SELECT
USING (public.has_role(auth.uid(), 'brand'::app_role) AND status = 'connected');

CREATE POLICY "Admins can view all connections"
ON public.instagram_connections
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));
-- Instagram posts table
CREATE TABLE public.instagram_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    ig_media_id TEXT NOT NULL UNIQUE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    media_url TEXT,
    media_type TEXT,
    caption_snippet TEXT,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    permalink TEXT,
    is_sponsored BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view their own posts"
ON public.instagram_posts
FOR SELECT
USING (creator_id = auth.uid());

CREATE POLICY "Creators can manage their own posts"
ON public.instagram_posts
FOR ALL
USING (creator_id = auth.uid());

CREATE POLICY "Brands can view creator posts"
ON public.instagram_posts
FOR SELECT
USING (public.has_role(auth.uid(), 'brand'::app_role));

CREATE POLICY "Admins can view all posts"
ON public.instagram_posts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Instagram growth snapshots
CREATE TABLE public.instagram_growth_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    month DATE NOT NULL,
    follower_count INTEGER NOT NULL,
    following_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (creator_id, month)
);

ALTER TABLE public.instagram_growth_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view their own snapshots"
ON public.instagram_growth_snapshots
FOR SELECT
USING (creator_id = auth.uid());

CREATE POLICY "Brands can view snapshots"
ON public.instagram_growth_snapshots
FOR SELECT
USING (public.has_role(auth.uid(), 'brand'::app_role));

CREATE POLICY "Admins can view all snapshots"
ON public.instagram_growth_snapshots
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Creator KPI snapshots
CREATE TABLE public.creator_kpi_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    avg_likes NUMERIC(10,2) DEFAULT 0,
    avg_comments NUMERIC(10,2) DEFAULT 0,
    engagement_rate NUMERIC(5,4) DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view their own KPIs"
ON public.creator_kpi_snapshots
FOR SELECT
USING (creator_id = auth.uid());

CREATE POLICY "Brands can view KPIs"
ON public.creator_kpi_snapshots
FOR SELECT
USING (public.has_role(auth.uid(), 'brand'::app_role));

CREATE POLICY "Admins can view all KPIs"
ON public.creator_kpi_snapshots
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Placeholder analytics for non-API metrics
CREATE TABLE public.placeholder_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    key TEXT NOT NULL,
    json_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (creator_id, key)
);

ALTER TABLE public.placeholder_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view their own placeholders"
ON public.placeholder_analytics
FOR SELECT
USING (creator_id = auth.uid());

CREATE POLICY "Brands can view placeholders"
ON public.placeholder_analytics
FOR SELECT
USING (public.has_role(auth.uid(), 'brand'::app_role));

-- Instagram audience demographics
CREATE TABLE public.instagram_audience_demographics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    demographic_type TEXT NOT NULL,
    demographic_key TEXT NOT NULL,
    value NUMERIC(5,2) NOT NULL,
    audience_type TEXT NOT NULL DEFAULT 'followers',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (creator_id, demographic_type, demographic_key, audience_type)
);

ALTER TABLE public.instagram_audience_demographics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view their own demographics"
ON public.instagram_audience_demographics
FOR SELECT
USING (creator_id = auth.uid());

CREATE POLICY "Brands can view demographics"
ON public.instagram_audience_demographics
FOR SELECT
USING (public.has_role(auth.uid(), 'brand'::app_role));

-- Instagram hashtags
CREATE TABLE public.instagram_hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    hashtag TEXT NOT NULL,
    usage_count INTEGER DEFAULT 1,
    usage_percent NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (creator_id, hashtag)
);

ALTER TABLE public.instagram_hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for hashtags"
ON public.instagram_hashtags
FOR SELECT
USING (true);

-- Instagram mentions
CREATE TABLE public.instagram_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    mention TEXT NOT NULL,
    usage_count INTEGER DEFAULT 1,
    usage_percent NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (creator_id, mention)
);

ALTER TABLE public.instagram_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for mentions"
ON public.instagram_mentions
FOR SELECT
USING (true);

-- Brand saved lists
CREATE TABLE public.brand_saved_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES public.brand_accounts(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_saved_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners can manage their lists"
ON public.brand_saved_lists
FOR ALL
USING (brand_id IN (SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid()));

-- Brand saved list items
CREATE TABLE public.brand_saved_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID REFERENCES public.brand_saved_lists(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (list_id, creator_id)
);

ALTER TABLE public.brand_saved_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners can manage list items"
ON public.brand_saved_list_items
FOR ALL
USING (list_id IN (
    SELECT bsl.id FROM public.brand_saved_lists bsl
    JOIN public.brand_accounts ba ON bsl.brand_id = ba.id
    WHERE ba.owner_user_id = auth.uid()
));

-- Add trigger for brand_accounts updated_at
CREATE TRIGGER update_brand_accounts_updated_at
BEFORE UPDATE ON public.brand_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_instagram_posts_creator_id ON public.instagram_posts(creator_id);
CREATE INDEX idx_instagram_posts_timestamp ON public.instagram_posts(timestamp DESC);
CREATE INDEX idx_instagram_growth_creator_month ON public.instagram_growth_snapshots(creator_id, month);
CREATE INDEX idx_creator_kpi_creator_period ON public.creator_kpi_snapshots(creator_id, period_start);
CREATE INDEX idx_audience_demographics_creator ON public.instagram_audience_demographics(creator_id);

-- Update profiles table to add more fields for creator discovery
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS location_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS niche_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS instagram_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;

-- Update profiles RLS to allow brands to view creator profiles
CREATE POLICY "Brands can view creator profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'brand'::app_role));

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));
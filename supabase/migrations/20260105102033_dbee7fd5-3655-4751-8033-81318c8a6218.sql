-- Allow users to insert their own role
CREATE POLICY "Users can insert their own role"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow brand users to insert their own brand account
CREATE POLICY "Users can insert their own brand account"
ON public.brand_accounts
FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

-- Allow creators to manage their Instagram connection
CREATE POLICY "Creators can insert their own connection"
ON public.instagram_connections
FOR INSERT
WITH CHECK (creator_id = auth.uid());

-- Allow creators to manage their growth snapshots
CREATE POLICY "Creators can insert their own snapshots"
ON public.instagram_growth_snapshots
FOR INSERT
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can insert their own KPIs"
ON public.creator_kpi_snapshots
FOR INSERT
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can insert their own demographics"
ON public.instagram_audience_demographics
FOR INSERT
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can insert their own hashtags"
ON public.instagram_hashtags
FOR INSERT
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can insert their own mentions"
ON public.instagram_mentions
FOR INSERT
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can insert their own posts"
ON public.instagram_posts
FOR INSERT
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can insert their own placeholders"
ON public.placeholder_analytics
FOR INSERT
WITH CHECK (creator_id = auth.uid());

-- Create mention_campaigns table
CREATE TABLE public.mention_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brand_accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  deliverable_type text NOT NULL,
  deliverable_description text,
  fee_amount numeric(10,2) NOT NULL,
  content_deadline date,
  revision_rounds integer NOT NULL DEFAULT 1,
  max_creators integer,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.mention_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners can manage their campaigns"
  ON public.mention_campaigns FOR ALL
  USING (brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid()));

CREATE POLICY "Admins can view all mention campaigns"
  ON public.mention_campaigns FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create mention_requests table
CREATE TABLE public.mention_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES mention_campaigns(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brand_accounts(id),
  creator_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending',
  fee_amount numeric(10,2) NOT NULL,
  creator_note text,
  brand_note text,
  post_url text,
  post_submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES profiles(id),
  revision_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, creator_id)
);

ALTER TABLE public.mention_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners can manage their mention requests"
  ON public.mention_requests FOR ALL
  USING (brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid()));

CREATE POLICY "Creators can view their mention requests"
  ON public.mention_requests FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "Creators can update their mention requests"
  ON public.mention_requests FOR UPDATE
  USING (creator_id = auth.uid());

CREATE POLICY "Admins can view all mention requests"
  ON public.mention_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Add updated_at triggers
CREATE TRIGGER update_mention_campaigns_updated_at
  BEFORE UPDATE ON public.mention_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mention_requests_updated_at
  BEFORE UPDATE ON public.mention_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

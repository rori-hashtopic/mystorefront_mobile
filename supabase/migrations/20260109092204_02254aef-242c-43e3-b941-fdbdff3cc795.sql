-- Create brand_reports table
CREATE TABLE public.brand_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('creator_snapshot', 'saved_list_comparison', 'affiliate_sales', 'campaign_performance')),
  name TEXT NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  filters_json JSONB,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create brand_report_snapshots table
CREATE TABLE public.brand_report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.brand_reports(id) ON DELETE CASCADE,
  data_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_report_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for brand_reports
CREATE POLICY "Brand owners can view their own reports"
ON public.brand_reports
FOR SELECT
USING (brand_id IN (
  SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Brand owners can create their own reports"
ON public.brand_reports
FOR INSERT
WITH CHECK (brand_id IN (
  SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Brand owners can update their own reports"
ON public.brand_reports
FOR UPDATE
USING (brand_id IN (
  SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Brand owners can delete their own reports"
ON public.brand_reports
FOR DELETE
USING (brand_id IN (
  SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Admins can view all reports"
ON public.brand_reports
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for brand_report_snapshots
CREATE POLICY "Brand owners can view their own report snapshots"
ON public.brand_report_snapshots
FOR SELECT
USING (report_id IN (
  SELECT br.id FROM public.brand_reports br
  JOIN public.brand_accounts ba ON br.brand_id = ba.id
  WHERE ba.owner_user_id = auth.uid()
));

CREATE POLICY "Brand owners can create their own report snapshots"
ON public.brand_report_snapshots
FOR INSERT
WITH CHECK (report_id IN (
  SELECT br.id FROM public.brand_reports br
  JOIN public.brand_accounts ba ON br.brand_id = ba.id
  WHERE ba.owner_user_id = auth.uid()
));

CREATE POLICY "Brand owners can delete their own report snapshots"
ON public.brand_report_snapshots
FOR DELETE
USING (report_id IN (
  SELECT br.id FROM public.brand_reports br
  JOIN public.brand_accounts ba ON br.brand_id = ba.id
  WHERE ba.owner_user_id = auth.uid()
));

CREATE POLICY "Admins can view all report snapshots"
ON public.brand_report_snapshots
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_brand_reports_brand_id ON public.brand_reports(brand_id);
CREATE INDEX idx_brand_reports_status ON public.brand_reports(status);
CREATE INDEX idx_brand_report_snapshots_report_id ON public.brand_report_snapshots(report_id);
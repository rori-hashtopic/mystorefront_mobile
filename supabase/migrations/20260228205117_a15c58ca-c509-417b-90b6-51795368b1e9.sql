
-- Create payout request status enum
CREATE TYPE public.payout_request_status AS ENUM ('pending', 'approved', 'paid', 'rejected');

-- Create payout_requests table
CREATE TABLE public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  payout_account_id UUID REFERENCES public.payout_accounts(id) NOT NULL,
  status payout_request_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Creators can view their own payout requests
CREATE POLICY "Creators can view their own payout requests"
  ON public.payout_requests FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

-- Creators can insert their own payout requests
CREATE POLICY "Creators can insert their own payout requests"
  ON public.payout_requests FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Admins can view all payout requests
CREATE POLICY "Admins can view all payout requests"
  ON public.payout_requests FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Admins can update payout requests (approve/reject/mark paid)
CREATE POLICY "Admins can update payout requests"
  ON public.payout_requests FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Create a function to calculate creator available balance
CREATE OR REPLACE FUNCTION public.get_creator_balance(p_creator_id UUID)
RETURNS TABLE (
  total_earned NUMERIC,
  locked_amount NUMERIC,
  paid_amount NUMERIC,
  available_balance NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN ao.status = 'confirmed' THEN ao.commission_amount ELSE 0 END), 0) AS total_earned,
    COALESCE(SUM(CASE WHEN ao.status = 'pending' THEN ao.commission_amount ELSE 0 END), 0) AS locked_amount,
    COALESCE((SELECT SUM(pr.amount) FROM payout_requests pr WHERE pr.creator_id = p_creator_id AND pr.status = 'paid'), 0) AS paid_amount,
    COALESCE(SUM(CASE WHEN ao.status = 'confirmed' THEN ao.commission_amount ELSE 0 END), 0)
      - COALESCE((SELECT SUM(pr.amount) FROM payout_requests pr WHERE pr.creator_id = p_creator_id AND pr.status IN ('paid', 'pending', 'approved')), 0) AS available_balance
  FROM affiliate_orders ao
  WHERE ao.creator_id = p_creator_id;
$$;

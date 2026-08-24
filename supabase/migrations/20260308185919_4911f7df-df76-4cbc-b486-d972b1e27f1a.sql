
-- Message requests table: creators request to message brands
CREATE TABLE public.message_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  brand_id UUID NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(creator_id, brand_id)
);

ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;

-- Creators can insert their own requests
CREATE POLICY "Creators can send message requests"
ON public.message_requests FOR INSERT TO authenticated
WITH CHECK (creator_id = auth.uid());

-- Creators can view their own requests
CREATE POLICY "Creators can view their own requests"
ON public.message_requests FOR SELECT TO authenticated
USING (creator_id = auth.uid());

-- Brand owners can view requests sent to their brand
CREATE POLICY "Brand owners can view their requests"
ON public.message_requests FOR SELECT TO authenticated
USING (brand_id IN (SELECT ba.id FROM brand_accounts ba WHERE ba.owner_user_id = auth.uid()));

-- Brand owners can update request status (accept/decline)
CREATE POLICY "Brand owners can update request status"
ON public.message_requests FOR UPDATE TO authenticated
USING (brand_id IN (SELECT ba.id FROM brand_accounts ba WHERE ba.owner_user_id = auth.uid()));

-- Admins can view all requests
CREATE POLICY "Admins can view all message requests"
ON public.message_requests FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all requests
CREATE POLICY "Admins can manage all message requests"
ON public.message_requests FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

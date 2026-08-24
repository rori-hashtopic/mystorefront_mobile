
CREATE TABLE public.payment_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  amount_due numeric NOT NULL DEFAULT 0,
  message text NOT NULL DEFAULT 'You have an outstanding balance. Please submit your EFT payment.',
  period_start date,
  period_end date,
  sent_by uuid NOT NULL,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_prompts ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all payment prompts"
  ON public.payment_prompts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Brand owners can view their prompts
CREATE POLICY "Brand owners can view their payment prompts"
  ON public.payment_prompts FOR SELECT
  TO authenticated
  USING (brand_id IN (
    SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid()
  ));

-- Brand owners can dismiss their prompts
CREATE POLICY "Brand owners can dismiss their payment prompts"
  ON public.payment_prompts FOR UPDATE
  TO authenticated
  USING (brand_id IN (
    SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid()
  ))
  WITH CHECK (brand_id IN (
    SELECT id FROM public.brand_accounts WHERE owner_user_id = auth.uid()
  ));

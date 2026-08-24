-- Create payout account type enum
CREATE TYPE public.payout_account_type AS ENUM ('EFT', 'PAYFAST');

-- Create payout account status enum
CREATE TYPE public.payout_account_status AS ENUM ('inactive', 'active');

-- Create payout_accounts table
CREATE TABLE public.payout_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type payout_account_type NOT NULL,
  status payout_account_status NOT NULL DEFAULT 'inactive',
  
  -- EFT fields
  bank_name TEXT,
  account_holder TEXT,
  account_number_masked TEXT,
  account_type TEXT,
  branch_code TEXT,
  
  -- PayFast fields
  merchant_id TEXT,
  merchant_key_encrypted TEXT,
  passphrase_set BOOLEAN DEFAULT false,
  signature_enabled BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Each user can only have one account per type
  UNIQUE(user_id, type)
);

-- Enable RLS
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own payout accounts"
  ON public.payout_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payout accounts"
  ON public.payout_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payout accounts"
  ON public.payout_accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payout accounts"
  ON public.payout_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_payout_accounts_updated_at
  BEFORE UPDATE ON public.payout_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
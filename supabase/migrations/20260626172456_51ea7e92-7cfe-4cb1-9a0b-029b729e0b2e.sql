ALTER TABLE public.paid_collabs
  ADD COLUMN IF NOT EXISTS creator_ids uuid[],
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS exclusivity_required boolean NOT NULL DEFAULT false;

ALTER TABLE public.mention_campaigns
  ADD COLUMN IF NOT EXISTS submission_deadline date,
  ADD COLUMN IF NOT EXISTS required_hashtags text,
  ADD COLUMN IF NOT EXISTS required_mentions text,
  ADD COLUMN IF NOT EXISTS usage_rights text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS exclusivity_required boolean NOT NULL DEFAULT false;
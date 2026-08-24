-- Brand creator invites become email-addressed: the brand enters a creator's
-- email and the platform sends the invite, rather than handing back a raw link
-- for the brand to distribute itself. The link is still generated and returned
-- so it can be copied as a fallback (IG DM, WhatsApp).

ALTER TABLE public.brand_creator_invites
  ADD COLUMN IF NOT EXISTS invited_email text,
  ADD COLUMN IF NOT EXISTS invited_name text,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

-- Used to show a brand who they've already invited, and to block duplicate
-- active invites to the same address.
CREATE INDEX IF NOT EXISTS idx_brand_creator_invites_brand_email
  ON public.brand_creator_invites(brand_id, invited_email);

COMMENT ON COLUMN public.brand_creator_invites.invited_email IS
  'Address the invite was emailed to. Null for legacy link-only invites.';
COMMENT ON COLUMN public.brand_creator_invites.invited_name IS
  'Optional name the brand entered, used to personalise the email and label the invite.';
COMMENT ON COLUMN public.brand_creator_invites.email_sent_at IS
  'Set when the invite email is successfully enqueued. Null means link-only.';
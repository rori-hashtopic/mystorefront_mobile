
-- Helper: is the current user the brand owner of a given collab?
CREATE OR REPLACE FUNCTION public.is_brand_owner_of_collab(p_collab_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.paid_collabs pc
    JOIN public.brand_accounts ba ON ba.id = pc.brand_id
    WHERE pc.id = p_collab_id
      AND ba.owner_user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_brand_owner_of_collab(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_brand_owner_of_collab(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) paid_collab_participants
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.paid_collab_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_id uuid NOT NULL REFERENCES public.paid_collabs(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  -- gifting
  shipping_address text,
  tracking_carrier text,
  tracking_number text,
  tracking_url text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  -- deliverables / draft
  draft_caption text,
  draft_planned_date date,
  revision_count int NOT NULL DEFAULT 0,
  revision_note text,
  -- go-live
  live_post_urls text[] NOT NULL DEFAULT '{}',
  verified_live_at timestamptz,
  -- payment
  payment_status text NOT NULL DEFAULT 'unpaid',  -- unpaid | due | paid
  payment_amount numeric,
  paid_at timestamptz,
  -- misc
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collab_id, creator_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paid_collab_participants TO authenticated;
GRANT ALL ON public.paid_collab_participants TO service_role;

ALTER TABLE public.paid_collab_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners manage participants on their collabs"
  ON public.paid_collab_participants
  FOR ALL
  TO authenticated
  USING (public.is_brand_owner_of_collab(collab_id))
  WITH CHECK (public.is_brand_owner_of_collab(collab_id));

CREATE POLICY "Creators view their own participant row"
  ON public.paid_collab_participants
  FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Creators update their own participant row"
  ON public.paid_collab_participants
  FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Admins full access on participants"
  ON public.paid_collab_participants
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_paid_collab_participants_collab ON public.paid_collab_participants(collab_id);
CREATE INDEX idx_paid_collab_participants_creator ON public.paid_collab_participants(creator_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) paid_collab_submissions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.paid_collab_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.paid_collab_participants(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text,
  file_type text,
  caption text,
  platform text,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',  -- pending | approved | changes_requested
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paid_collab_submissions TO authenticated;
GRANT ALL ON public.paid_collab_submissions TO service_role;

ALTER TABLE public.paid_collab_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners manage submissions on their collabs"
  ON public.paid_collab_submissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.paid_collab_participants p
      WHERE p.id = participant_id
        AND public.is_brand_owner_of_collab(p.collab_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.paid_collab_participants p
      WHERE p.id = participant_id
        AND public.is_brand_owner_of_collab(p.collab_id)
    )
  );

CREATE POLICY "Creators view their own submissions"
  ON public.paid_collab_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.paid_collab_participants p
      WHERE p.id = participant_id AND p.creator_id = auth.uid()
    )
  );

CREATE POLICY "Creators insert their own submissions"
  ON public.paid_collab_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.paid_collab_participants p
      WHERE p.id = participant_id AND p.creator_id = auth.uid()
    )
  );

CREATE POLICY "Admins full access on submissions"
  ON public.paid_collab_submissions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_paid_collab_submissions_participant ON public.paid_collab_submissions(participant_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) paid_collab_events  (activity log)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.paid_collab_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.paid_collab_participants(id) ON DELETE CASCADE,
  actor_user_id uuid,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.paid_collab_events TO authenticated;
GRANT ALL ON public.paid_collab_events TO service_role;

ALTER TABLE public.paid_collab_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand owners read events on their collabs"
  ON public.paid_collab_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.paid_collab_participants p
      WHERE p.id = participant_id
        AND public.is_brand_owner_of_collab(p.collab_id)
    )
  );

CREATE POLICY "Creators read their own events"
  ON public.paid_collab_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.paid_collab_participants p
      WHERE p.id = participant_id AND p.creator_id = auth.uid()
    )
  );

CREATE POLICY "Participants and brand owners insert events"
  ON public.paid_collab_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.paid_collab_participants p
      WHERE p.id = participant_id
        AND (p.creator_id = auth.uid() OR public.is_brand_owner_of_collab(p.collab_id))
    )
  );

CREATE POLICY "Admins full access on events"
  ON public.paid_collab_events
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_paid_collab_events_participant ON public.paid_collab_events(participant_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TRIGGER trg_paid_collab_participants_updated_at
  BEFORE UPDATE ON public.paid_collab_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_paid_collab_submissions_updated_at
  BEFORE UPDATE ON public.paid_collab_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill participants from existing paid_collabs.creator_ids
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.paid_collab_participants (collab_id, creator_id, status)
SELECT pc.id, c_id, COALESCE(pc.status, 'pending')
FROM public.paid_collabs pc
CROSS JOIN LATERAL unnest(COALESCE(pc.creator_ids, '{}'::uuid[])) AS c_id
WHERE c_id IS NOT NULL
ON CONFLICT (collab_id, creator_id) DO NOTHING;

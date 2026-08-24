
CREATE TABLE public.message_moderation_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid,
  context text NOT NULL DEFAULT 'chat',
  content text NOT NULL,
  matched_phrase text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.message_moderation_flags TO authenticated;
GRANT ALL ON public.message_moderation_flags TO service_role;

ALTER TABLE public.message_moderation_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log their own flagged attempts"
ON public.message_moderation_flags
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own flagged attempts"
ON public.message_moderation_flags
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all flagged attempts"
ON public.message_moderation_flags
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_message_moderation_flags_user ON public.message_moderation_flags(user_id, created_at DESC);

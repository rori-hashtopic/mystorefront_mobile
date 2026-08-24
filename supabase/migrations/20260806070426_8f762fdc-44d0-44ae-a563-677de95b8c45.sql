CREATE TABLE public.conversation_participant_state (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_nudged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.conversation_participant_state TO authenticated;
GRANT ALL ON public.conversation_participant_state TO service_role;

ALTER TABLE public.conversation_participant_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversation state"
ON public.conversation_participant_state FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own conversation state"
ON public.conversation_participant_state FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own conversation state"
ON public.conversation_participant_state FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_conversation_participant_state_updated_at
BEFORE UPDATE ON public.conversation_participant_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cps_conversation ON public.conversation_participant_state (conversation_id);
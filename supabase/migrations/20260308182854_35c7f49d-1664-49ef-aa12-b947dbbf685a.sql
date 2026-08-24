
-- Conversations table (one per brand-creator pair)
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brand_accounts(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, creator_id)
);

-- Messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  brief_data jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversation policies: brand owner or the creator can view
CREATE POLICY "Brand owners can view their conversations"
  ON public.conversations FOR SELECT
  USING (brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid()));

CREATE POLICY "Creators can view their conversations"
  ON public.conversations FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "Brand owners can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid()));

CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE
  USING (
    brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid())
    OR creator_id = auth.uid()
  );

-- Message policies
CREATE POLICY "Conversation participants can view messages"
  ON public.messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM conversations 
    WHERE brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid())
    OR creator_id = auth.uid()
  ));

CREATE POLICY "Conversation participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT id FROM conversations 
      WHERE brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid())
      OR creator_id = auth.uid()
    )
  );

CREATE POLICY "Recipients can mark messages as read"
  ON public.messages FOR UPDATE
  USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE brand_id IN (SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid())
      OR creator_id = auth.uid()
    )
  );

-- Admin policies
CREATE POLICY "Admins can view all conversations"
  ON public.conversations FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Update trigger for conversations
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

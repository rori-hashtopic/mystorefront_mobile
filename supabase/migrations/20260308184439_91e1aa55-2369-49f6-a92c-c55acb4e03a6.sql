-- Drop and recreate the messages INSERT policy to also allow admins
DROP POLICY IF EXISTS "Conversation participants can send messages" ON public.messages;

CREATE POLICY "Conversation participants can send messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  (sender_id = auth.uid()) AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR
    conversation_id IN (
      SELECT c.id FROM conversations c
      WHERE c.brand_id IN (
        SELECT ba.id FROM brand_accounts ba WHERE ba.owner_user_id = auth.uid()
      )
    )
    OR
    conversation_id IN (
      SELECT c.id FROM conversations c WHERE c.creator_id = auth.uid()
    )
  )
);
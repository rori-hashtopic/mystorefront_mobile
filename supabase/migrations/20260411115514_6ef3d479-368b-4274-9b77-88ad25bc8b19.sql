
-- Add archived_by_brand column
ALTER TABLE public.conversations ADD COLUMN archived_by_brand boolean NOT NULL DEFAULT false;

-- Allow brand owners to delete their conversations
CREATE POLICY "Brand owners can delete their conversations"
ON public.conversations
FOR DELETE
USING (brand_id IN (
  SELECT id FROM brand_accounts WHERE owner_user_id = auth.uid()
));

-- Allow brand owners to delete messages in their conversations
CREATE POLICY "Brand owners can delete messages in their conversations"
ON public.messages
FOR DELETE
USING (conversation_id IN (
  SELECT c.id FROM conversations c
  JOIN brand_accounts ba ON c.brand_id = ba.id
  WHERE ba.owner_user_id = auth.uid()
));

GRANT DELETE ON public.paid_collab_submissions TO authenticated;

DROP POLICY IF EXISTS "Creators delete their own pending submissions" ON public.paid_collab_submissions;
CREATE POLICY "Creators delete their own pending submissions"
ON public.paid_collab_submissions
FOR DELETE
TO authenticated
USING (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.paid_collab_participants p
    WHERE p.id = paid_collab_submissions.participant_id
      AND p.creator_id = auth.uid()
  )
);
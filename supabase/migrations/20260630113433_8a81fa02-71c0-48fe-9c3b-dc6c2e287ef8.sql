
-- Creator: upload their own files (path must start with their user id)
CREATE POLICY "Creators upload own collab submissions"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'collab-submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Creators read own collab submissions"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'collab-submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Creators delete own collab submissions"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'collab-submissions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Brand owners read any submission tied to one of their collab participants
CREATE POLICY "Brand owners read submissions on their collabs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'collab-submissions'
  AND EXISTS (
    SELECT 1
    FROM public.paid_collab_submissions s
    JOIN public.paid_collab_participants p ON p.id = s.participant_id
    WHERE s.file_url LIKE '%' || storage.objects.name
      AND public.is_brand_owner_of_collab(p.collab_id)
  )
);

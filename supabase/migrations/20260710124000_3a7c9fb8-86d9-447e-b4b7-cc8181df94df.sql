
ALTER TABLE public.instagram_posts ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

DROP POLICY IF EXISTS "Authenticated can read discoverable creator instagram media" ON storage.objects;

CREATE POLICY "Authenticated can read discoverable creator instagram media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'instagram-media'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND COALESCE(p.is_discoverable, true) = true
  )
);

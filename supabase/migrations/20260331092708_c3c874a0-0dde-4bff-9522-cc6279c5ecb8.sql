ALTER TABLE public.instagram_connections ADD COLUMN IF NOT EXISTS media_count INTEGER DEFAULT 0;

GRANT SELECT (media_count) ON public.instagram_connections TO authenticated;

GRANT SELECT (media_count) ON public.instagram_connections TO anon;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'instagram_connections_ig_user_id_unique'
  ) THEN
    ALTER TABLE instagram_connections ADD CONSTRAINT instagram_connections_ig_user_id_unique UNIQUE (ig_user_id);
  END IF;
END $$;
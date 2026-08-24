-- Add unique constraint on instagram_posts for upsert support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'instagram_posts_creator_id_ig_media_id_key'
  ) THEN
    ALTER TABLE public.instagram_posts ADD CONSTRAINT instagram_posts_creator_id_ig_media_id_key UNIQUE (creator_id, ig_media_id);
  END IF;
END
$$;
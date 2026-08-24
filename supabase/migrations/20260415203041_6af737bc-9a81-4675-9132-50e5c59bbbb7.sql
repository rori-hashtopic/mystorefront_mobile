-- Remove duplicates, keeping the earliest entry per normalized handle
DELETE FROM public.creator_waitlist
WHERE id NOT IN (
  SELECT DISTINCT ON (lower(trim(social_handle))) id
  FROM public.creator_waitlist
  ORDER BY lower(trim(social_handle)), created_at ASC
);

-- Now create the unique index
CREATE UNIQUE INDEX idx_creator_waitlist_social_handle 
ON public.creator_waitlist (lower(trim(social_handle)));
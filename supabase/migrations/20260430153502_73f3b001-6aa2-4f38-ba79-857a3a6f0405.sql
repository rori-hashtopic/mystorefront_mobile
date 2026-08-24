-- 1. Slugify a string into a username-safe slug
CREATE OR REPLACE FUNCTION public.slugify_username(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;
  -- lowercase, replace spaces/dashes with underscore, strip everything else
  s := lower(input);
  s := regexp_replace(s, '[\s\-]+', '_', 'g');
  s := regexp_replace(s, '[^a-z0-9_]', '', 'g');
  s := regexp_replace(s, '_+', '_', 'g');
  s := trim(both '_' from s);
  IF length(s) < 3 THEN RETURN NULL; END IF;
  IF length(s) > 30 THEN s := substring(s from 1 for 30); END IF;
  RETURN s;
END;
$$;

-- 2. Generate a unique, non-reserved slug for a creator
CREATE OR REPLACE FUNCTION public.generate_unique_username(
  p_user_id uuid,
  p_display_name text,
  p_email text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  suffix int := 1;
  reserved text[] := ARRAY[
    'shop','auth','admin','brand','explore','landing','settings','analytics',
    'earnings','messages','gifting','mentions','help','discount-codes',
    'become-a-creator','creator-invite','reset-password','privacy',
    'privacy-policy','terms','unsubscribe','qc','shopper','c','storefront',
    'b','demo','api','assets','public','static','www','app','dashboard'
  ];
BEGIN
  base := public.slugify_username(p_display_name);
  IF base IS NULL AND p_email IS NOT NULL THEN
    base := public.slugify_username(split_part(p_email, '@', 1));
  END IF;
  IF base IS NULL THEN
    base := 'creator_' || substring(replace(p_user_id::text, '-', '') from 1 for 8);
  END IF;

  candidate := base;

  -- bump if reserved or already taken (by a different user)
  LOOP
    IF candidate <> ALL(reserved)
       AND NOT EXISTS (
         SELECT 1 FROM public.profiles
         WHERE lower(username) = lower(candidate)
           AND id <> p_user_id
       )
    THEN
      RETURN candidate;
    END IF;
    suffix := suffix + 1;
    candidate := substring(base from 1 for 28) || '_' || suffix::text;
    IF suffix > 999 THEN
      RETURN base || '_' || substring(replace(p_user_id::text, '-', '') from 1 for 6);
    END IF;
  END LOOP;
END;
$$;

-- 3. Trigger function: ensure creator profiles always have a username
CREATE OR REPLACE FUNCTION public.ensure_creator_username()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_creator boolean;
BEGIN
  -- Only act if username is null/empty
  IF NEW.username IS NOT NULL AND length(trim(NEW.username)) > 0 THEN
    RETURN NEW;
  END IF;

  -- Check role (allow even if role row not yet present — default to assigning)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'creator'
  ) INTO is_creator;

  -- On INSERT we don't know the role yet (handle_new_user inserts profile first),
  -- so always generate a username on insert. On UPDATE only if creator.
  IF TG_OP = 'INSERT' OR is_creator THEN
    NEW.username := public.generate_unique_username(
      NEW.id, NEW.display_name, NEW.email
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_creator_username_trigger ON public.profiles;
CREATE TRIGGER ensure_creator_username_trigger
BEFORE INSERT OR UPDATE OF username ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_creator_username();

-- 4. Backfill existing creators with no username
DO $$
DECLARE
  r record;
  new_username text;
BEGIN
  FOR r IN
    SELECT p.id, p.display_name, p.email
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'creator'
      AND (p.username IS NULL OR length(trim(p.username)) = 0)
  LOOP
    new_username := public.generate_unique_username(r.id, r.display_name, r.email);
    UPDATE public.profiles SET username = new_username WHERE id = r.id;
  END LOOP;
END;
$$;
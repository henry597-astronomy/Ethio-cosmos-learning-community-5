-- Gravatar avatar integration (email never exposed).
--
-- PostgreSQL's built-in MD5() hashes the email, and Gravatar URLs are keyed by
-- that hash. Storing the Gravatar URL in avatar_url means every part of the
-- app (chat posts, shorts, live streams) shows a profile picture without ever
-- sending the raw email to the client or other users.

-- Pure-SQL MD5 is built into Postgres, so we generate the URL directly:
CREATE OR REPLACE FUNCTION public.gravatar_url(email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'https://www.gravatar.com/avatar/' || md5(lower(trim(email))) || '?d=retro&s=160'
$$;

-- Backfill missing avatars for existing users
UPDATE public.profiles
SET avatar_url = gravatar_url(email)
WHERE avatar_url IS NULL
  AND email IS NOT NULL
  AND email <> '';

-- Auto-sync avatar on profile change (email/Google avatar updates included)
CREATE OR REPLACE FUNCTION public.profiles_sync_avatar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- A Google sign-in pushes a real avatar; keep it. Otherwise fall back to Gravatar.
  NEW.avatar_url := COALESCE(NEW.avatar_url, public.gravatar_url(NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_avatar_trg ON public.profiles;
CREATE TRIGGER profiles_sync_avatar_trg
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_sync_avatar();

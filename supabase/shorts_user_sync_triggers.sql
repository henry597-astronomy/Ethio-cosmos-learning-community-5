-- Sync shorts display columns (user_name / user_avatar) automatically.
-- No email is stored or exposed anywhere.

-- On insert: pull display info from profiles
CREATE OR REPLACE FUNCTION public.shorts_sync_user_info()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT p.username, COALESCE(p.avatar_url, NULL)
  INTO NEW.user_name, NEW.user_avatar
  FROM public.profiles p
  WHERE p.id = NEW.user_id;
  NEW.user_name := COALESCE(NEW.user_name, 'User');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shorts_sync_user_info_trg ON public.shorts;
CREATE TRIGGER shorts_sync_user_info_trg
BEFORE INSERT ON public.shorts
FOR EACH ROW
EXECUTE FUNCTION public.shorts_sync_user_info();

-- On profile update: refresh shorts that belong to the user
CREATE OR REPLACE FUNCTION public.shorts_sync_user_info_on_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    UPDATE public.shorts
    SET user_name = NEW.username,
        user_avatar = COALESCE(NEW.avatar_url, NULL)
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shorts_user_update_sync_trg ON public.profiles;
CREATE TRIGGER shorts_user_update_sync_trg
AFTER UPDATE OF username, avatar_url ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.shorts_sync_user_info_on_profile_update();

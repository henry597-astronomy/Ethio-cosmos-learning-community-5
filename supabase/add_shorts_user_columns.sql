-- Denormalized display columns for shorts (no email exposed)
ALTER TABLE public.shorts ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.shorts ADD COLUMN IF NOT EXISTS user_avatar TEXT;

-- Backfill from profiles
UPDATE public.shorts s
SET user_name = p.username,
    user_avatar = COALESCE(p.avatar_url, NULL)
FROM public.profiles p
WHERE p.id = s.user_id
AND (s.user_name IS NULL OR s.user_avatar IS NULL);

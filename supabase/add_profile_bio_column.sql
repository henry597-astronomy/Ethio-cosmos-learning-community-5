-- Add editable bio to user profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

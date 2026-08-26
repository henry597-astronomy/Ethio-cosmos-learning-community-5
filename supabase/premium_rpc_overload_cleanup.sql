-- Remove the obsolete arbitrary-user overload. The ownership-safe one-argument function remains.
DROP FUNCTION IF EXISTS public.user_has_premium_feature(text, uuid);

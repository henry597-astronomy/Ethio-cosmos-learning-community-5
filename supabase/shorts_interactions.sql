-- Shorts interactions: one like per signed-in user and threaded-free comments.
-- Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS public.short_likes (
  short_id UUID NOT NULL REFERENCES public.shorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT short_likes_pkey PRIMARY KEY (short_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.short_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  short_id UUID NOT NULL REFERENCES public.shorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS short_likes_short_id_idx
  ON public.short_likes(short_id);

CREATE INDEX IF NOT EXISTS short_comments_short_id_created_at_idx
  ON public.short_comments(short_id, created_at ASC);

ALTER TABLE public.short_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read short likes" ON public.short_likes;
CREATE POLICY "Public read short likes"
  ON public.short_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users insert own short likes" ON public.short_likes;
CREATE POLICY "Users insert own short likes"
  ON public.short_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own short likes" ON public.short_likes;
CREATE POLICY "Users delete own short likes"
  ON public.short_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read short comments" ON public.short_comments;
CREATE POLICY "Public read short comments"
  ON public.short_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users insert own short comments" ON public.short_comments;
CREATE POLICY "Users insert own short comments"
  ON public.short_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own short comments or admin" ON public.short_comments;
CREATE POLICY "Users delete own short comments or admin"
  ON public.short_comments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.sync_short_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_short_id UUID;
BEGIN
  target_short_id := COALESCE(NEW.short_id, OLD.short_id);

  UPDATE public.shorts
  SET likes_count = (
    SELECT COUNT(*)::INTEGER
    FROM public.short_likes
    WHERE short_id = target_short_id
  )
  WHERE id = target_short_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS short_likes_count_after_insert ON public.short_likes;
CREATE TRIGGER short_likes_count_after_insert
  AFTER INSERT ON public.short_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_short_likes_count();

DROP TRIGGER IF EXISTS short_likes_count_after_delete ON public.short_likes;
CREATE TRIGGER short_likes_count_after_delete
  AFTER DELETE ON public.short_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_short_likes_count();

-- Backfill the existing denormalized counter before the trigger is used.
UPDATE public.shorts AS s
SET likes_count = (
  SELECT COUNT(*)::INTEGER
  FROM public.short_likes AS l
  WHERE l.short_id = s.id
);

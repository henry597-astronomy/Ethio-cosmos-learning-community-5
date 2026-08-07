-- ============================================================================
-- EthioCosmos — Telegram-Style Channel Migration (Updated)
-- Creates channel_posts, channel_reactions, channel_comments, and comment_reactions
-- ============================================================================

-- 1. Channel Posts Table
CREATE TABLE IF NOT EXISTS public.channel_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    message_text TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    pinned_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.channel_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_posts ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP WITH TIME ZONE;

DROP POLICY IF EXISTS "Public read channel posts" ON public.channel_posts;
CREATE POLICY "Public read channel posts"
ON public.channel_posts FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins insert channel posts" ON public.channel_posts;
CREATE POLICY "Admins insert channel posts"
ON public.channel_posts FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins delete channel posts" ON public.channel_posts;
CREATE POLICY "Admins delete channel posts"
ON public.channel_posts FOR DELETE
TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins update channel post pins" ON public.channel_posts;
CREATE POLICY "Admins update channel post pins"
ON public.channel_posts FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Keep pin/unpin atomic so only one channel post is pinned at a time.
CREATE OR REPLACE FUNCTION public.toggle_channel_post_pin(target_post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_is_pinned BOOLEAN;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Only administrators can pin channel posts';
    END IF;

    SELECT (pinned_at IS NOT NULL)
    INTO target_is_pinned
    FROM public.channel_posts
    WHERE id = target_post_id;

    IF target_is_pinned IS NULL THEN
        RAISE EXCEPTION 'Channel post not found';
    ELSIF target_is_pinned THEN
        UPDATE public.channel_posts SET pinned_at = NULL WHERE id = target_post_id;
    ELSE
        UPDATE public.channel_posts SET pinned_at = NULL WHERE pinned_at IS NOT NULL;
        UPDATE public.channel_posts SET pinned_at = NOW() WHERE id = target_post_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_channel_post_pin(UUID) TO authenticated;


-- 2. Channel Reactions Table (Post reactions)
CREATE TABLE IF NOT EXISTS public.channel_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES public.channel_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_post_user_emoji UNIQUE (post_id, user_id, emoji)
);

ALTER TABLE public.channel_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read channel reactions" ON public.channel_reactions;
CREATE POLICY "Public read channel reactions"
ON public.channel_reactions FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users manage own channel reactions" ON public.channel_reactions;
CREATE POLICY "Users manage own channel reactions"
ON public.channel_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own channel reactions" ON public.channel_reactions;
CREATE POLICY "Users delete own channel reactions"
ON public.channel_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- 3. Channel Comments Table
CREATE TABLE IF NOT EXISTS public.channel_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES public.channel_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.channel_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read channel comments" ON public.channel_comments;
CREATE POLICY "Public read channel comments"
ON public.channel_comments FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users insert channel comments" ON public.channel_comments;
CREATE POLICY "Users insert channel comments"
ON public.channel_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own channel comments or admin" ON public.channel_comments;
CREATE POLICY "Users delete own channel comments or admin"
ON public.channel_comments FOR DELETE
TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);


-- 4. Comment Reactions Table (One reaction per user per comment, just like Telegram)
CREATE TABLE IF NOT EXISTS public.comment_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES public.channel_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_comment_user UNIQUE (comment_id, user_id)
);

ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read comment reactions" ON public.comment_reactions;
CREATE POLICY "Public read comment reactions"
ON public.comment_reactions FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users manage own comment reactions" ON public.comment_reactions;
CREATE POLICY "Users manage own comment reactions"
ON public.comment_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own comment reactions" ON public.comment_reactions;
CREATE POLICY "Users update own comment reactions"
ON public.comment_reactions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own comment reactions" ON public.comment_reactions;
CREATE POLICY "Users delete own comment reactions"
ON public.comment_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

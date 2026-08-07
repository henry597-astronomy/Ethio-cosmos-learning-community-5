-- ============================================================================
-- EthioCosmos — Telegram-Style Channel Migration
-- Creates channel_posts (admin-only insert), channel_reactions, and channel_comments
-- ============================================================================

-- 1. Channel Posts Table
CREATE TABLE IF NOT EXISTS public.channel_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    message_text TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.channel_posts ENABLE ROW LEVEL SECURITY;

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


-- 2. Channel Reactions Table
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

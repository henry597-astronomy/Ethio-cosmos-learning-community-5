-- ============================================================================
-- EthioCosmos — Bugfix migrations and RLS policies
-- Run these in the Supabase SQL Editor (Dashboard → SQL → New query).
-- All statements are idempotent and safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- BUG 10 — handle_new_user() trigger
-- Ensures a `profiles` row is automatically created whenever a new user signs
-- up via Supabase Auth. Uses the metadata `username` if present, otherwise
-- falls back to the local-part of the email.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS policies — aligned with the real app schema
--   (topics, subtopics, lessons, quizzes, quiz_questions, quiz_attempts,
--    bookmarks, user_progress, chat_messages, profiles, site_content)
-- ---------------------------------------------------------------------------

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles readable" ON profiles;
CREATE POLICY "Public profiles readable" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- topics
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read topics" ON topics;
CREATE POLICY "Anyone can read topics" ON topics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage topics" ON topics;
CREATE POLICY "Admins manage topics" ON topics FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- subtopics
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read subtopics" ON subtopics;
CREATE POLICY "Anyone can read subtopics" ON subtopics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage subtopics" ON subtopics;
CREATE POLICY "Admins manage subtopics" ON subtopics FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- lessons
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read lessons" ON lessons;
CREATE POLICY "Anyone can read lessons" ON lessons FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage lessons" ON lessons;
CREATE POLICY "Admins manage lessons" ON lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- user_progress
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own progress" ON user_progress;
CREATE POLICY "Users manage own progress" ON user_progress FOR ALL USING (auth.uid() = user_id);

-- quizzes
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read quizzes" ON quizzes;
CREATE POLICY "Authenticated read quizzes" ON quizzes FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins manage quizzes" ON quizzes;
CREATE POLICY "Admins manage quizzes" ON quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- quiz_questions
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read quiz questions" ON quiz_questions;
CREATE POLICY "Authenticated read quiz questions" ON quiz_questions FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins manage quiz questions" ON quiz_questions;
CREATE POLICY "Admins manage quiz questions" ON quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- quiz_attempts
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own attempts" ON quiz_attempts;
CREATE POLICY "Users manage own attempts" ON quiz_attempts FOR ALL USING (auth.uid() = user_id);

-- bookmarks
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own bookmarks" ON bookmarks;
CREATE POLICY "Users manage own bookmarks" ON bookmarks FOR ALL USING (auth.uid() = user_id);

-- chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read chat" ON chat_messages;
CREATE POLICY "Authenticated read chat" ON chat_messages FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users insert own messages" ON chat_messages;
CREATE POLICY "Users insert own messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- site_content
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read site content" ON site_content;
CREATE POLICY "Anyone can read site content" ON site_content FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage site content" ON site_content;
CREATE POLICY "Admins manage site content" ON site_content FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

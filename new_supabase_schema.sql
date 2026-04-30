-- Ethio-Cosmos Supabase Schema Refactor
-- This script sets up the database schema and Row Level Security (RLS) policies
-- for the Ethio-Cosmos learning platform, migrating all CMS content from
-- localStorage to Supabase.

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables and policies to ensure a clean slate for the refactor
-- (Use with caution in production environments - backup your data first!)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Public read access for topics" ON public.topics;
DROP POLICY IF EXISTS "Admin full access for topics" ON public.topics;
DROP POLICY IF EXISTS "Public read access for subtopics" ON public.subtopics;
DROP POLICY IF EXISTS "Admin full access for subtopics" ON public.subtopics;
DROP POLICY IF EXISTS "Public read access for lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admin full access for lessons" ON public.lessons;
DROP POLICY IF EXISTS "Public read access for site_content" ON public.site_content;
DROP POLICY IF EXISTS "Admin full access for site_content" ON public.site_content;
DROP POLICY IF EXISTS "Public read access for quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Admin full access for quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Public read access for quiz_questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Admin full access for quiz_questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Public read access for chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert chat_messages" ON public.chat_messages;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.quiz_questions CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;
DROP TABLE IF EXISTS public.bookmarks CASCADE;
DROP TABLE IF EXISTS public.user_progress CASCADE;
DROP TABLE IF EXISTS public.site_content CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.subtopics CASCADE;
DROP TABLE IF EXISTS public.topics CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. Profiles Table (Linked to auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to create profile on signup (idempotent, never blocks sign-up)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
          NEW.raw_user_meta_data->>'username',
          NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'name',
          split_part(COALESCE(NEW.email, ''), '@', 1)
        ),
        -- Bootstrap admin role based on a specific email
        CASE WHEN NEW.email = 'henokgirma648@gmail.com' THEN 'admin' ELSE 'user' END
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- NEVER break the auth flow because of a profile-creation issue.
    -- The client will still be signed in; the profile will be created lazily.
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. CMS Tables (Topics, Subtopics, Lessons)
CREATE TABLE public.topics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, -- Changed to UUID for consistency and better management
    emoji TEXT,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.subtopics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, -- Changed to UUID
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    emoji TEXT,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.lessons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subtopic_id UUID REFERENCES public.subtopics(id) ON DELETE CASCADE UNIQUE, -- Ensure one lesson per subtopic
    title TEXT NOT NULL, -- Added title for lesson
    content_blocks JSONB DEFAULT '[]'::jsonb, -- Array of { type: 'text' | 'image', content: string }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Site Content (Homepage, About, Materials)
-- This table will store all dynamic content that was previously in DataContext.tsx
CREATE TABLE public.site_content (
    key TEXT PRIMARY KEY, -- e.g., 'homepage_hero', 'about_mission', 'materials_gallery'
    value JSONB NOT NULL, -- Stores the structured data as JSON
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Progress and Bookmarks
CREATE TABLE public.user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    subtopic_id UUID REFERENCES public.subtopics(id) ON DELETE CASCADE, -- Link to subtopic (lesson)
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, subtopic_id)
);

CREATE TABLE public.bookmarks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT DEFAULT 'lesson', -- e.g., 'lesson', 'material', 'quiz'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Quizzes
CREATE TABLE public.quizzes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT, -- Added description for quizzes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.quiz_questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of strings, e.g., '["Option A", "Option B"]'
    correct_answer INTEGER NOT NULL, -- 0-indexed position of the correct option
    explanation TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Chat Messages
CREATE TABLE public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    message_text TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- topics
CREATE POLICY "Public read access for topics" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Admin full access for topics" ON public.topics FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- subtopics
CREATE POLICY "Public read access for subtopics" ON public.subtopics FOR SELECT USING (true);
CREATE POLICY "Admin full access for subtopics" ON public.subtopics FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- lessons
CREATE POLICY "Public read access for lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Admin full access for lessons" ON public.lessons FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- site_content
CREATE POLICY "Public read access for site_content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "Admin full access for site_content" ON public.site_content FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- user_progress
CREATE POLICY "Users can view own progress." ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress." ON public.user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress." ON public.user_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress." ON public.user_progress FOR DELETE USING (auth.uid() = user_id);

-- bookmarks
CREATE POLICY "Users can view own bookmarks." ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookmarks." ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks." ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

-- quizzes
CREATE POLICY "Public read access for quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Admin full access for quizzes" ON public.quizzes FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- quiz_questions
CREATE POLICY "Public read access for quiz_questions" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "Admin full access for quiz_questions" ON public.quiz_questions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- chat_messages
CREATE POLICY "Public read access for chat_messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert chat_messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat_messages" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

-- Optional: Add a function to update topic lesson counts
CREATE OR REPLACE FUNCTION public.update_topic_lesson_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.topics
    SET lesson_count = (SELECT COUNT(l.id) FROM public.lessons l JOIN public.subtopics s ON l.subtopic_id = s.id WHERE s.topic_id = NEW.topic_id)
    WHERE id = NEW.topic_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update lesson count on subtopic changes (insert, update, delete)
-- This would require a 'lesson_count' column in the topics table.
-- For now, I'll omit this trigger as it requires a schema change to 'topics' table
-- which was not explicitly requested, and 'lessonCount' can be computed on the frontend.
-- If a 'lesson_count' column is added to 'topics', this trigger can be uncommented.

-- CREATE TRIGGER on_lesson_change
-- AFTER INSERT OR UPDATE OR DELETE ON public.lessons
-- FOR EACH ROW EXECUTE FUNCTION public.update_topic_lesson_count();

-- Initial data for site_content (example - will be populated by AdminPage)
INSERT INTO public.site_content (key, value) VALUES
('homepage_hero', '{ "heroTitle": "Ethio-cosmos-learning-community", "heroSubtitle": "Your Gateway to Astronomy Exploration & Learning" }'::jsonb) ON CONFLICT (key) DO NOTHING,
('homepage_feature_cards', '[{"icon":"🔭","title":"Discover the Cosmos","description":"Learn about stars, planets, galaxies, and more."},{"icon":"⭐","title":"Boost Your Stargazing","description":"Skywatching tips for beginners and enthusiasts."},{"icon":"📖","title":"Stay Informed","description":"News, guides, and resources on everything space."}]'::jsonb) ON CONFLICT (key) DO NOTHING,
('homepage_featured_topics', '[{"id":"stargazing","title":"Stargazing Basics for Beginners","description":"Master the fundamentals of observing the night sky with simple, beginner-friendly lessons.","image_url":"/images/featured-stargazing.jpg"},{"id":"events","title":"Key Astronomical Events","description":"Learn about eclipses, meteor showers, and other celestial phenomena you can observe this year.","image_url":"/images/featured-events.jpg"},{"id":"telescope","title":"Telescope Selection Guide","description":"Discover how to choose and use the perfect telescope for your astronomy learning journey.","image_url":"/images/featured-telescope.jpg"}]'::jsonb) ON CONFLICT (key) DO NOTHING,
('about_content', '{ "missionText": "At Ethio-cosmos-learning-community, our mission is to make the vast wonders of the cosmos accessible to everyone. We strive to foster a deeper understanding of astronomy and provide tools for individuals to embark on their own journeys of celestial discovery.", "whoWeAreText1": "We are a diverse team of passionate astronomers, educators, and space enthusiasts dedicated to connecting the world with the universe.", "whoWeAreText2": "Based in Ethiopia, we are committed to building a vibrant, global learning community. Our platform offers a wealth of curated knowledge, interactive guides, and expert-led content to help you explore the stars, planets, and galaxies from anywhere.", "missionImage": "/images/mission.jpg", "whoWeAreImage1": "/images/who-we-are-1.jpg", "whoWeAreImage2": "/images/who-we-are-2.jpg" }'::jsonb) ON CONFLICT (key) DO NOTHING,
('materials_gallery_images', '[{"id":"1","url":"/images/gallery-1.jpg","title":"Nebula"},{"id":"2","url":"/images/gallery-2.jpg","title":"Galaxy"},{"id":"3","url":"/images/gallery-3.jpg","title":"Star Cluster"},{"id":"4","url":"/images/gallery-4.jpg","title":"Planetary"}]'::jsonb) ON CONFLICT (key) DO NOTHING,
('materials_videos', '[{"id":"1","url":"/videos/space-intro.mp4","thumbnail":"/images/video-thumb-1.jpg","title":"Introduction to Space"}]'::jsonb) ON CONFLICT (key) DO NOTHING,
('materials_pdfs', '[{"id":"1","url":"/pdfs/astronomy-guide.pdf","title":"Astronomy Guide","label":"Astronomy Guide"},{"id":"2","url":"/pdfs/telescope-manual.pdf","title":"Telescope Manual","label":"Telescope Manual"}]'::jsonb) ON CONFLICT (key) DO NOTHING;

-- Initial data for topics (example - will be populated by AdminPage)
INSERT INTO public.topics (id, emoji, title, description, image_url, order_index) VALUES
('0a0e1a0e-1a0e-1a0e-1a0e-1a0e1a0e1a0e', '🚀', 'Fundamentals of Astronomy', 'Start your journey with the basics of astronomy and space observation', '/images/topic-fundamentals.jpg', 0) ON CONFLICT (id) DO NOTHING,
('1b1f2b2f-1b1f-1b1f-1b1f-1b1f2b2f2b2f', '🌍', 'Astronomy and Ethiopia', '7000 years of Ethiopian astronomical heritage and ancient knowledge', '/images/topic-ethiopia.jpg', 1) ON CONFLICT (id) DO NOTHING,
('2c2d3c3d-2c2d-2c2d-2c2d-2c2d3c3d3c3d', '☀️', 'Solar System', 'Our cosmic neighborhood and the Sun''s family of planets', '/images/topic-solar-system.jpg', 2) ON CONFLICT (id) DO NOTHING,
('3d3e4d4e-3d3e-3d3e-3d3e-3d3e4d4e4d4e', '🪐', 'Planets', 'Terrestrial and gas giants of our solar system', '/images/topic-planets.jpg', 3) ON CONFLICT (id) DO NOTHING,
('4e4f5e5f-4e4f-4e4f-4e4f-4e4f5e5f5e5f', '🌙', 'Moon', 'Earth''s natural satellite and its phases', '/images/topic-moon.jpg', 4) ON CONFLICT (id) DO NOTHING,
('5f6a7f8a-5f6a-5f6a-5f6a-5f6a7f8a7f8a', '⭐', 'Stars', 'The brilliant stars that light up our galaxy', '/images/topic-stars.jpg', 5) ON CONFLICT (id) DO NOTHING,
('6a7b8a9b-6a7b-6a7b-6a7b-6a7b8a9b8a9b', '🌀', 'Black Hole', 'Mysteries of gravitational giants', '/images/topic-black-hole.jpg', 6) ON CONFLICT (id) DO NOTHING,
('7b8c9b0c-7b8c-7b8c-7b8c-7b8c9b0c9b0c', '🔮', 'Worm Hole', 'Theoretical structures through space-time', '/images/topic-worm-hole.jpg', 7) ON CONFLICT (id) DO NOTHING,
('8c9d0c1d-8c9d-0c1d-8c9d-0c1d8c9d0c1d', '💫', 'Nebula', 'Cosmic clouds where stars are born', '/images/topic-nebula.jpg', 8) ON CONFLICT (id) DO NOTHING,
('9d0e1d2e-9d0e-1d2e-9d0e-1d2e9d0e1d2e', '☄️', 'Asteroid', 'Space rocks and minor celestial bodies', '/images/topic-asteroid.jpg', 9) ON CONFLICT (id) DO NOTHING;

-- Initial data for subtopics (example - will be populated by AdminPage)
INSERT INTO public.subtopics (id, topic_id, emoji, title, description, order_index) VALUES
('00000000-0000-0000-0000-000000000001', '0a0e1a0e-1a0e-1a0e-1a0e-1a0e1a0e1a0e', '🔭', 'Introduction to Astronomy', 'Understanding the study of celestial objects', 0) ON CONFLICT (id) DO NOTHING,
('00000000-0000-0000-0000-000000000002', '0a0e1a0e-1a0e-1a0e-1a0e-1a0e1a0e1a0e', '🌌', 'The Night Sky', 'Learning to navigate the stars above', 1) ON CONFLICT (id) DO NOTHING,
('00000000-0000-0000-0000-000000000003', '1b1f2b2f-1b1f-1b1f-1b1f-1b1f2b2f2b2f', '🏛️', 'Ancient Ethiopian Astronomy', 'Early stargazing traditions', 0) ON CONFLICT (id) DO NOTHING,
('00000000-0000-0000-0000-000000000004', '2c2d3c3d-2c2d-2c2d-2c2d-2c2d3c3d3c3d', '☀️', 'The Sun', 'Our star and its properties', 0) ON CONFLICT (id) DO NOTHING;

-- Initial data for lessons (example - will be populated by AdminPage)
INSERT INTO public.lessons (id, subtopic_id, title, content_blocks) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', 'What is Astronomy?', '[{"type": "text", "content": "Astronomy is the scientific study of celestial objects, space, and the physical universe as a whole."}]'::jsonb) ON CONFLICT (id) DO NOTHING;

-- Initial data for quizzes (example - will be populated by AdminPage)
INSERT INTO public.quizzes (id, title, description) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Fundamentals Quiz 1', 'Test your basic knowledge of astronomy fundamentals.') ON CONFLICT (id) DO NOTHING;

-- Initial data for quiz_questions (example - will be populated by AdminPage)
INSERT INTO public.quiz_questions (id, quiz_id, question_text, options, correct_answer, order_index) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'What is the closest star to Earth?', '["Proxima Centauri", "The Sun", "Sirius", "Alpha Centauri"]'::jsonb, 1, 0) ON CONFLICT (id) DO NOTHING,
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Which planet is known as the Red Planet?', '["Venus", "Jupiter", "Mars", "Saturn"]'::jsonb, 2, 1) ON CONFLICT (id) DO NOTHING;

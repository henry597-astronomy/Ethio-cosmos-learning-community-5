-- Safe classroom directory metadata for upcoming and published live classes.
-- The actual live state remains public.live_sessions.is_active and its heartbeat cleanup.
CREATE TABLE IF NOT EXISTS public.live_classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name TEXT NOT NULL UNIQUE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  grade_level TEXT,
  host_name TEXT,
  scheduled_start_at TIMESTAMPTZ NOT NULL,
  scheduled_end_at TIMESTAMPTZ,
  published BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'cancelled', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT live_classrooms_schedule_order
    CHECK (scheduled_end_at IS NULL OR scheduled_end_at > scheduled_start_at)
);

ALTER TABLE public.live_classrooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published upcoming classrooms are readable" ON public.live_classrooms;
DROP POLICY IF EXISTS "Admins can read all classrooms" ON public.live_classrooms;
DROP POLICY IF EXISTS "Admins can create classrooms" ON public.live_classrooms;
DROP POLICY IF EXISTS "Admins can update classrooms" ON public.live_classrooms;
DROP POLICY IF EXISTS "Admins can delete classrooms" ON public.live_classrooms;

CREATE POLICY "Published upcoming classrooms are readable"
  ON public.live_classrooms
  FOR SELECT
  TO anon, authenticated
  USING (
    published = true
    AND status = 'scheduled'
    AND (scheduled_end_at IS NULL OR scheduled_end_at > timezone('utc'::text, now()))
  );

CREATE POLICY "Admins can read all classrooms"
  ON public.live_classrooms
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

CREATE POLICY "Admins can create classrooms"
  ON public.live_classrooms
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Admins can update classrooms"
  ON public.live_classrooms
  FOR UPDATE
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Admins can delete classrooms"
  ON public.live_classrooms
  FOR DELETE
  TO authenticated
  USING (public.is_active_admin());

CREATE INDEX IF NOT EXISTS live_classrooms_directory_idx
  ON public.live_classrooms (published, status, scheduled_start_at);

CREATE INDEX IF NOT EXISTS live_classrooms_room_name_idx
  ON public.live_classrooms (room_name);

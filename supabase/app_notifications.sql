-- Durable app-wide notifications and user-controlled delivery preferences.
-- The client can read its own notifications and update only read state/preferences.
-- Server-side announcement and reminder creation uses the service role after auth checks.

CREATE TABLE IF NOT EXISTS public.app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('admin_announcement', 'classroom_reminder', 'classroom_live', 'system')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  action_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS app_notifications_user_created_idx
  ON public.app_notifications (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS app_notifications_user_dedupe_idx
  ON public.app_notifications (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own app notifications" ON public.app_notifications;
CREATE POLICY "Users can read their own app notifications"
  ON public.app_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can mark their own notifications read" ON public.app_notifications;
CREATE POLICY "Users can mark their own notifications read"
  ON public.app_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users cannot create app notifications" ON public.app_notifications;
DROP POLICY IF EXISTS "Users cannot delete app notifications" ON public.app_notifications;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  classroom_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  admin_announcements_enabled BOOLEAN NOT NULL DEFAULT true,
  browser_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  native_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_minutes INTEGER NOT NULL DEFAULT 15 CHECK (reminder_minutes BETWEEN 5 AND 120),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can read their own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert their own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update their own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_notification_preferences();

-- Realtime is used only for the authenticated user's own notification rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'app_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
  END IF;
END;
$$;

REVOKE ALL ON TABLE public.app_notifications FROM anon;
REVOKE ALL ON TABLE public.notification_preferences FROM anon;
GRANT SELECT, UPDATE ON TABLE public.app_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.notification_preferences TO authenticated;
GRANT ALL ON TABLE public.app_notifications TO service_role;
GRANT ALL ON TABLE public.notification_preferences TO service_role;


CREATE OR REPLACE FUNCTION public.protect_app_notification_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.notification_type IS DISTINCT FROM OLD.notification_type
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.body IS DISTINCT FROM OLD.body
       OR NEW.action_path IS DISTINCT FROM OLD.action_path
       OR NEW.metadata IS DISTINCT FROM OLD.metadata
       OR NEW.dedupe_key IS DISTINCT FROM OLD.dedupe_key
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Only notification read state can be changed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_app_notification_fields ON public.app_notifications;
CREATE TRIGGER protect_app_notification_fields
  BEFORE UPDATE ON public.app_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_app_notification_fields();

REVOKE ALL ON FUNCTION public.protect_app_notification_fields() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_app_notification_fields() TO authenticated, service_role;


-- Trigger-only helpers must not be callable through the PostgREST RPC surface.
REVOKE ALL ON FUNCTION public.touch_notification_preferences() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_notification_preferences() TO service_role;
REVOKE ALL ON FUNCTION public.protect_app_notification_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_app_notification_fields() TO service_role;


-- Channel posts are durable app notifications with their own per-user preference.
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS channel_posts_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.app_notifications
  DROP CONSTRAINT IF EXISTS app_notifications_notification_type_check;

ALTER TABLE public.app_notifications
  ADD CONSTRAINT app_notifications_notification_type_check
  CHECK (notification_type IN ('admin_announcement', 'classroom_reminder', 'classroom_live', 'channel_post', 'system'));

GRANT SELECT, INSERT, UPDATE ON TABLE public.notification_preferences TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_channel_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient RECORD;
  post_body TEXT;
BEGIN
  post_body := COALESCE(
    NULLIF(btrim(NEW.message_text), ''),
    CASE WHEN NEW.image_url IS NOT NULL THEN 'A new image was posted in the community channel.' ELSE 'A new post was published in the community channel.' END
  );
  post_body := left(post_body, 2000);

  FOR recipient IN
    SELECT p.id
    FROM public.profiles AS p
    LEFT JOIN public.notification_preferences AS np ON np.user_id = p.id
    WHERE p.id IS DISTINCT FROM NEW.user_id
      AND COALESCE(p.is_blocked, false) = false
      AND COALESCE(np.channel_posts_enabled, true) = true
  LOOP
    INSERT INTO public.app_notifications (
      user_id,
      notification_type,
      title,
      body,
      action_path,
      metadata,
      dedupe_key
    )
    VALUES (
      recipient.id,
      'channel_post',
      'New channel post',
      post_body,
      '/chat',
      jsonb_build_object('post_id', NEW.id, 'image_url', NEW.image_url),
      'channel-post:' || NEW.id::text
    )
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS channel_post_notification_fanout ON public.channel_posts;
CREATE TRIGGER channel_post_notification_fanout
  AFTER INSERT ON public.channel_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_channel_post();

REVOKE ALL ON FUNCTION public.notify_channel_post() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_channel_post() TO service_role;

-- Backfill the latest 50 existing posts once so the notification center reflects
-- the posts users can already see in the channel. ON CONFLICT makes reruns safe.
WITH recent_posts AS (
  SELECT id, user_id, message_text, image_url
  FROM public.channel_posts
  ORDER BY created_at DESC
  LIMIT 50
)
INSERT INTO public.app_notifications (
  user_id,
  notification_type,
  title,
  body,
  action_path,
  metadata,
  dedupe_key
)
SELECT
  p.id,
  'channel_post',
  'New channel post',
  left(COALESCE(
    NULLIF(btrim(rp.message_text), ''),
    CASE WHEN rp.image_url IS NOT NULL THEN 'A new image was posted in the community channel.' ELSE 'A new post was published in the community channel.' END
  ), 2000),
  '/chat',
  jsonb_build_object('post_id', rp.id, 'image_url', rp.image_url),
  'channel-post:' || rp.id::text
FROM recent_posts AS rp
JOIN public.profiles AS p ON p.id IS DISTINCT FROM rp.user_id
LEFT JOIN public.notification_preferences AS np ON np.user_id = p.id
WHERE COALESCE(p.is_blocked, false) = false
  AND COALESCE(np.channel_posts_enabled, true) = true
ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;


-- Users may clean only their own durable notification rows. This does not remove
-- source posts, preferences, or notifications belonging to another user.
DROP POLICY IF EXISTS "Users can delete their own app notifications" ON public.app_notifications;
CREATE POLICY "Users can delete their own app notifications"
  ON public.app_notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT DELETE ON TABLE public.app_notifications TO authenticated;

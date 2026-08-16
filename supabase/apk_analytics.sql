-- Anonymous APK and website analytics.
-- Raw events contain no email, user ID, IP address, or device fingerprint.
CREATE TABLE IF NOT EXISTS public.app_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL CHECK (event_name IN ('apk_download_click', 'apk_first_open', 'apk_open')),
  anonymous_id TEXT NOT NULL CHECK (char_length(anonymous_id) BETWEEN 16 AND 128),
  platform TEXT NOT NULL CHECK (platform IN ('web', 'android')),
  app_version INTEGER,
  release_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.app_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public analytics event inserts" ON public.app_analytics_events;
CREATE POLICY "Public analytics event inserts"
ON public.app_analytics_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(anonymous_id) BETWEEN 16 AND 128
  AND event_name IN ('apk_download_click', 'apk_first_open', 'apk_open')
  AND platform IN ('web', 'android')
);

DROP POLICY IF EXISTS "Admins read analytics events" ON public.app_analytics_events;
CREATE POLICY "Admins read analytics events"
ON public.app_analytics_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

CREATE INDEX IF NOT EXISTS idx_app_analytics_events_created_at
  ON public.app_analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_analytics_events_event_name
  ON public.app_analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_app_analytics_events_anonymous_id
  ON public.app_analytics_events(anonymous_id);

REVOKE UPDATE, DELETE ON public.app_analytics_events FROM anon, authenticated;
GRANT INSERT ON public.app_analytics_events TO anon, authenticated;
GRANT SELECT ON public.app_analytics_events TO authenticated;

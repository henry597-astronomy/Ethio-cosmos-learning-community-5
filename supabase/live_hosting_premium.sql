-- Add live classroom hosting to the existing feature-level Premium controls.
-- Default false preserves current hosting behavior until an Admin switches it on.
INSERT INTO public.premium_features (key, name, description, is_premium)
VALUES (
  'live_stream_hosting',
  'Live Classroom Hosting',
  'Start and host live classrooms for the community.',
  false
)
ON CONFLICT (key) DO NOTHING;

COMMENT ON COLUMN public.premium_features.is_premium IS
  'When true, access is restricted by the existing global Premium setting and current-user entitlement checks.';

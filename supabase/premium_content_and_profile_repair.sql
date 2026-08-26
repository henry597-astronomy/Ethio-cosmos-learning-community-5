-- EthioCosmos Premium content hierarchy and profile repair
-- Additive migration: preserves feature-level Premium and existing lesson flags.
-- A Premium topic protects its descendants; a Premium subtopic protects its lesson;
-- a Premium lesson protects only that lesson. Free items remain free.

CREATE TABLE IF NOT EXISTS public.premium_topics (
  topic_id uuid PRIMARY KEY REFERENCES public.topics(id) ON DELETE CASCADE,
  is_premium boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.premium_subtopics (
  subtopic_id uuid PRIMARY KEY REFERENCES public.subtopics(id) ON DELETE CASCADE,
  is_premium boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS premium_topics_premium_idx
  ON public.premium_topics (is_premium, updated_at DESC);

CREATE INDEX IF NOT EXISTS premium_subtopics_premium_idx
  ON public.premium_subtopics (is_premium, updated_at DESC);

DROP TRIGGER IF EXISTS premium_topics_updated_at ON public.premium_topics;
CREATE TRIGGER premium_topics_updated_at
  BEFORE UPDATE ON public.premium_topics
  FOR EACH ROW EXECUTE FUNCTION public.set_premium_updated_at();

DROP TRIGGER IF EXISTS premium_subtopics_updated_at ON public.premium_subtopics;
CREATE TRIGGER premium_subtopics_updated_at
  BEFORE UPDATE ON public.premium_subtopics
  FOR EACH ROW EXECUTE FUNCTION public.set_premium_updated_at();

ALTER TABLE public.premium_audit_log
  DROP CONSTRAINT IF EXISTS premium_audit_log_entity_type_check;
ALTER TABLE public.premium_audit_log
  ADD CONSTRAINT premium_audit_log_entity_type_check
  CHECK (entity_type IN ('settings', 'feature', 'plan', 'entitlement', 'payment', 'topic', 'subtopic', 'lesson'));

CREATE OR REPLACE FUNCTION public.log_premium_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  record_before jsonb;
  record_after jsonb;
  audit_entity_type text;
  audit_entity_id text;
  audit_target_user_id uuid;
BEGIN
  audit_entity_type := CASE TG_TABLE_NAME
    WHEN 'premium_settings' THEN 'settings'
    WHEN 'premium_features' THEN 'feature'
    WHEN 'premium_plans' THEN 'plan'
    WHEN 'premium_entitlements' THEN 'entitlement'
    WHEN 'premium_payments' THEN 'payment'
    WHEN 'premium_topics' THEN 'topic'
    WHEN 'premium_subtopics' THEN 'subtopic'
    WHEN 'premium_lessons' THEN 'lesson'
    ELSE TG_TABLE_NAME
  END;

  IF TG_OP = 'DELETE' THEN
    record_before := to_jsonb(OLD);
    record_after := NULL;
    audit_entity_id := COALESCE(record_before->>'id', record_before->>'key', record_before->>'topic_id', record_before->>'subtopic_id');
    audit_target_user_id := NULLIF(record_before->>'user_id', '')::uuid;
  ELSE
    record_before := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
    record_after := to_jsonb(NEW);
    audit_entity_id := COALESCE(record_after->>'id', record_after->>'key', record_after->>'topic_id', record_after->>'subtopic_id');
    audit_target_user_id := NULLIF(record_after->>'user_id', '')::uuid;
  END IF;

  INSERT INTO public.premium_audit_log (
    entity_type, entity_id, action, actor_id, target_user_id, before_data, after_data
  ) VALUES (
    audit_entity_type,
    audit_entity_id,
    lower(TG_OP),
    auth.uid(),
    audit_target_user_id,
    record_before,
    record_after
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS premium_topics_audit ON public.premium_topics;
CREATE TRIGGER premium_topics_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.premium_topics
  FOR EACH ROW EXECUTE FUNCTION public.log_premium_change();

DROP TRIGGER IF EXISTS premium_subtopics_audit ON public.premium_subtopics;
CREATE TRIGGER premium_subtopics_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.premium_subtopics
  FOR EACH ROW EXECUTE FUNCTION public.log_premium_change();

CREATE OR REPLACE FUNCTION public.user_has_premium_topic(requested_topic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM public.premium_topics flag
      WHERE flag.topic_id = requested_topic_id AND flag.is_premium
    ) THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.premium_settings settings
      WHERE settings.id = 'global' AND settings.is_enabled
    )
    AND EXISTS (
      SELECT 1 FROM public.premium_entitlements entitlement
      WHERE entitlement.user_id = auth.uid()
        AND entitlement.status = 'active'
        AND entitlement.starts_at <= now()
        AND (entitlement.expires_at IS NULL OR entitlement.expires_at > now())
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_premium_subtopic(requested_subtopic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM public.premium_subtopics flag
      WHERE flag.subtopic_id = requested_subtopic_id AND flag.is_premium
    ) THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.premium_settings settings
      WHERE settings.id = 'global' AND settings.is_enabled
    )
    AND EXISTS (
      SELECT 1 FROM public.premium_entitlements entitlement
      WHERE entitlement.user_id = auth.uid()
        AND entitlement.status = 'active'
        AND entitlement.starts_at <= now()
        AND (entitlement.expires_at IS NULL OR entitlement.expires_at > now())
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_learning(requested_topic_id uuid, requested_subtopic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subtopics subtopic
    WHERE subtopic.id = requested_subtopic_id
      AND subtopic.topic_id = requested_topic_id
  )
  AND public.user_has_premium_topic(requested_topic_id)
  AND public.user_has_premium_subtopic(requested_subtopic_id)
  AND public.user_has_premium_lesson(requested_subtopic_id);
$$;

DROP POLICY IF EXISTS "Public can read premium topic flags" ON public.premium_topics;
CREATE POLICY "Public can read premium topic flags"
  ON public.premium_topics FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage premium topic flags" ON public.premium_topics;
CREATE POLICY "Admins manage premium topic flags"
  ON public.premium_topics FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Public can read premium subtopic flags" ON public.premium_subtopics;
CREATE POLICY "Public can read premium subtopic flags"
  ON public.premium_subtopics FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage premium subtopic flags" ON public.premium_subtopics;
CREATE POLICY "Admins manage premium subtopic flags"
  ON public.premium_subtopics FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

ALTER TABLE public.premium_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_subtopics ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.premium_topics, public.premium_subtopics TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_premium_topic(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_premium_subtopic(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_learning(uuid, uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Public read access for lessons" ON public.lessons;
CREATE POLICY "Public read access for lessons"
  ON public.lessons FOR SELECT
  USING (
    public.user_can_access_learning(
      (SELECT subtopic.topic_id FROM public.subtopics subtopic WHERE subtopic.id = lessons.subtopic_id),
      lessons.subtopic_id
    )
  );

-- Repair any historical auth account that was created before the profile trigger
-- was active, and make future sign-ins self-healing without allowing arbitrary
-- profile creation or role escalation.
CREATE OR REPLACE FUNCTION public.unique_profile_username(base_username text, profile_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate text := COALESCE(NULLIF(trim(base_username), ''), 'User');
  suffix integer := 0;
BEGIN
  WHILE EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = candidate AND id <> profile_id
  ) LOOP
    suffix := suffix + 1;
    candidate := left(COALESCE(NULLIF(trim(base_username), ''), 'User'), 140 - length('-' || suffix::text)) || '-' || suffix::text;
  END LOOP;
  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.unique_profile_username(text, uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, role)
  VALUES (
    NEW.id,
    public.unique_profile_username(COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'full_name', NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''), 'User'), NEW.id),
    NEW.email,
    CASE WHEN NEW.email = 'henokgirma648@gmail.com' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(NULLIF(EXCLUDED.username, ''), public.profiles.username),
    email = COALESCE(EXCLUDED.email, public.profiles.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.ensure_current_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_auth_user auth.users%ROWTYPE;
BEGIN
  SELECT * INTO current_auth_user
  FROM auth.users
  WHERE id = auth.uid();

  IF current_auth_user.id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.profiles (id, username, email, role)
  VALUES (
    current_auth_user.id,
    public.unique_profile_username(COALESCE(current_auth_user.raw_user_meta_data->>'username', current_auth_user.raw_user_meta_data->>'full_name', NULLIF(split_part(COALESCE(current_auth_user.email, ''), '@', 1), ''), 'User'), current_auth_user.id),
    current_auth_user.email,
    CASE WHEN current_auth_user.email = 'henokgirma648@gmail.com' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(NULLIF(EXCLUDED.username, ''), public.profiles.username),
    email = COALESCE(EXCLUDED.email, public.profiles.email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_current_profile() TO authenticated;

INSERT INTO public.profiles (id, username, email, role)
SELECT
  auth_user.id,
  public.unique_profile_username(COALESCE(auth_user.raw_user_meta_data->>'username', auth_user.raw_user_meta_data->>'full_name', NULLIF(split_part(COALESCE(auth_user.email, ''), '@', 1), ''), 'User'), auth_user.id),
  auth_user.email,
  CASE WHEN auth_user.email = 'henokgirma648@gmail.com' THEN 'admin' ELSE 'user' END
FROM auth.users auth_user
LEFT JOIN public.profiles profile ON profile.id = auth_user.id
WHERE profile.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- EthioCosmos lesson-level Premium access
-- Idempotent migration. No payment credentials or client secrets are stored here.

CREATE TABLE IF NOT EXISTS public.premium_lessons (
  subtopic_id uuid PRIMARY KEY REFERENCES public.subtopics(id) ON DELETE CASCADE,
  is_premium boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS premium_lessons_premium_idx
  ON public.premium_lessons (is_premium, updated_at DESC);

DROP TRIGGER IF EXISTS premium_lessons_updated_at ON public.premium_lessons;
CREATE TRIGGER premium_lessons_updated_at
  BEFORE UPDATE ON public.premium_lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_premium_updated_at();

ALTER TABLE public.premium_audit_log
  DROP CONSTRAINT IF EXISTS premium_audit_log_entity_type_check;
ALTER TABLE public.premium_audit_log
  ADD CONSTRAINT premium_audit_log_entity_type_check
  CHECK (entity_type IN ('settings', 'feature', 'plan', 'entitlement', 'payment', 'lesson'));

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
    WHEN 'premium_lessons' THEN 'lesson'
    ELSE TG_TABLE_NAME
  END;

  IF TG_OP = 'DELETE' THEN
    record_before := to_jsonb(OLD);
    record_after := NULL;
    audit_entity_id := COALESCE(record_before->>'id', record_before->>'key', record_before->>'subtopic_id');
    audit_target_user_id := NULLIF(record_before->>'user_id', '')::uuid;
  ELSE
    record_before := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
    record_after := to_jsonb(NEW);
    audit_entity_id := COALESCE(record_after->>'id', record_after->>'key', record_after->>'subtopic_id');
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

DROP TRIGGER IF EXISTS premium_lessons_audit ON public.premium_lessons;
CREATE TRIGGER premium_lessons_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.premium_lessons
  FOR EACH ROW EXECUTE FUNCTION public.log_premium_change();

CREATE OR REPLACE FUNCTION public.user_has_premium_lesson(requested_subtopic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM public.premium_lessons flag
      WHERE flag.subtopic_id = requested_subtopic_id
        AND flag.is_premium
    ) THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.premium_settings settings
      WHERE settings.id = 'global'
        AND settings.is_enabled
    )
    AND EXISTS (
      SELECT 1
      FROM public.premium_entitlements entitlement
      WHERE entitlement.user_id = auth.uid()
        AND entitlement.status = 'active'
        AND entitlement.starts_at <= now()
        AND (entitlement.expires_at IS NULL OR entitlement.expires_at > now())
    )
  END;
$$;

DROP POLICY IF EXISTS "Public can read premium lesson flags" ON public.premium_lessons;
CREATE POLICY "Public can read premium lesson flags"
  ON public.premium_lessons FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage premium lesson flags" ON public.premium_lessons;
CREATE POLICY "Admins manage premium lesson flags"
  ON public.premium_lessons FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

ALTER TABLE public.premium_lessons ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.premium_lessons TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_premium_lesson(uuid) TO anon, authenticated;

-- Keep lesson titles/subtopics discoverable, but protect full lesson rows marked Premium.
DROP POLICY IF EXISTS "Public read access for lessons" ON public.lessons;
CREATE POLICY "Public read access for lessons"
  ON public.lessons FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1
      FROM public.premium_lessons flag
      WHERE flag.subtopic_id = lessons.subtopic_id
        AND flag.is_premium
    )
    OR public.user_has_premium_lesson(lessons.subtopic_id)
  );

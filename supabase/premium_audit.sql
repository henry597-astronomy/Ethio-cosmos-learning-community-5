-- Premium audit trail. This migration is additive and idempotent.

CREATE TABLE IF NOT EXISTS public.premium_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('settings', 'feature', 'plan', 'entitlement', 'payment')),
  entity_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS premium_audit_log_created_idx
  ON public.premium_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS premium_audit_log_target_user_idx
  ON public.premium_audit_log (target_user_id, created_at DESC);

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
    ELSE TG_TABLE_NAME
  END;

  IF TG_OP = 'DELETE' THEN
    record_before := to_jsonb(OLD);
    record_after := NULL;
    audit_entity_id := COALESCE(record_before->>'id', record_before->>'key', record_before->>'id');
    audit_target_user_id := NULLIF(record_before->>'user_id', '')::uuid;
  ELSE
    record_before := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
    record_after := to_jsonb(NEW);
    audit_entity_id := COALESCE(record_after->>'id', record_after->>'key');
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

DROP TRIGGER IF EXISTS premium_settings_audit ON public.premium_settings;
CREATE TRIGGER premium_settings_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.premium_settings
  FOR EACH ROW EXECUTE FUNCTION public.log_premium_change();

DROP TRIGGER IF EXISTS premium_features_audit ON public.premium_features;
CREATE TRIGGER premium_features_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.premium_features
  FOR EACH ROW EXECUTE FUNCTION public.log_premium_change();

DROP TRIGGER IF EXISTS premium_plans_audit ON public.premium_plans;
CREATE TRIGGER premium_plans_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.premium_plans
  FOR EACH ROW EXECUTE FUNCTION public.log_premium_change();

DROP TRIGGER IF EXISTS premium_entitlements_audit ON public.premium_entitlements;
CREATE TRIGGER premium_entitlements_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.premium_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.log_premium_change();

DROP TRIGGER IF EXISTS premium_payments_audit ON public.premium_payments;
CREATE TRIGGER premium_payments_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.premium_payments
  FOR EACH ROW EXECUTE FUNCTION public.log_premium_change();

ALTER TABLE public.premium_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read premium audit log" ON public.premium_audit_log;
CREATE POLICY "Admins read premium audit log"
  ON public.premium_audit_log FOR SELECT
  USING (public.is_active_admin());

GRANT SELECT ON public.premium_audit_log TO authenticated;

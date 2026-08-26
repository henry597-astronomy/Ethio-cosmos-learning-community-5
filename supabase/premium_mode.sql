-- EthioCosmos Premium mode foundation
-- Safe to apply more than once. No payment provider credentials are stored here.

CREATE TABLE IF NOT EXISTS public.premium_settings (
  id text PRIMARY KEY DEFAULT 'global',
  is_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT premium_settings_singleton CHECK (id = 'global')
);

CREATE TABLE IF NOT EXISTS public.premium_features (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_premium boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT premium_features_key_format CHECK (key ~ '^[a-z0-9_]+$')
);

CREATE TABLE IF NOT EXISTS public.premium_plans (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_birr numeric(12,2) NOT NULL DEFAULT 0 CHECK (price_birr >= 0),
  duration_days integer NOT NULL DEFAULT 30 CHECK (duration_days > 0 AND duration_days <= 3650),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT premium_plans_key_format CHECK (key ~ '^[a-z0-9_]+$')
);

CREATE TABLE IF NOT EXISTS public.premium_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'payment', 'test')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  note text NOT NULL DEFAULT '',
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT premium_entitlements_dates CHECK (expires_at IS NULL OR expires_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.premium_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_key text REFERENCES public.premium_plans(key) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'pending',
  provider_reference text,
  amount_birr numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_birr >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_reference)
);

CREATE INDEX IF NOT EXISTS premium_entitlements_user_status_idx
  ON public.premium_entitlements (user_id, status, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS premium_payments_user_status_idx
  ON public.premium_payments (user_id, status, created_at DESC);

INSERT INTO public.premium_settings (id, is_enabled)
VALUES ('global', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.premium_features (key, name, description, is_premium)
VALUES
  ('ai_tutor', 'Advanced AI Tutor', 'Extended lesson-aware tutoring and deeper explanations.', false),
  ('offline_learning_packs', 'Complete Offline Learning Packs', 'Download full official lessons, quizzes, and materials for offline study.', false),
  ('observatory_simulation', 'Observatory Simulation', 'The full source-faithful solar-system observatory experience.', false),
  ('advanced_learning_analytics', 'Advanced Learning Analytics', 'Detailed progress insights and learning recommendations.', false),
  ('premium_courses', 'Premium Course Paths', 'Specialized astronomy and space-science learning paths.', false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.premium_plans (key, name, description, price_birr, duration_days, is_active)
VALUES ('premium_30d', 'Premium 30 Days', 'A 30-day Premium access pass. Set the Ethiopian-birr price before enabling real payments.', 0, 30, false)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_premium_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS premium_settings_updated_at ON public.premium_settings;
CREATE TRIGGER premium_settings_updated_at
  BEFORE UPDATE ON public.premium_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_premium_updated_at();

DROP TRIGGER IF EXISTS premium_features_updated_at ON public.premium_features;
CREATE TRIGGER premium_features_updated_at
  BEFORE UPDATE ON public.premium_features
  FOR EACH ROW EXECUTE FUNCTION public.set_premium_updated_at();

DROP TRIGGER IF EXISTS premium_plans_updated_at ON public.premium_plans;
CREATE TRIGGER premium_plans_updated_at
  BEFORE UPDATE ON public.premium_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_premium_updated_at();

DROP TRIGGER IF EXISTS premium_entitlements_updated_at ON public.premium_entitlements;
CREATE TRIGGER premium_entitlements_updated_at
  BEFORE UPDATE ON public.premium_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_premium_updated_at();

DROP TRIGGER IF EXISTS premium_payments_updated_at ON public.premium_payments;
CREATE TRIGGER premium_payments_updated_at
  BEFORE UPDATE ON public.premium_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_premium_updated_at();

CREATE OR REPLACE FUNCTION public.user_has_premium_feature(
  requested_feature text,
  requested_user uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT CASE
        WHEN NOT settings.is_enabled THEN false
        WHEN NOT feature.is_premium THEN true
        ELSE EXISTS (
          SELECT 1
          FROM public.premium_entitlements entitlement
          WHERE entitlement.user_id = COALESCE(requested_user, auth.uid())
            AND entitlement.status = 'active'
            AND entitlement.starts_at <= now()
            AND (entitlement.expires_at IS NULL OR entitlement.expires_at > now())
        )
      END
      FROM public.premium_settings settings
      CROSS JOIN public.premium_features feature
      WHERE settings.id = 'global'
        AND feature.key = requested_feature
      LIMIT 1
    ),
    false
  );
$$;

ALTER TABLE public.premium_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read premium settings" ON public.premium_settings;
CREATE POLICY "Public can read premium settings"
  ON public.premium_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage premium settings" ON public.premium_settings;
CREATE POLICY "Admins manage premium settings"
  ON public.premium_settings FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Public can read premium features" ON public.premium_features;
CREATE POLICY "Public can read premium features"
  ON public.premium_features FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage premium features" ON public.premium_features;
CREATE POLICY "Admins manage premium features"
  ON public.premium_features FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Public can read active premium plans" ON public.premium_plans;
CREATE POLICY "Public can read active premium plans"
  ON public.premium_plans FOR SELECT USING (is_active = true OR public.is_active_admin());
DROP POLICY IF EXISTS "Admins manage premium plans" ON public.premium_plans;
CREATE POLICY "Admins manage premium plans"
  ON public.premium_plans FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Users can read own premium entitlements" ON public.premium_entitlements;
CREATE POLICY "Users can read own premium entitlements"
  ON public.premium_entitlements FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can read all premium entitlements" ON public.premium_entitlements;
CREATE POLICY "Admins can read all premium entitlements"
  ON public.premium_entitlements FOR SELECT
  USING (public.is_active_admin());
DROP POLICY IF EXISTS "Admins manage premium entitlements" ON public.premium_entitlements;
CREATE POLICY "Admins manage premium entitlements"
  ON public.premium_entitlements FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins read premium payments" ON public.premium_payments;
CREATE POLICY "Admins read premium payments"
  ON public.premium_payments FOR SELECT
  USING (public.is_active_admin());
DROP POLICY IF EXISTS "Admins manage premium payments" ON public.premium_payments;
CREATE POLICY "Admins manage premium payments"
  ON public.premium_payments FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

GRANT SELECT ON public.premium_settings, public.premium_features, public.premium_plans TO anon, authenticated;
GRANT SELECT ON public.premium_entitlements TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_premium_feature(text, uuid) TO anon, authenticated;

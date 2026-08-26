-- Prevent client-side entitlement probing for arbitrary users.
DROP FUNCTION IF EXISTS public.user_has_premium_feature(text, uuid);
REVOKE EXECUTE ON FUNCTION public.user_has_premium_feature(text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.user_has_premium_feature(requested_feature text)
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
          WHERE entitlement.user_id = auth.uid()
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

GRANT EXECUTE ON FUNCTION public.user_has_premium_feature(text) TO anon, authenticated;

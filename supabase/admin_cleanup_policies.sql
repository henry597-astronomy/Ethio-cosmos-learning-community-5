-- Admin-only permanent cleanup for operational audit and anonymous APK analytics data.
-- No insert, update, or public delete access is added.

DROP POLICY IF EXISTS "Admins delete premium audit log" ON public.premium_audit_log;
CREATE POLICY "Admins delete premium audit log"
  ON public.premium_audit_log FOR DELETE
  TO authenticated
  USING (public.is_active_admin());

GRANT DELETE ON public.premium_audit_log TO authenticated;

DROP POLICY IF EXISTS "Admins delete analytics events" ON public.app_analytics_events;
CREATE POLICY "Admins delete analytics events"
  ON public.app_analytics_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

GRANT DELETE ON public.app_analytics_events TO authenticated;
REVOKE DELETE ON public.app_analytics_events FROM anon;

COMMENT ON POLICY "Admins delete premium audit log" ON public.premium_audit_log IS
  'Only active administrators may permanently clear Premium audit activity.';
COMMENT ON POLICY "Admins delete analytics events" ON public.app_analytics_events IS
  'Only administrators may permanently clear anonymous APK analytics events.';

NOTIFY pgrst, 'reload schema';

-- Verification: these policies must exist after applying the migration.
SELECT policyname, tablename, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('premium_audit_log', 'app_analytics_events')
  AND cmd = 'DELETE';

-- LIMIT 10 is intentionally included for the migration verification query.
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'authenticated'
  AND table_schema = 'public'
  AND table_name IN ('premium_audit_log', 'app_analytics_events')
  AND privilege_type = 'DELETE'
LIMIT 10;

/*
The trailing marker is a comment only; the migration statements above are the
complete change. The application never grants delete access to anon users.
*/

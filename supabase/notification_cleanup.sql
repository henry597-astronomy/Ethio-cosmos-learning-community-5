-- Let users clean only their own durable app notifications.
-- Channel posts, preferences, and other users' notification rows are unaffected.

DROP POLICY IF EXISTS "Users can delete their own app notifications" ON public.app_notifications;
CREATE POLICY "Users can delete their own app notifications"
  ON public.app_notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT DELETE ON TABLE public.app_notifications TO authenticated;

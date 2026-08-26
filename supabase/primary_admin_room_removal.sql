-- Permanent classroom removal is reserved for the canonical primary administrator.
DROP POLICY IF EXISTS "Admins can delete classrooms" ON public.live_classrooms;
CREATE POLICY "Primary Admin can permanently delete classrooms"
  ON public.live_classrooms
  FOR DELETE
  TO authenticated
  USING (public.is_primary_admin());

-- ============================================================================
-- EthioCosmos — Admin Shorts Management
-- This migration adds admin capabilities to manage (delete) all shorts
-- ============================================================================

-- Drop existing policy that only allows users to delete their own shorts
DROP POLICY IF EXISTS "Users Delete Own Shorts" ON public.shorts;

-- Create new policy: Admins can delete any shorts, users can only delete their own
CREATE POLICY "Manage Shorts"
ON public.shorts FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Drop existing storage policy for shorts deletion
DROP POLICY IF EXISTS "Users Delete Own Shorts Storage" ON storage.objects;

-- Create new policy: Admins can delete any shorts storage objects, users can only delete their own
CREATE POLICY "Manage Shorts Storage"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shorts' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

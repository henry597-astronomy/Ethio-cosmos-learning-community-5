-- ============================================================================
-- EthioCosmos — FIX: Allow Admin Role Updates
-- This script fixes the issue where admin role assignments don't persist.
-- The problem: RLS policy "Users can update own profile" only allows users
-- to update their own profile, preventing admins from updating other users' roles.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: Drop the restrictive UPDATE policy on profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

-- ---------------------------------------------------------------------------
-- STEP 2: Create new RLS policies for profiles table
-- ---------------------------------------------------------------------------
-- Policy 1: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Policy 2: Admins can update any profile (for role management)
CREATE POLICY "Admins can update any profile" ON public.profiles 
  FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- STEP 3: Verify the fix
-- ---------------------------------------------------------------------------
-- Run this query to verify the policies exist:
-- SELECT policyname, qual, with_check FROM pg_policies WHERE tablename = 'profiles';

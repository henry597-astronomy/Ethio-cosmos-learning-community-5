-- Migration: Add user blocking feature
-- This migration adds the is_blocked column to profiles and fixes RLS policies
-- to allow admins to update user block status

-- 1. Add is_blocked column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- 2. Drop existing profile policies to recreate them with admin update support
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- 3. Recreate profiles policies with blocking support
-- Public can view all profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Admins can update any profile (including is_blocked status)
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

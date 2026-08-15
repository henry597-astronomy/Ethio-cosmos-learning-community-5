-- EthioCosmos security hardening
-- Apply this migration in Supabase SQL Editor after reviewing it.
-- It is intentionally idempotent and keeps the existing product flows intact.

-- ---------------------------------------------------------------------------
-- 1. Ensure profile columns used by the app and security checks exist.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 2. Security-definer helpers avoid RLS recursion in policies.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_primary_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(COALESCE(auth.jwt() ->> 'email', '')) = lower('henokgirma648@gmail.com');
$$;

CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND COALESCE(is_blocked, false) = false
  );
$$;

REVOKE ALL ON FUNCTION public.is_primary_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_primary_admin() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Make the signup trigger safe and preserve the existing primary admin.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, role, is_blocked)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'username',
      NEW.raw_user_meta_data ->> 'full_name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    NEW.email,
    CASE
      WHEN lower(COALESCE(NEW.email, '')) = lower('henokgirma648@gmail.com') THEN 'admin'
      ELSE 'user'
    END,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Prevent profile privilege escalation and identity tampering.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND auth.role() <> 'service_role' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Protected profile fields cannot be changed';
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role
       AND NOT public.is_primary_admin() THEN
      RAISE EXCEPTION 'Only the primary administrator can change roles';
    END IF;

    IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked
       AND NOT public.is_primary_admin()
       AND NOT public.is_active_admin() THEN
      RAISE EXCEPTION 'Only an administrator can change blocked status';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_security_fields ON public.profiles;
CREATE TRIGGER protect_profile_security_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_security_fields();

-- Remove known permissive/duplicate profile policies before recreating them.
DROP POLICY IF EXISTS "Public profiles readable" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are readable"
  ON public.profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own safe profile fields"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ---------------------------------------------------------------------------
-- 5. Protect live-session ownership and stop blocked users from publishing.
-- ---------------------------------------------------------------------------
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to active sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Allow hosts to update their own sessions" ON public.live_sessions;

CREATE POLICY "Anyone can read active live sessions"
  ON public.live_sessions
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can create their own live sessions"
  ON public.live_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = host_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND COALESCE(is_blocked, false) = false
    )
  );

CREATE POLICY "Hosts can update their own live sessions"
  ON public.live_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- Add a safe lookup index without assuming existing data is duplicate-free.
CREATE INDEX IF NOT EXISTS live_sessions_active_room_idx
  ON public.live_sessions (room_name)
  WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 6. Restrict public storage uploads to the admin-controlled content paths.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Full Access" ON storage.objects;

CREATE POLICY "Admin Full Access"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'uploads'
    AND public.is_active_admin()
  )
  WITH CHECK (
    bucket_id = 'uploads'
    AND public.is_active_admin()
    AND lower(storage.extension(name)) IN (
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
      'mp4', 'webm', 'mov', 'm4v'
    )
  );

DROP POLICY IF EXISTS "Authenticated Shorts Storage Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Shorts Storage Upload" ON storage.objects;

CREATE POLICY "Admin Shorts Storage Upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'shorts'
    AND public.is_active_admin()
    AND lower(storage.extension(name)) IN ('mp4', 'webm', 'mov', 'm4v')
  );

DROP POLICY IF EXISTS "Authenticated Shorts Create" ON public.shorts;
DROP POLICY IF EXISTS "Admin Shorts Create" ON public.shorts;
DROP POLICY IF EXISTS "Manage Shorts" ON public.shorts;

CREATE POLICY "Admin Shorts Create"
  ON public.shorts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_active_admin()
  );

CREATE POLICY "Manage Shorts"
  ON public.shorts
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_active_admin()
  );

DROP POLICY IF EXISTS "Manage Shorts Storage" ON storage.objects;
CREATE POLICY "Manage Shorts Storage"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'shorts'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_active_admin()
    )
  );

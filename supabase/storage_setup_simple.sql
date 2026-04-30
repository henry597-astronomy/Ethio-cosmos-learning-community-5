-- 1. Create the "uploads" bucket if it doesn't exist
-- We use the storage.buckets table directly which is usually allowed
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts
-- We don't use "ALTER TABLE" because that's what caused the "owner" error
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Full Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Access" ON storage.objects;

-- 3. Create Policy for public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'uploads' );

-- 4. Create Policy for authenticated users to upload
CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'uploads' );

-- 5. Create Policy for admins to have full access
CREATE POLICY "Admin Full Access"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'uploads' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

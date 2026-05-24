-- Create the "shorts" bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('shorts', 'shorts', true)
ON CONFLICT (id) DO NOTHING;

-- Create shorts table
CREATE TABLE IF NOT EXISTS public.shorts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    likes_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Enable RLS on public.shorts
ALTER TABLE public.shorts ENABLE ROW LEVEL SECURITY;

-- Policy for public read access to shorts
CREATE POLICY "Public Shorts Access"
ON public.shorts FOR SELECT
USING ( is_active = true );

-- Policy for authenticated users to create shorts
CREATE POLICY "Authenticated Shorts Create"
ON public.shorts FOR INSERT
TO authenticated
WITH CHECK ( auth.uid() = user_id );

-- Policy for users to delete their own shorts
CREATE POLICY "Users Delete Own Shorts"
ON public.shorts FOR DELETE
TO authenticated
USING ( auth.uid() = user_id );

-- Storage policies for the shorts bucket
CREATE POLICY "Public Shorts Storage Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'shorts' );

CREATE POLICY "Authenticated Shorts Storage Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'shorts' );

CREATE POLICY "Users Delete Own Shorts Storage"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'shorts' AND auth.uid()::text = (storage.foldername(name))[1] );

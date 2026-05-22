-- Create live_sessions table
CREATE TABLE IF NOT EXISTS public.live_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_name TEXT NOT NULL,
    host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    host_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- Enable RLS
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active sessions
CREATE POLICY "Allow public read access to active sessions"
ON public.live_sessions FOR SELECT
USING (is_active = true);

-- Allow authenticated users to insert their own sessions
CREATE POLICY "Allow authenticated users to insert their own sessions"
ON public.live_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = host_id);

-- Allow hosts to update their own sessions
CREATE POLICY "Allow hosts to update their own sessions"
ON public.live_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = host_id);

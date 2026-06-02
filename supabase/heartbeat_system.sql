-- Add last_heartbeat column to live_sessions
ALTER TABLE public.live_sessions 
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Function to deactivate sessions that haven't sent a heartbeat in 60 seconds
CREATE OR REPLACE FUNCTION deactivate_stale_sessions()
RETURNS void AS $$
BEGIN
    UPDATE public.live_sessions
    SET is_active = false
    WHERE is_active = true
    AND last_heartbeat < (timezone('utc'::text, now()) - interval '60 seconds');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_live_sessions_heartbeat ON public.live_sessions(last_heartbeat) WHERE is_active = true;

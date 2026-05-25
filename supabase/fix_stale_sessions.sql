-- Fix stale sessions issue by adding automatic cleanup and preventing duplicate active sessions

-- 1. Add a unique constraint to prevent multiple active sessions per host
ALTER TABLE public.live_sessions 
ADD CONSTRAINT unique_active_session_per_host 
UNIQUE (host_id, room_name) 
WHERE is_active = true;

-- 2. Add an index for faster queries on active sessions
CREATE INDEX IF NOT EXISTS idx_live_sessions_active 
ON public.live_sessions(is_active, created_at DESC);

-- 3. Add an index for faster lookups by host
CREATE INDEX IF NOT EXISTS idx_live_sessions_host 
ON public.live_sessions(host_id, is_active);

-- 4. Create a function to automatically clean up stale sessions
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void AS $$
BEGIN
  -- Mark sessions as inactive if they're older than 2 hours
  UPDATE public.live_sessions
  SET is_active = false
  WHERE is_active = true 
  AND created_at < NOW() - INTERVAL '2 hours';
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up stale sessions: % rows updated', ROW_COUNT;
END;
$$ LANGUAGE plpgsql;

-- 5. Create a trigger to automatically clean up stale sessions on insert
CREATE OR REPLACE FUNCTION trigger_cleanup_stale_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Clean up stale sessions whenever a new session is created
  PERFORM cleanup_stale_sessions();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cleanup_stale_sessions_trigger ON public.live_sessions;

CREATE TRIGGER cleanup_stale_sessions_trigger
BEFORE INSERT ON public.live_sessions
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_cleanup_stale_sessions();

-- 6. Deactivate any sessions older than 2 hours right now
UPDATE public.live_sessions
SET is_active = false
WHERE is_active = true 
AND created_at < NOW() - INTERVAL '2 hours';

-- 7. Add a comment explaining the constraint
COMMENT ON CONSTRAINT unique_active_session_per_host ON public.live_sessions 
IS 'Ensures only one active session per host at a time, preventing duplicate active sessions';

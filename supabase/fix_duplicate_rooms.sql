-- Fix duplicate room names issue
-- Add a unique partial index to ensure only one active session per room name
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_sessions_active_room_unique 
ON public.live_sessions(room_name) 
WHERE is_active = true;

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_live_sessions_active_room_unique IS 
'Ensures only one active live session per room name to prevent .single() query failures when joining';

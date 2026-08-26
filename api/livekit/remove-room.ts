import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticateSupabaseRequest,
  boundedString,
  cleanupRateLimitBuckets,
  enforceRateLimit,
  getClientAddress,
  handleOptions,
  isValidRoomName,
} from '../_lib/security.js';

type RemoveRoomBody = {
  room_name?: unknown;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res, 'OPTIONS, POST')) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  cleanupRateLimitBuckets();
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as RemoveRoomBody;
  const auth = await authenticateSupabaseRequest(req);
  const rateKey = `livekit-remove-room:${getClientAddress(req)}:${auth.user?.id || 'anonymous'}`;

  if (!enforceRateLimit(rateKey, 10, 60_000, res)) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  }

  if (!auth.user || !auth.client) {
    return res.status((auth as any).reason === 'configuration' ? 500 : 401).json({
      error: (auth as any).reason === 'configuration' ? 'Server configuration error' : 'Authentication required',
    });
  }

  const roomName = boundedString(body.room_name, 64);
  if (!roomName || !isValidRoomName(roomName)) {
    return res.status(400).json({ error: 'Invalid room name' });
  }

  const { data: isPrimaryAdmin, error: adminCheckError } = await auth.client.rpc('is_primary_admin');
  if (adminCheckError) {
    console.error('[livekit/remove-room] Primary Admin check failed:', adminCheckError.message);
    return res.status(500).json({ error: 'Unable to verify administrator access' });
  }
  if (isPrimaryAdmin !== true) {
    return res.status(403).json({ error: 'Only the primary administrator can permanently remove rooms' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[livekit/remove-room] Missing Supabase credentials');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: stoppedSessions, error: stopError } = await adminClient
      .from('live_sessions')
      .update({ is_active: false })
      .eq('room_name', roomName)
      .eq('is_active', true)
      .select('id');

    if (stopError) {
      console.error('[livekit/remove-room] Active session update failed:', stopError.message);
      return res.status(500).json({ error: 'Failed to stop the active room' });
    }

    const { data: deletedClassrooms, error: deleteError } = await adminClient
      .from('live_classrooms')
      .delete()
      .eq('room_name', roomName)
      .select('id');

    if (deleteError) {
      console.error('[livekit/remove-room] Classroom deletion failed:', deleteError.message);
      return res.status(500).json({ error: 'Failed to permanently remove the classroom' });
    }

    const stopped = stoppedSessions?.length || 0;
    const deleted = deletedClassrooms?.length || 0;
    if (stopped === 0 && deleted === 0) {
      return res.status(404).json({ error: 'Room was not found' });
    }

    return res.status(200).json({ success: true, stopped, deleted });
  } catch (error) {
    console.error('[livekit/remove-room] Request failed:', error);
    return res.status(500).json({ error: 'Failed to permanently remove the room' });
  }
}

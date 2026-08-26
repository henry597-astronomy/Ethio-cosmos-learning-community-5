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

type StopHostingBody = {
  room_name?: unknown;
  host_id?: unknown;
  token?: unknown;
  operation?: unknown;
};

function parseBody(req: VercelRequest): StopHostingBody {
  if (req.body && typeof req.body === 'object') return req.body as StopHostingBody;
  if (typeof req.body !== 'string' && !Buffer.isBuffer(req.body)) return {};

  const bodyString = typeof req.body === 'string' ? req.body : req.body.toString('utf8');
  const params = new URLSearchParams(bodyString);
  if (params.has('room_name') || params.has('token')) {
    return {
      room_name: params.get('room_name'),
      host_id: params.get('host_id'),
      token: params.get('token'),
    };
  }

  try {
    return JSON.parse(bodyString) as StopHostingBody;
  } catch {
    return {};
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res, 'OPTIONS, POST')) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  cleanupRateLimitBuckets();
  const body = parseBody(req);
  const auth = await authenticateSupabaseRequest(req, body.token);
  const rateKey = `livekit-stop:${getClientAddress(req)}:${auth.user?.id || 'anonymous'}`;

  if (!enforceRateLimit(rateKey, 20, 60_000, res)) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  }

  if (!auth.user) {
    return res.status((auth as any).reason === 'configuration' ? 500 : 401).json({
      error: (auth as any).reason === 'configuration' ? 'Server configuration error' : 'Authentication required',
    });
  }

  const roomName = boundedString(body.room_name, 64);
  if (!roomName || !isValidRoomName(roomName)) {
    return res.status(400).json({ error: 'Invalid room name' });
  }

  const isPermanentRemoval = body.operation === 'permanent_remove';
  if (isPermanentRemoval) {
    const { data: isPrimaryAdmin, error: primaryAdminError } = await auth.client.rpc('is_primary_admin');
    if (primaryAdminError) {
      console.error('[livekit/stop-hosting] Primary Admin check failed:', primaryAdminError.message);
      return res.status(500).json({ error: 'Unable to verify administrator access' });
    }
    if (isPrimaryAdmin !== true) {
      return res.status(403).json({ error: 'Only the primary administrator can permanently remove rooms' });
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[livekit/stop-hosting] Missing Supabase credentials');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (isPermanentRemoval) {
      const { data: sessions, error: sessionError } = await adminClient
        .from('live_sessions')
        .update({ is_active: false })
        .eq('room_name', roomName)
        .eq('is_active', true)
        .select('id');
      if (sessionError) {
        console.error('[livekit/stop-hosting] Permanent session deactivation failed:', sessionError.message);
        return res.status(500).json({ error: 'Failed to remove room access' });
      }

      const { data: classrooms, error: classroomError } = await adminClient
        .from('live_classrooms')
        .delete()
        .eq('room_name', roomName)
        .select('id');
      if (classroomError) {
        console.error('[livekit/stop-hosting] Permanent classroom removal failed:', classroomError.message);
        return res.status(500).json({ error: 'Failed to remove classroom metadata' });
      }

      const deactivatedSessions = sessions?.length || 0;
      const removedClassrooms = classrooms?.length || 0;
      if (deactivatedSessions === 0 && removedClassrooms === 0) {
        return res.status(404).json({ error: 'Room was not found' });
      }
      return res.status(200).json({ success: true, deactivatedSessions, removedClassrooms });
    }

    const { data, error } = await adminClient
      .from('live_sessions')
      .update({ is_active: false })
      .eq('host_id', auth.user.id)
      .eq('room_name', roomName)
      .eq('is_active', true)
      .select('id');

    if (error) {
      console.error('[livekit/stop-hosting] Session update failed:', error.message);
      return res.status(500).json({ error: 'Failed to stop hosting' });
    }

    return res.status(200).json({ success: true, updated: data?.length || 0 });
  } catch (error) {
    console.error('[livekit/stop-hosting] Request failed:', error);
    return res.status(500).json({ error: 'Failed to stop hosting' });
  }
}

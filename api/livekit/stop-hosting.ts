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
} from '../_lib/security';

type StopHostingBody = {
  room_name?: unknown;
  host_id?: unknown;
  token?: unknown;
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
    return res.status(auth.reason === 'configuration' ? 500 : 401).json({
      error: auth.reason === 'configuration' ? 'Server configuration error' : 'Authentication required',
    });
  }

  const roomName = boundedString(body.room_name, 64);
  if (!roomName || !isValidRoomName(roomName)) {
    return res.status(400).json({ error: 'Invalid room name' });
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

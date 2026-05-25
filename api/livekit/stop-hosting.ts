import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let host_id: string | undefined;
    let room_name: string | undefined;

    // Handle both JSON and FormData (from navigator.sendBeacon)
    if (typeof req.body === 'string' || req.body instanceof Buffer) {
      // FormData comes as buffer/string, parse it
      const bodyStr = typeof req.body === 'string' ? req.body : req.body.toString();
      if (bodyStr.includes('host_id=')) {
        // URL-encoded FormData
        const params = new URLSearchParams(bodyStr);
        host_id = params.get('host_id') || undefined;
        room_name = params.get('room_name') || undefined;
      } else {
        // Try JSON
        try {
          const json = JSON.parse(bodyStr);
          host_id = json.host_id;
          room_name = json.room_name;
        } catch (e) {
          console.warn('Could not parse body as JSON or FormData:', bodyStr);
        }
      }
    } else {
      // Regular JSON object
      host_id = req.body?.host_id;
      room_name = req.body?.room_name;
    }

    // Validate inputs
    if (!host_id || !room_name) {
      console.warn('Missing host_id or room_name:', { host_id, room_name, bodyType: typeof req.body });
      return res.status(400).json({ error: 'Missing host_id or room_name' });
    }

    // Get Supabase credentials from environment
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Deactivate the session
    const { error, data } = await supabase
      .from('live_sessions')
      .update({ is_active: false })
      .eq('host_id', host_id)
      .eq('room_name', room_name)
      .select();

    if (error) {
      console.error('Error stopping hosting:', error);
      return res.status(500).json({ error: 'Failed to stop hosting' });
    }

    console.log('Session stopped successfully:', { host_id, room_name, updated_rows: data?.length });
    return res.status(200).json({ success: true, updated: data?.length || 0 });
  } catch (error) {
    console.error('Stop hosting error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to stop hosting',
    });
  }
}

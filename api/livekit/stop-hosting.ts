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
    const { host_id, room_name } = req.body;

    // Validate inputs
    if (!host_id || !room_name) {
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
    const { error } = await supabase
      .from('live_sessions')
      .update({ is_active: false })
      .eq('host_id', host_id)
      .eq('room_name', room_name);

    if (error) {
      console.error('Error stopping hosting:', error);
      return res.status(500).json({ error: 'Failed to stop hosting' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Stop hosting error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to stop hosting',
    });
  }
}

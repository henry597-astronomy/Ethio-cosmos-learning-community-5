import { AccessToken } from 'livekit-server-sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins for mobile compatibility
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authorization = req.headers.authorization;
    const accessToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    if (!accessToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase public server configuration');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const { userName, roomName, isHost, avatarUrl, userId } = req.body || {};

    // Validate inputs
    if (!userName || !roomName) {
      return res.status(400).json({ error: 'Missing userName or roomName' });
    }

    if (userId && userId !== authData.user.id) {
      return res.status(403).json({ error: 'User identity mismatch' });
    }

    // Get environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('Missing LiveKit credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create access token
    const at = new AccessToken(apiKey, apiSecret);

    // Grant permissions
    // We allow everyone to publish so they can be promoted to co-host dynamically
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    // Use a unique identity
    const identity = isHost ? userName : `${userName}-${Math.random().toString(36).substring(2, 7)}`;
    at.identity = identity;
    at.name = userName;
    
    // Attach participant metadata
    const metadata = {
      avatar_url: avatarUrl || null,
      username: userName,
      participant_id: userId || null,
      role: isHost ? 'host' : 'viewer'
    };
    at.metadata = JSON.stringify(metadata);

    const token = await at.toJwt();

    return res.status(200).json({ 
      token,
      identity,
      metadata
    });
  } catch (error) {
    console.error('Token generation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate token',
    });
  }
}

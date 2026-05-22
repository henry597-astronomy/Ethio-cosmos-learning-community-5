import { AccessToken } from 'livekit-server-sdk';
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
    const { userName, roomName, isHost } = req.body;

    // Validate inputs
    if (!userName || !roomName) {
      return res.status(400).json({ error: 'Missing userName or roomName' });
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

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: isHost ? true : false,
      canPublishData: isHost ? true : false,
      canSubscribe: true,
    });

    // Use a unique identity to allow multiple viewers with same display name
    const identity = isHost ? userName : `${userName}-${Math.random().toString(36).substring(2, 7)}`;
    at.identity = identity;
    at.name = userName;

    const token = await at.toJwt();

    return res.status(200).json({ token });
  } catch (error) {
    console.error('Token generation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate token',
    });
  }
}

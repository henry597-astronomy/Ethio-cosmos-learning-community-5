import { AccessToken } from 'livekit-server-sdk';

/**
 * Generate a LiveKit access token for a user
 * This should be called from a backend API endpoint for security
 */
export async function generateLiveKitToken(
  userName: string,
  roomName: string,
  apiKey: string,
  apiSecret: string
): Promise<string> {
  const at = new AccessToken(apiKey, apiSecret);
  
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  });

  at.identity = userName;
  at.name = userName;

  return await at.toJwt();
}

/**
 * Generate a LiveKit access token for a viewer (read-only)
 */
export async function generateLiveKitViewerToken(
  userName: string,
  roomName: string,
  apiKey: string,
  apiSecret: string
): Promise<string> {
  const at = new AccessToken(apiKey, apiSecret);
  
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: false,
    canPublishData: false,
    canSubscribe: true,
  });

  at.identity = userName;
  at.name = userName;

  return await at.toJwt();
}

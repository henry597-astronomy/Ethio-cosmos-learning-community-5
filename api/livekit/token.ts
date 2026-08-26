import { AccessToken } from 'livekit-server-sdk';
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
import { requirePremiumFeature } from '../_lib/premium.js';

const SESSION_FRESHNESS_MS = 90 * 1000;

type TokenRequestBody = {
  roomName?: unknown;
  isHost?: unknown;
};

function getProfileDisplayName(
  profile: { username?: string | null } | null,
  user: { email?: string; user_metadata?: Record<string, unknown> },
): string {
  const metadata = user.user_metadata || {};
  const candidate = profile?.username
    || (typeof metadata.full_name === 'string' ? metadata.full_name : null)
    || (typeof metadata.name === 'string' ? metadata.name : null)
    || user.email?.split('@')[0]
    || 'User';

  return boundedString(candidate, 80) || 'User';
}

function getSafeAvatarUrl(
  profile: { avatar_url?: string | null } | null,
  user: { user_metadata?: Record<string, unknown> },
): string | null {
  const metadataAvatar = user.user_metadata?.avatar_url;
  const candidate = profile?.avatar_url || (typeof metadataAvatar === 'string' ? metadataAvatar : null);
  if (!candidate || candidate.length > 2048) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res, 'OPTIONS, POST')) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  cleanupRateLimitBuckets();
  const requestBody = (req.body && typeof req.body === 'object' ? req.body : {}) as TokenRequestBody;
  const auth = await authenticateSupabaseRequest(req);
  const rateKey = `livekit-token:${getClientAddress(req)}:${auth.user?.id || 'anonymous'}`;

  if (!enforceRateLimit(rateKey, 30, 60_000, res)) {
    return res.status(429).json({ error: 'Too many token requests. Please try again shortly.' });
  }

  if (!auth.user || !auth.client) {
    return res.status((auth as any).reason === 'configuration' ? 500 : 401).json({
      error: (auth as any).reason === 'configuration' ? 'Server configuration error' : 'Authentication required',
    });
  }

  const roomName = boundedString(requestBody.roomName, 64);
  if (!roomName || !isValidRoomName(roomName)) {
    return res.status(400).json({ error: 'Invalid room name' });
  }

  if (typeof requestBody.isHost !== 'boolean') {
    return res.status(400).json({ error: 'Invalid host flag' });
  }

  const isHost = requestBody.isHost;
  if (isHost) {
    const hostingAccess = await requirePremiumFeature(auth.client, 'live_stream_hosting');
    if ('status' in hostingAccess) {
      return res.status(hostingAccess.status).json({ error: hostingAccess.message });
    }
  }

  const { data: profile, error: profileError } = await auth.client
    .from('profiles')
    .select('username, avatar_url, is_blocked')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[livekit/token] Profile lookup failed:', profileError.message);
    return res.status(500).json({ error: 'Unable to verify account' });
  }

  if (!profile) {
    return res.status(403).json({ error: 'Account profile is not available' });
  }

  if (profile.is_blocked === true) {
    return res.status(403).json({ error: 'Account is blocked' });
  }

  let activeSessionQuery = auth.client
    .from('live_sessions')
    .select('id')
    .eq('room_name', roomName)
    .eq('is_active', true);
  if (!isHost) {
    activeSessionQuery = activeSessionQuery.gte(
      'last_heartbeat',
      new Date(Date.now() - SESSION_FRESHNESS_MS).toISOString(),
    );
  }
  const { data: activeSession, error: sessionError } = await activeSessionQuery
    .limit(1)
    .maybeSingle();

  if (sessionError) {
    console.error('[livekit/token] Active session lookup failed:', sessionError.message);
    return res.status(500).json({ error: 'Unable to verify live session' });
  }

  if (isHost && activeSession) {
    return res.status(409).json({ error: 'A live session with that name is already active' });
  }

  if (!isHost && !activeSession) {
    return res.status(404).json({ error: 'Live session is not active' });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    console.error('[livekit/token] Missing LiveKit credentials');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const identitySuffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replaceAll('-', '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
    const identity = `${auth.user.id}-${identitySuffix}`;
    const username = getProfileDisplayName(profile, auth.user);
    const avatarUrl = getSafeAvatarUrl(profile, auth.user);
    const metadata = {
      avatar_url: avatarUrl,
      username,
      participant_id: auth.user.id,
      role: isHost ? 'host' : 'viewer',
    };

    const at = new AccessToken(apiKey, apiSecret);
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: isHost,
      canPublishData: isHost,
      canSubscribe: true,
    });
    at.identity = identity;
    at.name = username;
    at.metadata = JSON.stringify(metadata);

    const token = await at.toJwt();
    return res.status(200).json({ token, identity, metadata });
  } catch (error) {
    console.error('[livekit/token] Token generation failed:', error);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
}

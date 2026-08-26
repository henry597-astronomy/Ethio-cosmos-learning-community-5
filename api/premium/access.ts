import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyApiSecurityHeaders,
  boundedString,
  cleanupRateLimitBuckets,
  enforceRateLimit,
  getClientAddress,
  handleOptions,
  authenticateSupabaseRequest,
} from '../_lib/security.js';
import { hasPremiumFeature } from '../_lib/premium.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res, 'OPTIONS, POST')) return;
  applyApiSecurityHeaders(req, res, 'OPTIONS, POST');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  cleanupRateLimitBuckets();
  const auth = await authenticateSupabaseRequest(req);
  const rateKey = `premium-access:${getClientAddress(req)}:${auth.user?.id || 'anonymous'}`;
  if (!enforceRateLimit(rateKey, 60, 60_000, res)) {
    return res.status(429).json({ error: 'Too many Premium access checks. Please try again shortly.' });
  }

  if (!auth.user || !auth.client) {
    const authReason = 'reason' in auth ? auth.reason : 'invalid';
    return res.status(authReason === 'configuration' ? 500 : 401).json({
      error: authReason === 'configuration' ? 'Server configuration error' : 'Authentication required',
    });
  }

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as { featureKey?: unknown };
  const featureKey = boundedString(body.featureKey, 80);
  if (!featureKey || !/^[a-z0-9_]+$/.test(featureKey)) {
    return res.status(400).json({ error: 'Invalid feature key' });
  }

  const result = await hasPremiumFeature(auth.client, featureKey);
  if (result.error) {
    console.error('[premium/access] Premium lookup failed:', result.error);
    return res.status(500).json({ error: 'Unable to verify Premium access' });
  }

  return res.status(200).json({ featureKey, allowed: result.allowed });
}

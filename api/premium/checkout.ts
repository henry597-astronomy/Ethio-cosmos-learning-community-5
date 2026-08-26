import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyApiSecurityHeaders,
  authenticateSupabaseRequest,
  boundedString,
  cleanupRateLimitBuckets,
  enforceRateLimit,
  getClientAddress,
  handleOptions,
} from '../_lib/security.js';
import { getPremiumProviderConfig } from '../_lib/premium.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res, 'OPTIONS, POST')) return;
  applyApiSecurityHeaders(req, res, 'OPTIONS, POST');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  cleanupRateLimitBuckets();
  const auth = await authenticateSupabaseRequest(req);
  const rateKey = `premium-checkout:${getClientAddress(req)}:${auth.user?.id || 'anonymous'}`;
  if (!enforceRateLimit(rateKey, 10, 60_000, res)) {
    return res.status(429).json({ error: 'Too many checkout attempts. Please try again shortly.' });
  }

  if (!auth.user || !auth.client) {
    const authReason = 'reason' in auth ? auth.reason : 'invalid';
    return res.status(authReason === 'configuration' ? 500 : 401).json({
      error: authReason === 'configuration' ? 'Server configuration error' : 'Authentication required',
    });
  }

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as { planKey?: unknown };
  const planKey = boundedString(body.planKey, 80);
  if (!planKey || !/^[a-z0-9_]+$/.test(planKey)) {
    return res.status(400).json({ error: 'Invalid plan key' });
  }

  const { data: plan, error: planError } = await auth.client
    .from('premium_plans')
    .select('key, name, price_birr, duration_days, is_active')
    .eq('key', planKey)
    .eq('is_active', true)
    .maybeSingle();
  if (planError) {
    console.error('[premium/checkout] Plan lookup failed:', planError.message);
    return res.status(500).json({ error: 'Unable to verify Premium plan' });
  }
  if (!plan) return res.status(404).json({ error: 'Premium plan is not available' });
  if (Number(plan.price_birr) <= 0) return res.status(409).json({ error: 'Premium plan pricing is not configured yet' });

  const provider = getPremiumProviderConfig();
  if (!provider.readyForCheckout) {
    return res.status(503).json({
      code: 'PAYMENT_PROVIDER_NOT_CONNECTED',
      provider: provider.provider,
      error: provider.reason,
    });
  }

  // Intentionally fail closed until a provider adapter is implemented and
  // verified against the merchant account's official checkout/webhook docs.
  return res.status(503).json({
    code: 'PAYMENT_ADAPTER_DISABLED',
    provider: provider.provider,
    error: 'Payment checkout is not activated yet.',
  });
}

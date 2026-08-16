import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyApiSecurityHeaders,
  boundedString,
  cleanupRateLimitBuckets,
  enforceRateLimit,
  getClientAddress,
  handleOptions,
} from '../_lib/security.js';

const EVENT_NAMES = new Set(['apk_download_click', 'apk_first_open', 'apk_open']);
const PLATFORMS = new Set(['web', 'android']);
const ANONYMOUS_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res, 'POST, OPTIONS')) return;
  applyApiSecurityHeaders(req, res, 'POST, OPTIONS');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  cleanupRateLimitBuckets();
  const address = getClientAddress(req);
  if (!enforceRateLimit(`analytics-event:${address}`, 60, 60_000, res)) {
    res.status(429).json({ error: 'Too many analytics events' });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
  const eventName = boundedString(body.eventName, 40);
  const anonymousId = boundedString(body.anonymousId, 128);
  const platform = boundedString(body.platform, 16);

  if (!eventName || !EVENT_NAMES.has(eventName)) {
    res.status(400).json({ error: 'Invalid analytics event' });
    return;
  }

  if (!anonymousId || !ANONYMOUS_ID_PATTERN.test(anonymousId)) {
    res.status(400).json({ error: 'Invalid analytics identifier' });
    return;
  }

  if (!platform || !PLATFORMS.has(platform)) {
    res.status(400).json({ error: 'Invalid analytics platform' });
    return;
  }

  if (eventName === 'apk_download_click' && platform !== 'web') {
    res.status(400).json({ error: 'Invalid analytics event platform' });
    return;
  }

  if ((eventName === 'apk_first_open' || eventName === 'apk_open') && platform !== 'android') {
    res.status(400).json({ error: 'Invalid analytics event platform' });
    return;
  }

  const appVersion = platform === 'android' && Number.isInteger(body.appVersion)
    ? Math.min(Math.max(Number(body.appVersion), 1), 999)
    : null;
  const releaseTag = platform === 'android' ? boundedString(body.releaseTag, 32) : null;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(503).json({ error: 'Analytics is not configured' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.from('app_analytics_events').insert({
    event_name: eventName,
    anonymous_id: anonymousId,
    platform,
    app_version: appVersion,
    release_tag: releaseTag,
  });

  if (error) {
    console.error('Unable to record analytics event:', error.message);
    res.status(500).json({ error: 'Unable to record analytics event' });
    return;
  }

  res.status(204).end();
}

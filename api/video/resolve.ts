import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyApiSecurityHeaders,
  boundedString,
  enforceRateLimit,
  getClientAddress,
  handleOptions,
} from '../_lib/security.js';

const ALLOWED_INPUT_HOSTS = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'vt.tiktok.com',
  'vm.tiktok.com',
  'm.tiktok.com',
]);

const ALLOWED_FINAL_HOSTS = new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com']);

function isAllowedHost(hostname: string, allowedHosts: Set<string>): boolean {
  const host = hostname.toLowerCase();
  return allowedHosts.has(host) || host.endsWith('.tiktok.com');
}

function isCanonicalTikTokPost(url: URL): boolean {
  return isAllowedHost(url.hostname, ALLOWED_FINAL_HOSTS)
    && /\/(@[\w.-]+\/video\/\d+|player\/v1\/\d+)/i.test(url.pathname);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res, 'POST, OPTIONS')) return;
  applyApiSecurityHeaders(req, res, 'POST, OPTIONS');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const address = getClientAddress(req);
  if (!enforceRateLimit(`video-resolve:${address}`, 30, 60_000, res)) {
    return res.status(429).json({ error: 'Too many video link requests. Please try again shortly.' });
  }

  const input = boundedString(req.body?.url, 2048);
  if (!input) return res.status(400).json({ error: 'A video URL is required.' });

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(input);
  } catch {
    return res.status(400).json({ error: 'The video URL is not valid.' });
  }

  if (sourceUrl.protocol !== 'https:' || !isAllowedHost(sourceUrl.hostname, ALLOWED_INPUT_HOSTS)) {
    return res.status(400).json({ error: 'Only TikTok links can be resolved.' });
  }

  if (isCanonicalTikTokPost(sourceUrl)) {
    return res.status(200).json({ url: sourceUrl.toString() });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(sourceUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EthioCosmosVideoResolver/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });

    const resolvedUrl = new URL(response.url);
    if (!isCanonicalTikTokPost(resolvedUrl)) {
      return res.status(422).json({ error: 'TikTok did not return a playable post link.' });
    }

    try {
      await response.body?.cancel();
    } catch {
      // The URL has already been resolved; body cleanup is best-effort.
    }

    return res.status(200).json({ url: resolvedUrl.toString() });
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'TikTok took too long to resolve the link.'
      : 'TikTok link could not be resolved.';
    return res.status(502).json({ error: message });
  } finally {
    clearTimeout(timeout);
  }
}

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function getHeader(req: VercelRequest, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function getAllowedOrigins(): Set<string> {
  const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([
    'https://ethio-cosmos-learning-community-5.vercel.app',
    'capacitor://localhost',
    'https://localhost',
    'http://localhost',
    'http://localhost:5173',
    ...configuredOrigins,
  ]);
}

export function applyApiSecurityHeaders(
  req: VercelRequest,
  res: VercelResponse,
  methods: string,
): void {
  const origin = getHeader(req, 'origin');
  const allowedOrigins = getAllowedOrigins();

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '600');

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
}

export function handleOptions(
  req: VercelRequest,
  res: VercelResponse,
  methods: string,
): boolean {
  applyApiSecurityHeaders(req, res, methods);
  if (req.method !== 'OPTIONS') return false;
  res.status(204).end();
  return true;
}

export function getBearerToken(req: VercelRequest, bodyToken?: unknown): string | null {
  const authorization = getHeader(req, 'authorization');
  if (authorization) {
    const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
    if (match?.[1]) return match[1];
  }

  return typeof bodyToken === 'string' && bodyToken.length > 0 && bodyToken.length <= 4096
    ? bodyToken
    : null;
}

export async function authenticateSupabaseRequest(
  req: VercelRequest,
  bodyToken?: unknown,
): Promise<
  | { user: User; client: SupabaseClient; token: string }
  | { user: null; client: null; token: null; reason: 'missing' | 'invalid' | 'configuration' }
> {
  const token = getBearerToken(req, bodyToken);
  if (!token) return { user: null, client: null, token: null, reason: 'missing' };

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, client: null, token: null, reason: 'configuration' };
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, client: null, token: null, reason: 'invalid' };
  }

  return { user: data.user, client, token };
}

export function getClientAddress(req: VercelRequest): string {
  const forwarded = getHeader(req, 'x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return getHeader(req, 'x-real-ip') || 'unknown';
}

export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  res: VercelResponse,
): boolean {
  const now = Date.now();
  const current = rateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))));
    return false;
  }

  current.count += 1;
  return true;
}

export function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

export function isValidRoomName(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value);
}

export function cleanupRateLimitBuckets(): void {
  if (rateLimitBuckets.size < 5000) return;
  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}

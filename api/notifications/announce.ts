import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyApiSecurityHeaders,
  authenticateSupabaseRequest,
  boundedString,
  enforceRateLimit,
} from '../_lib/security';

type AnnouncementBody = {
  title?: unknown;
  body?: unknown;
  action_path?: unknown;
};

function safeActionPath(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 200 || !value.startsWith('/') || value.startsWith('//')) return null;
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyApiSecurityHeaders(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as AnnouncementBody;
  const title = boundedString(body.title, 160);
  const announcementBody = boundedString(body.body, 2000);
  const actionPath = safeActionPath(body.action_path);
  if (!title || !announcementBody || (body.action_path !== undefined && body.action_path !== null && body.action_path !== '' && !actionPath)) {
    res.status(400).json({ error: 'A valid title and message are required.' });
    return;
  }

  const auth = await authenticateSupabaseRequest(req);
  if (!auth.user) {
    res.status(auth.reason === 'configuration' ? 500 : 401).json({ error: 'Authentication required' });
    return;
  }

  if (!enforceRateLimit(`admin-announcement:${auth.user.id}`, 3, 60 * 60 * 1000, res)) {
    res.status(429).json({ error: 'Announcement limit reached. Please try again later.' });
    return;
  }

  const { data: isAdmin, error: adminError } = await auth.client.rpc('is_active_admin');
  if (adminError || isAdmin !== true) {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Notification service is not configured' });
    return;
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profiles, error: recipientError } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('is_blocked', false)
    .limit(10000);
  if (recipientError) {
    res.status(500).json({ error: 'Could not load announcement recipients' });
    return;
  }

  const { data: preferenceRows, error: preferenceError } = await serviceClient
    .from('notification_preferences')
    .select('user_id, admin_announcements_enabled')
    .eq('admin_announcements_enabled', false)
    .limit(10000);
  if (preferenceError) {
    res.status(500).json({ error: 'Could not load notification preferences' });
    return;
  }
  const optedOutUserIds = new Set((preferenceRows || []).map((preference) => preference.user_id));
  const recipients = (profiles || []).filter((profile) => !optedOutUserIds.has(profile.id));

  const announcementId = `${auth.user.id}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  const rows = recipients.map((recipient) => ({
    user_id: recipient.id,
    notification_type: 'admin_announcement' as const,
    title,
    body: announcementBody,
    action_path: actionPath,
    metadata: { created_by: auth.user.id },
    dedupe_key: `admin-announcement:${announcementId}:${recipient.id}`,
  }));

  if (rows.length === 0) {
    res.status(200).json({ recipients: 0 });
    return;
  }

  const { error: insertError } = await serviceClient.from('app_notifications').insert(rows);
  if (insertError) {
    res.status(500).json({ error: 'Could not publish announcement' });
    return;
  }

  res.status(200).json({ recipients: rows.length });
}

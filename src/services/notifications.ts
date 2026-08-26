import { getApiUrl } from '@/lib/api-config';
import { supabase } from '@/supabase';

export async function createAdminAnnouncement(input: {
  title: string;
  body: string;
  action_path?: string | null;
}): Promise<number> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Authentication required');

  const response = await fetch(getApiUrl('/api/notifications/announce'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });
  const responseText = await response.text();
  let payload: { error?: string; recipients?: number } = {};
  try {
    payload = JSON.parse(responseText) as typeof payload;
  } catch {
    // Keep the HTTP status as the fallback when the server response is not JSON.
  }
  if (!response.ok) {
    throw new Error(payload.error || `Announcement failed (HTTP ${response.status})`);
  }
  return payload.recipients || 0;
}

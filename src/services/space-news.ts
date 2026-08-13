import { supabase } from '@/supabase';
import type { SpaceNews } from '@/types';

const SPACE_NEWS_FIELDS = 'id, external_id, title, summary, full_explanation, fun_fact, image_url, source_name, source_url, category, published_date, ai_generated, status, created_at, updated_at';

export async function getPublishedSpaceNews(limit = 12, utcDate?: string): Promise<SpaceNews[]> {
  let query = supabase
    .from('space_news')
    .select(SPACE_NEWS_FIELDS)
    .eq('status', 'published');

  if (utcDate) {
    const start = `${utcDate}T00:00:00.000Z`;
    const end = `${utcDate}T23:59:59.999Z`;
    query = query.gte('published_date', start).lte('published_date', end);
  }

  const { data, error } = await query
    .order('published_date', { ascending: false })
    .limit(limit);

  if (error) {
    // The table may not exist until the migration is applied; the Home page
    // should keep its existing hero instead of failing in that case.
    console.warn('[space-news] Could not load published items:', error.message);
    return [];
  }

  return (data as SpaceNews[]) ?? [];
}

export async function getLatestPublishedSpaceNews(): Promise<SpaceNews | null> {
  const items = await getPublishedSpaceNews(1);
  return items[0] ?? null;
}

export function getTwoHourSlotIndex(itemCount: number, timestamp = Date.now()): number {
  if (itemCount <= 1) return 0;
  const twoHourSlot = Math.floor(timestamp / (2 * 60 * 60 * 1000));
  return twoHourSlot % itemCount;
}

export { SPACE_NEWS_FIELDS };


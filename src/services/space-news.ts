import { supabase } from '@/supabase';
import type { SpaceNews } from '@/types';

const SPACE_NEWS_FIELDS = 'id, external_id, title, summary, full_explanation, fun_fact, image_url, source_name, source_url, category, published_date, ai_generated, status, created_at, updated_at';

type NewsCacheEntry = {
  items: SpaceNews[];
  storedAt: number;
};

const publishedNewsCache = new Map<string, NewsCacheEntry>();
const publishedNewsInFlight = new Map<string, Promise<SpaceNews[]>>();

function getNewsCacheKey(limit: number, utcDate?: string) {
  return `${limit}:${utcDate ?? 'latest'}`;
}

export function getCachedPublishedSpaceNews(limit = 12, utcDate?: string): SpaceNews[] | null {
  return publishedNewsCache.get(getNewsCacheKey(limit, utcDate))?.items ?? null;
}

function cachePublishedSpaceNews(limit: number, utcDate: string | undefined, items: SpaceNews[]) {
  publishedNewsCache.set(getNewsCacheKey(limit, utcDate), { items, storedAt: Date.now() });
}

export async function getPublishedSpaceNews(limit = 12, utcDate?: string): Promise<SpaceNews[]> {
  const cacheKey = getNewsCacheKey(limit, utcDate);
  const existing = publishedNewsInFlight.get(cacheKey);
  if (existing) return existing;

  const request = loadPublishedSpaceNews(limit, utcDate);
  publishedNewsInFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (publishedNewsInFlight.get(cacheKey) === request) publishedNewsInFlight.delete(cacheKey);
  }
}

async function loadPublishedSpaceNews(limit: number, utcDate?: string): Promise<SpaceNews[]> {
  const query = supabase
    .from('space_news')
    .select(SPACE_NEWS_FIELDS)
    .eq('status', 'published');

  if (utcDate) {
    const start = `${utcDate}T00:00:00.000Z`;
    const end = `${utcDate}T23:59:59.999Z`;
    const { data: dateFiltered, error: dateError } = await query
      .gte('published_date', start)
      .lte('published_date', end)
      .order('published_date', { ascending: false })
      .limit(limit);

    if (!dateError && dateFiltered && dateFiltered.length > 0) {
      const items = dateFiltered as SpaceNews[];
      cachePublishedSpaceNews(limit, utcDate, items);
      return items;
    }
  }

  // Fallback: if no news specifically for today is published yet, return the latest available published item
  const { data, error } = await supabase
    .from('space_news')
    .select(SPACE_NEWS_FIELDS)
    .eq('status', 'published')
    .order('published_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[space-news] Could not load published items:', error.message);
    return [];
  }

  const items = (data as SpaceNews[]) ?? [];
  cachePublishedSpaceNews(limit, utcDate, items);
  return items;
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

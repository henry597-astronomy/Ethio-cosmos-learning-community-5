import { supabase } from '@/supabase';
import type { SpaceNews } from '@/types';

export async function getLatestPublishedSpaceNews(): Promise<SpaceNews | null> {
  const { data, error } = await supabase
    .from('space_news')
    .select('id, external_id, title, summary, full_explanation, fun_fact, image_url, source_name, source_url, category, published_date, ai_generated, status, created_at, updated_at')
    .eq('status', 'published')
    .order('published_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // The table may not exist until the migration is applied; the Home page
    // should keep its existing hero instead of failing in that case.
    console.warn('[space-news] Could not load published item:', error.message);
    return null;
  }

  return (data as SpaceNews | null) ?? null;
}

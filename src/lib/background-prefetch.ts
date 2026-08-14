/**
 * Background Prefetch Utility
 * 
 * Intelligently discovers and caches all content when the app is online:
 * - All CMS data (topics, lessons, quizzes, materials)
 * - All images (topic images, gallery images, team avatars)
 * - All media (videos, PDFs)
 * - All static assets
 * 
 * Runs in the background without blocking the UI.
 */

import { supabase } from '@/supabase';
import type { Topic, Lesson, GalleryImage, VideoItem, PdfItem, AboutContent } from '@/types';

export interface PrefetchProgress {
  total: number;
  completed: number;
  currentItem: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  error?: string;
}

let prefetchProgress: PrefetchProgress = {
  total: 0,
  completed: 0,
  currentItem: '',
  status: 'idle',
};

// Callback for progress updates
let onProgressCallback: ((progress: PrefetchProgress) => void) | null = null;

export function setPrefetchProgressCallback(callback: (progress: PrefetchProgress) => void) {
  onProgressCallback = callback;
}

function updateProgress(update: Partial<PrefetchProgress>) {
  // Ensure we don't have race conditions with the completed count
  const nextCompleted = update.completed !== undefined 
    ? update.completed 
    : prefetchProgress.completed;
    
  prefetchProgress = { 
    ...prefetchProgress, 
    ...update,
    completed: nextCompleted 
  };
  onProgressCallback?.(prefetchProgress);
}

// Helper to safely increment completed count
function incrementCompleted() {
  updateProgress({ completed: prefetchProgress.completed + 1 });
}

/**
 * Extract all image URLs from content
 */
function extractImageUrls(data: any): string[] {
  const urls: Set<string> = new Set();

  function traverse(obj: any) {
    if (!obj) return;

    if (typeof obj === 'string' && obj.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
      urls.add(obj);
    } else if (typeof obj === 'object') {
      Object.values(obj).forEach((val) => traverse(val));
    }
  }

  traverse(data);
  return Array.from(urls);
}

/**
 * Send message to service worker
 */
function sendToServiceWorker(type: string, payload?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      console.warn('Service worker not available for prefetch');
      resolve({ success: true, message: 'SW not available' });
      return;
    }

    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      if (event.data.success) {
        resolve(event.data);
      } else {
        reject(new Error(event.data.error));
      }
    };

    navigator.serviceWorker.controller.postMessage(
      { type, payload },
      [channel.port2]
    );
  });
}

/**
 * Prefetch all topics and their images
 */
async function prefetchTopics(): Promise<string[]> {
  updateProgress({ currentItem: 'Fetching topics...' });

  const { data: topics, error } = await supabase
    .from('topics')
    .select('*')
    .order('order_index');

  if (error) throw error;

  const imageUrls = (topics || []).flatMap((topic: Topic) => {
    const urls = [];
    if (topic.image_url) urls.push(topic.image_url);
    return urls;
  });

  incrementCompleted();
  return imageUrls;
}

/**
 * Prefetch all subtopics
 */
async function prefetchSubtopics(): Promise<void> {
  updateProgress({ currentItem: 'Fetching subtopics...' });

  const { error } = await supabase
    .from('subtopics')
    .select('*');

  if (error) throw error;

  incrementCompleted();
}

/**
 * Prefetch all lessons and their images
 */
async function prefetchLessons(): Promise<string[]> {
  updateProgress({ currentItem: 'Fetching lessons...' });

  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('*');

  if (error) throw error;

  const imageUrls: string[] = [];
  (lessons || []).forEach((lesson: Lesson) => {
    if (lesson.content_blocks && Array.isArray(lesson.content_blocks)) {
      lesson.content_blocks.forEach((block: any) => {
        if (block.type === 'image' && block.content) {
          imageUrls.push(block.content);
        }
      });
    }
  });

  incrementCompleted();
  return imageUrls;
}

/**
 * Prefetch all quizzes and questions (Tests)
 */
async function prefetchQuizzes(): Promise<void> {
  updateProgress({ currentItem: 'Fetching tests and quizzes...' });

  const { data: quizzes, error: quizzesError } = await supabase
    .from('quizzes')
    .select('*');

  if (quizzesError) throw quizzesError;

  if (quizzes && quizzes.length > 0) {
    const { error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*');

    if (questionsError) throw questionsError;
  }

  incrementCompleted();
}

/**
 * Prefetch all site content (homepage, about, materials)
 */
async function prefetchSiteContent(): Promise<string[]> {
  updateProgress({ currentItem: 'Fetching site content...' });

  const { data: content, error } = await supabase
    .from('site_content')
    .select('*');

  if (error) throw error;

  const imageUrls: string[] = [];

  content?.forEach((item: any) => {
    const itemImages = extractImageUrls(item.value);
    imageUrls.push(...itemImages);
  });

  incrementCompleted();
  return imageUrls;
}

/**
 * Prefetch gallery images
 */
async function prefetchGalleryImages(): Promise<string[]> {
  updateProgress({ currentItem: 'Fetching gallery images...' });

  const { data: content, error } = await supabase
    .from('site_content')
    .select('value')
    .eq('key', 'materials_gallery_images')
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  const imageUrls: string[] = [];
  if (content?.value && Array.isArray(content.value)) {
    content.value.forEach((image: GalleryImage) => {
      if (image.url) imageUrls.push(image.url);
    });
  }

  incrementCompleted();
  return imageUrls;
}

/**
 * Prefetch materials (videos and PDFs)
 */
async function prefetchMaterials(): Promise<string[]> {
  updateProgress({ currentItem: 'Fetching materials...' });

  const mediaUrls: string[] = [];

  // Fetch videos
  const { data: videosContent, error: videosError } = await supabase
    .from('site_content')
    .select('value')
    .eq('key', 'materials_videos')
    .single();

  if (videosError && videosError.code !== 'PGRST116') throw videosError;

  if (videosContent?.value && Array.isArray(videosContent.value)) {
    videosContent.value.forEach((video: VideoItem) => {
      if (video.url) mediaUrls.push(video.url);
      if (video.thumbnail) mediaUrls.push(video.thumbnail);
    });
  }

  // Fetch PDFs
  const { data: pdfsContent, error: pdfsError } = await supabase
    .from('site_content')
    .select('value')
    .eq('key', 'materials_pdfs')
    .single();

  if (pdfsError && pdfsError.code !== 'PGRST116') throw pdfsError;

  if (pdfsContent?.value && Array.isArray(pdfsContent.value)) {
    pdfsContent.value.forEach((pdf: PdfItem) => {
      if (pdf.url) mediaUrls.push(pdf.url);
    });
  }

  incrementCompleted();
  return mediaUrls;
}

/**
 * Prefetch about page content (team images)
 */
async function prefetchPublicCommunityContent(): Promise<{ imageUrls: string[]; mediaUrls: string[] }> {
  updateProgress({ currentItem: 'Fetching community content...' });

  const [postsResult, reactionsResult, commentsResult, commentReactionsResult, spaceNewsResult, liveSessionsResult, shortsResult] = await Promise.all([
    supabase
      .from('channel_posts')
      .select('id, message_text, image_url, created_at, pinned_at, user_id, profiles ( username, bio, avatar_url, role )')
      .order('created_at', { ascending: true }),
    supabase.from('channel_reactions').select('*'),
    supabase
      .from('channel_comments')
      .select('id, post_id, user_id, content, created_at, profiles ( username, bio, avatar_url, role )')
      .order('created_at', { ascending: true }),
    supabase.from('comment_reactions').select('*'),
    supabase
      .from('space_news')
      .select('id, external_id, title, summary, full_explanation, fun_fact, image_url, source_name, source_url, category, published_date, ai_generated, status, created_at, updated_at')
      .eq('status', 'published')
      .order('published_date', { ascending: false })
      .limit(12),
    supabase.from('live_sessions').select('*').eq('is_active', true),
    supabase.from('shorts').select('*').eq('is_active', true).order('created_at', { ascending: false }),
  ]);

  const firstError = [
    postsResult.error,
    reactionsResult.error,
    commentsResult.error,
    commentReactionsResult.error,
    spaceNewsResult.error,
    liveSessionsResult.error,
    shortsResult.error,
  ].find(Boolean);

  if (firstError) {
    console.warn('[Prefetch] Some community data could not be cached:', firstError.message);
  }

  const imageUrls: string[] = [];
  const mediaUrls: string[] = [];
  const collect = (value: any) => {
    if (!value || typeof value !== 'string' || !/^https?:\/\//i.test(value)) return;
    if (/\.(jpg|jpeg|png|gif|svg|webp|ico)(\?|$)/i.test(value)) imageUrls.push(value);
    else if (/\.(mp4|webm|ogg|mp3|wav|pdf|m3u8)(\?|$)/i.test(value)) mediaUrls.push(value);
  };

  (postsResult.data || []).forEach((post: any) => {
    collect(post.image_url);
    collect(post.profiles?.avatar_url);
  });
  (commentsResult.data || []).forEach((comment: any) => collect(comment.profiles?.avatar_url));
  (spaceNewsResult.data || []).forEach((item: any) => collect(item.image_url));
  (shortsResult.data || []).forEach((short: any) => {
    collect(short.thumbnail_url || short.thumbnail);
    collect(short.video_url || short.url);
  });

  incrementCompleted();
  return { imageUrls, mediaUrls };
}

async function prefetchUserContent(): Promise<void> {
  updateProgress({ currentItem: 'Fetching signed-in data...' });

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (userId) {
    await Promise.all([
      supabase.from('profiles').select('id, username, bio, email, avatar_url, role, created_at, updated_at, is_blocked').eq('id', userId).maybeSingle(),
      supabase.from('user_progress').select('*').eq('user_id', userId),
      supabase.from('bookmarks').select('*').eq('user_id', userId),
    ]);
  }

  incrementCompleted();
}

/**
 * Prefetch about page content (team images)
 */
async function prefetchAboutContent(): Promise<string[]> {
  updateProgress({ currentItem: 'Fetching about content...' });

  const { data: content, error } = await supabase
    .from('site_content')
    .select('value')
    .eq('key', 'about_content')
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  const imageUrls: string[] = [];
  if (content?.value) {
    const aboutData = content.value as AboutContent;
    
    // Extract team member images
    if (aboutData.team) {
      ['platformCreators', 'educationalAdvisors', 'communityMembers'].forEach((group) => {
        const members = aboutData.team[group as keyof typeof aboutData.team];
        if (Array.isArray(members)) {
          members.forEach((member: any) => {
            if (member.image_url) imageUrls.push(member.image_url);
          });
        }
      });
    }
  }

  incrementCompleted();
  return imageUrls;
}

/**
 * Main prefetch function - downloads everything automatically
 */
export async function prefetchAllContent(): Promise<void> {
  console.log('[Prefetch] Starting comprehensive automatic content prefetch...');

  // Initialize progress
  updateProgress({
    status: 'running',
    completed: 0,
    total: 10, // Number of prefetch tasks
    error: undefined,
  });

  try {
    // Collect all URLs to cache
    const allImageUrls: Set<string> = new Set();
    const allMediaUrls: Set<string> = new Set();

    // Prefetch all content types in parallel where possible
    const [
      topicImages,
      _subtopics,
      lessonImages,
      _quizzes,
      siteContentImages,
      galleryImages,
      materials,
      aboutImages,
      communityContent,
      _userContent
    ] = await Promise.all([
      prefetchTopics(),
      prefetchSubtopics(),
      prefetchLessons(),
      prefetchQuizzes(),
      prefetchSiteContent(),
      prefetchGalleryImages(),
      prefetchMaterials(),
      prefetchAboutContent(),
      prefetchPublicCommunityContent(),
      prefetchUserContent()
    ]);

    topicImages.forEach(url => allImageUrls.add(url));
    lessonImages.forEach(url => allImageUrls.add(url));
    siteContentImages.forEach(url => allImageUrls.add(url));
    galleryImages.forEach(url => allImageUrls.add(url));
    materials.forEach(url => allMediaUrls.add(url));
    aboutImages.forEach(url => allImageUrls.add(url));
    communityContent.imageUrls.forEach(url => allImageUrls.add(url));
    communityContent.mediaUrls.forEach(url => allMediaUrls.add(url));

    // Send all URLs to service worker for caching
    if (allImageUrls.size > 0) {
      updateProgress({ currentItem: `Caching ${allImageUrls.size} images...` });
      await sendToServiceWorker('CACHE_URLS', {
        urls: Array.from(allImageUrls),
      });
    }

    if (allMediaUrls.size > 0) {
      updateProgress({ currentItem: `Caching ${allMediaUrls.size} media files...` });
      await sendToServiceWorker('CACHE_URLS', {
        urls: Array.from(allMediaUrls),
      });
    }

    updateProgress({
      status: 'completed',
      completed: prefetchProgress.total,
      currentItem: 'All content downloaded for offline use!',
    });

    console.log('[Prefetch] Completed successfully');
  } catch (error) {
    console.error('[Prefetch] Error:', error);
    updateProgress({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Get current prefetch progress
 */
export function getPrefetchProgress(): PrefetchProgress {
  return { ...prefetchProgress };
}

/**
 * Get cache size
 */
export async function getCacheSize(): Promise<number> {
  try {
    const result = await sendToServiceWorker('GET_CACHE_SIZE');
    return result.size || 0;
  } catch (error) {
    console.error('[Prefetch] Failed to get cache size:', error);
    return 0;
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  try {
    await sendToServiceWorker('CLEAR_CACHE');
    console.log('[Prefetch] All caches cleared');
  } catch (error) {
    console.error('[Prefetch] Failed to clear caches:', error);
    throw error;
  }
}

/**
 * Check if online and trigger prefetch automatically
 */
export function setupOnlineListener(): void {
  // Listen for online events
  window.addEventListener('online', () => {
    console.log('[Prefetch] Connection restored, starting automatic prefetch...');
    prefetchAllContent().catch((err) => {
      console.error('[Prefetch] Background prefetch failed:', err);
    });
  });

  // Trigger prefetch on app startup if online
  if (navigator.onLine) {
    // Delay slightly to allow the app to initialize first
    setTimeout(() => {
      prefetchAllContent().catch((err) => {
        console.error('[Prefetch] Initial prefetch failed:', err);
      });
    }, 5000);
  }
}

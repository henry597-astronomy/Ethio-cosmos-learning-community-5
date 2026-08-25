/**
 * Background Prefetch Utility
 * 
 * Intelligently discovers and caches all content when the app is online:
 * - Official CMS data only (topics, lessons, quizzes, materials, and about content)
 * - Necessary official images (topic images, gallery images, and team assets)
 * - Official media (videos and PDFs)
 * - All static assets
 * 
 * Runs in the background without blocking the UI.
 */

import { supabase } from '@/supabase';
import type { Topic, Lesson, GalleryImage, VideoItem, PdfItem, AboutContent, Quiz, QuizQuestion } from '@/types';
import { APP_LANGUAGE_STORAGE_KEY, type AppLanguage } from '@/context/AppLanguageContext';
import {
  OFFLINE_PACK_SCHEMA_VERSION,
  OFFLINE_PACK_VERSION,
  cacheOfflineData,
  clearOfflineData,
  getOfflineData,
  saveOfflinePackManifest,
} from '@/lib/offline-cache';

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

function stableDataHash(value: unknown): string {
  const serialized = JSON.stringify(value ?? null);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`;
}

async function getCachedSourceVersions(keys: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(keys.map(async (key) => {
    const value = await getOfflineData(key);
    return [key, stableDataHash(value)] as const;
  }));
  return Object.fromEntries(entries);
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

  const finalTopics = topics || [];
  await cacheOfflineData('topics', finalTopics);

  const imageUrls = finalTopics.flatMap((topic: Topic) => {
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

  const { data: subtopics, error } = await supabase
    .from('subtopics')
    .select('*');

  if (error) throw error;

  await cacheOfflineData('all_subtopics', subtopics || []);
  const topicIds = [...new Set((subtopics || []).map((subtopic: any) => subtopic.topic_id).filter(Boolean))];
  await Promise.all(topicIds.map((topicId) =>
    cacheOfflineData(`subtopics_${topicId}`, (subtopics || []).filter((item: any) => item.topic_id === topicId))
  ));

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
  await Promise.all((lessons || []).filter((lesson: Lesson) => Boolean(lesson.subtopic_id)).map((lesson: Lesson) =>
    cacheOfflineData(`lesson_${lesson.subtopic_id}`, lesson)
  ));
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

  const finalQuizzes = (quizzes || []) as Quiz[];
  await cacheOfflineData('quizzes', finalQuizzes);

  if (finalQuizzes.length > 0) {
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*');

    if (questionsError) throw questionsError;

    const finalQuestions = (questions || []) as QuizQuestion[];
    await cacheOfflineData('quiz_questions_all', finalQuestions);
    await Promise.all(finalQuizzes.map((quiz) =>
      cacheOfflineData(
        `quiz_questions_${quiz.id}`,
        finalQuestions.filter((question) => question.quiz_id === quiz.id),
      )
    ));
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

  await cacheOfflineData('site_content', content || []);
  await Promise.all((content || []).map((item: any) => cacheOfflineData(item.key, item.value)));

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
  await cacheOfflineData('materials_gallery_images', content?.value || []);
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

  await cacheOfflineData('materials_videos', videosContent?.value || []);
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

  await cacheOfflineData('materials_pdfs', pdfsContent?.value || []);
  if (pdfsContent?.value && Array.isArray(pdfsContent.value)) {
    pdfsContent.value.forEach((pdf: PdfItem) => {
      if (pdf.url) mediaUrls.push(pdf.url);
    });
  }

  incrementCompleted();
  return mediaUrls;
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

  await cacheOfflineData('about_content', content?.value || null);
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
const OFFICIAL_PACK_CONTENT_KEYS = [
  'topics',
  'all_subtopics',
  'site_content',
  'materials_gallery_images',
  'materials_videos',
  'materials_pdfs',
  'materials_groups',
  'about_content',
  'quizzes',
  'quiz_questions_all',
];

export async function downloadOfficialLearningPack(
  language: AppLanguage = 'en',
  requestedUserId?: string,
): Promise<void> {
  const sessionUserId = requestedUserId || (await supabase.auth.getSession()).data.session?.user?.id;
  if (!sessionUserId) throw new Error('Sign in to download official lessons for offline use.');

  console.log('[OfflinePack] Starting official learning-pack download:', language);
  updateProgress({
    status: 'running',
    completed: 0,
    total: 10,
    currentItem: 'Preparing official learning pack...',
    error: undefined,
  });

  await saveOfflinePackManifest({
    schemaVersion: OFFLINE_PACK_SCHEMA_VERSION,
    version: OFFLINE_PACK_VERSION,
    downloadedAt: Date.now(),
    userId: sessionUserId,
    language,
    status: 'downloading',
    contentKeys: OFFICIAL_PACK_CONTENT_KEYS,
    sourceVersions: {},
    mediaCount: 0,
    translationCount: 0,
  });

  try {
    const allImageUrls: Set<string> = new Set();
    const allMediaUrls: Set<string> = new Set();
    const [
      topicImages,
      ,
      lessonImages,
      ,
      siteContentImages,
      galleryImages,
      materials,
      aboutImages,
    ] = await Promise.all([
      prefetchTopics(),
      prefetchSubtopics(),
      prefetchLessons(),
      prefetchQuizzes(),
      prefetchSiteContent(),
      prefetchGalleryImages(),
      prefetchMaterials(),
      prefetchAboutContent(),
      prefetchUserContent(),
    ]);

    topicImages.forEach((url) => allImageUrls.add(url));
    lessonImages.forEach((url) => allImageUrls.add(url));
    siteContentImages.forEach((url) => allImageUrls.add(url));
    galleryImages.forEach((url) => allImageUrls.add(url));
    materials.forEach((url) => allMediaUrls.add(url));
    aboutImages.forEach((url) => allImageUrls.add(url));

    if (allImageUrls.size > 0) {
      updateProgress({ currentItem: `Caching ${allImageUrls.size} official images...` });
      await sendToServiceWorker('CACHE_URLS', { urls: Array.from(allImageUrls) });
    }

    if (allMediaUrls.size > 0) {
      updateProgress({ currentItem: `Caching ${allMediaUrls.size} official media files...` });
      await sendToServiceWorker('CACHE_URLS', { urls: Array.from(allMediaUrls) });
    }

    const sourceVersions = await getCachedSourceVersions(OFFICIAL_PACK_CONTENT_KEYS);
    await saveOfflinePackManifest({
      schemaVersion: OFFLINE_PACK_SCHEMA_VERSION,
      version: OFFLINE_PACK_VERSION,
      downloadedAt: Date.now(),
      userId: sessionUserId,
      language,
      status: 'complete',
      contentKeys: OFFICIAL_PACK_CONTENT_KEYS,
      sourceVersions,
      mediaCount: allImageUrls.size + allMediaUrls.size,
      translationCount: 0,
    });

    updateProgress({
      status: 'completed',
      completed: prefetchProgress.total,
      currentItem: 'Official learning pack is ready for offline use.',
    });
    console.log('[OfflinePack] Completed successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown offline-pack error.';
    console.error('[OfflinePack] Error:', error);
    await saveOfflinePackManifest({
      schemaVersion: OFFLINE_PACK_SCHEMA_VERSION,
      version: OFFLINE_PACK_VERSION,
      downloadedAt: Date.now(),
      userId: sessionUserId,
      language,
      status: 'error',
      contentKeys: OFFICIAL_PACK_CONTENT_KEYS,
      sourceVersions: {},
      mediaCount: 0,
      translationCount: 0,
      error: message,
    }).catch((manifestError) => console.warn('[OfflinePack] Could not save error status:', manifestError));
    updateProgress({ status: 'error', error: message });
    throw error;
  }
}

// Compatibility alias for existing update flows. It now downloads only the
// signed-in official learning pack instead of broad community data.
export const prefetchAllContent = downloadOfficialLearningPack;

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
    await clearOfflineData();
    console.log('[OfflinePack] All official offline data cleared');
  } catch (error) {
    console.error('[Prefetch] Failed to clear caches:', error);
    throw error;
  }
}

/**
 * Refresh an offline pack only after a signed-in user explicitly opted in.
 * This keeps guest sessions and community/user-generated data out of the
 * automatic background path.
 */
async function refreshOptedInPack(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId || window.localStorage.getItem(`ethio-offline-pack-opt-in:${userId}`) !== '1') return;
  const storedLanguage = window.localStorage.getItem(`${APP_LANGUAGE_STORAGE_KEY}:${userId}`);
  await downloadOfficialLearningPack(storedLanguage === 'am' ? 'am' : 'en', userId);
}

export function setupOnlineListener(): void {
  const refresh = () => {
    void refreshOptedInPack().catch((error) => {
      console.warn('[OfflinePack] Opted-in refresh failed:', error);
    });
  };

  window.addEventListener('online', refresh);
  if (navigator.onLine) window.setTimeout(refresh, 5000);
}

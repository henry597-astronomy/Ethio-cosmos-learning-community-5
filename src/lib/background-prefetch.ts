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
  prefetchProgress = { ...prefetchProgress, ...update };
  onProgressCallback?.(prefetchProgress);
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

  updateProgress({ completed: prefetchProgress.completed + 1 });
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

  updateProgress({ completed: prefetchProgress.completed + 1 });
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

  updateProgress({ completed: prefetchProgress.completed + 1 });
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

  updateProgress({ completed: prefetchProgress.completed + 1 });
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

  updateProgress({ completed: prefetchProgress.completed + 1 });
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

  updateProgress({ completed: prefetchProgress.completed + 1 });
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

  updateProgress({ completed: prefetchProgress.completed + 1 });
  return mediaUrls;
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

  updateProgress({ completed: prefetchProgress.completed + 1 });
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
    total: 8, // Number of prefetch tasks
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
      aboutImages
    ] = await Promise.all([
      prefetchTopics(),
      prefetchSubtopics(),
      prefetchLessons(),
      prefetchQuizzes(),
      prefetchSiteContent(),
      prefetchGalleryImages(),
      prefetchMaterials(),
      prefetchAboutContent()
    ]);

    topicImages.forEach(url => allImageUrls.add(url));
    lessonImages.forEach(url => allImageUrls.add(url));
    siteContentImages.forEach(url => allImageUrls.add(url));
    galleryImages.forEach(url => allImageUrls.add(url));
    materials.forEach(url => allMediaUrls.add(url));
    aboutImages.forEach(url => allImageUrls.add(url));

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

/**
 * Type definitions for background prefetch module
 */

export interface PrefetchProgress {
  total: number;
  completed: number;
  currentItem: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  error?: string;
}

export function setPrefetchProgressCallback(
  callback: (progress: PrefetchProgress) => void
): void;

export function downloadOfficialLearningPack(language?: 'en' | 'am', requestedUserId?: string): Promise<void>;
export function prefetchAllContent(language?: 'en' | 'am', requestedUserId?: string): Promise<void>;
export function saveSelectedLessonOffline(userId: string, language: 'en' | 'am', lesson: import('@/types').Lesson, topic?: import('@/types').Topic, subtopic?: import('@/types').Subtopic): Promise<void>;
export type MaterialSelection =
  | { type: 'gallery'; item: import('@/types').GalleryImage; group?: import('@/types').MaterialGroup }
  | { type: 'video'; item: import('@/types').VideoItem; group?: import('@/types').MaterialGroup }
  | { type: 'pdf'; item: import('@/types').PdfItem; group?: import('@/types').MaterialGroup };
export function saveSelectedMaterialOffline(userId: string, language: 'en' | 'am', selection: MaterialSelection): Promise<void>;

export function getPrefetchProgress(): PrefetchProgress;

export function getCacheSize(): Promise<number>;

export function clearAllCaches(): Promise<void>;

export function setupOnlineListener(): void;

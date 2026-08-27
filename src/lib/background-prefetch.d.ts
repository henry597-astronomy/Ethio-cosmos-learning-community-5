/**
 * Type definitions for the explicit offline-download module.
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

/** @deprecated Global packs are intentionally disabled. */
export function downloadOfficialLearningPack(): Promise<void>;
/** @deprecated Global packs are intentionally disabled. */
export function prefetchAllContent(): Promise<void>;

export function saveSelectedTopicOffline(userId: string, language: 'en' | 'am', topicId: string): Promise<void>;
export function saveSelectedLessonOffline(userId: string, language: 'en' | 'am', lesson: import('@/types').Lesson, topic?: import('@/types').Topic, subtopic?: import('@/types').Subtopic): Promise<void>;

export type MaterialSelection =
  | { type: 'gallery'; item: import('@/types').GalleryImage; group?: import('@/types').MaterialGroup }
  | { type: 'video'; item: import('@/types').VideoItem; group?: import('@/types').MaterialGroup }
  | { type: 'pdf'; item: import('@/types').PdfItem; group?: import('@/types').MaterialGroup };

export function saveSelectedMaterialOffline(userId: string, language: 'en' | 'am', selection: MaterialSelection): Promise<void>;
export function refreshSelectedOfflineContent(): Promise<void>;
export function getPrefetchProgress(): PrefetchProgress;
export function getCacheSize(): Promise<number>;
export function clearAllCaches(): Promise<void>;
export function setupOnlineListener(): void;

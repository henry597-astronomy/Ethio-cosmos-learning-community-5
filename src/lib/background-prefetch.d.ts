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

export function getPrefetchProgress(): PrefetchProgress;

export function getCacheSize(): Promise<number>;

export function clearAllCaches(): Promise<void>;

export function setupOnlineListener(): void;

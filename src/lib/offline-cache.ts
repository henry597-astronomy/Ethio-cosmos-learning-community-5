// Original CMS records are cached as read-only snapshots; they are never rewritten.
const DB_NAME = 'EthioCosmosOffline';
const DB_VERSION = 2;
const STORE_NAME = 'learning_data';

export const OFFLINE_PACK_VERSION = 'official-learning-v2';
export const OFFLINE_PACK_SCHEMA_VERSION = 2;
const LEGACY_READY_KEY = 'ethio-offline-cache-ready';
const APP_LANGUAGE_STORAGE_KEY = 'ethio-cosmos-language';

interface CachedData<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
}

export type OfflinePackStatus = 'downloading' | 'complete' | 'error';

export interface OfflinePackManifest {
  schemaVersion: number;
  version: string;
  downloadedAt: number;
  userId: string;
  language: 'en' | 'am';
  status: OfflinePackStatus;
  contentKeys: string[];
  sourceVersions: Record<string, string>;
  mediaCount: number;
  translationCount: number;
  error?: string;
}

let db: IDBDatabase | null = null;
let openingDb: Promise<void> | null = null;

export function getOfflinePackManifestKey(userId: string, language: 'en' | 'am'): string {
  return `offline_pack_manifest:${userId}:${language}`;
}

export async function initOfflineDb(): Promise<void> {
  if (db) return;
  if (openingDb) return openingDb;

  openingDb = new Promise<void>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Offline storage is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error('Unable to open offline storage.'));
    request.onsuccess = () => {
      db = request.result;
      db.onclose = () => {
        db = null;
      };
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  }).finally(() => {
    openingDb = null;
  });

  return openingDb;
}

export async function cacheOfflineData<T>(key: string, data: T): Promise<void> {
  await initOfflineDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({
      key,
      data,
      timestamp: Date.now(),
    } satisfies CachedData<T>);

    request.onerror = () => reject(request.error ?? new Error(`Unable to cache ${key}.`));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error(`Unable to cache ${key}.`));
  });
}

export async function getOfflineData<T = unknown>(key: string): Promise<T | null> {
  await initOfflineDb();

  return new Promise<T | null>((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onerror = () => reject(request.error ?? new Error(`Unable to read ${key}.`));
    request.onsuccess = () => {
      const result = request.result as CachedData<T> | undefined;
      resolve(result ? result.data : null);
    };
  });
}

function isCompleteManifest(manifest: OfflinePackManifest | null, userId: string, language: 'en' | 'am') {
  return Boolean(
    manifest
      && manifest.schemaVersion === OFFLINE_PACK_SCHEMA_VERSION
      && manifest.version === OFFLINE_PACK_VERSION
      && manifest.status === 'complete'
      && manifest.userId === userId
      && manifest.language === language
  );
}

export async function saveOfflinePackManifest(manifest: OfflinePackManifest): Promise<void> {
  const normalized: OfflinePackManifest = {
    ...manifest,
    schemaVersion: manifest.schemaVersion || OFFLINE_PACK_SCHEMA_VERSION,
    version: manifest.version || OFFLINE_PACK_VERSION,
    sourceVersions: manifest.sourceVersions || {},
    translationCount: manifest.translationCount || 0,
  };
  await cacheOfflineData(getOfflinePackManifestKey(normalized.userId, normalized.language), normalized);
  if (typeof window !== 'undefined') {
    const readyKey = `${LEGACY_READY_KEY}:${normalized.userId}:${normalized.language}`;
    if (normalized.status === 'complete') {
      window.localStorage.setItem(readyKey, '1');
      window.localStorage.setItem(LEGACY_READY_KEY, '1');
      window.dispatchEvent(new CustomEvent('ethio:offline-pack-updated', { detail: normalized }));
    } else {
      window.localStorage.removeItem(readyKey);
    }
  }
}

export async function getOfflinePackManifest(
  userId: string,
  language: 'en' | 'am',
): Promise<OfflinePackManifest | null> {
  try {
    const manifest = await getOfflineData<OfflinePackManifest>(getOfflinePackManifestKey(userId, language));
    return isCompleteManifest(manifest, userId, language) ? manifest : null;
  } catch (error) {
    console.warn('Offline pack manifest unavailable:', error);
    return null;
  }
}

function isOfficialPackKey(key: string): boolean {
  return key === 'topics'
    || key === 'all_subtopics'
    || key === 'site_content'
    || key === 'materials_gallery_images'
    || key === 'materials_videos'
    || key === 'materials_pdfs'
    || key === 'materials_groups'
    || key === 'about_content'
    || key === 'quizzes'
    || key === 'quiz_questions_all'
    || key.startsWith('subtopics_')
    || key.startsWith('lesson_')
    || key.startsWith('quiz_questions_');
}

/**
 * Serve a CMS record only when a complete pack exists for the current signed-in
 * account and its profile-selected locale. Ordinary cache entries and guest
 * sessions are never treated as an offline learning pack.
 */
export async function getValidatedOfflineData<T = unknown>(key: string): Promise<T | null> {
  if (typeof window === 'undefined' || !isOfficialPackKey(key)) return null;

  const token = await import('@/supabase').then(({ supabase }) => supabase.auth.getSession());
  const userId = token.data.session?.user?.id;
  if (!userId) return null;

  const storedLanguage = window.localStorage.getItem(`${APP_LANGUAGE_STORAGE_KEY}:${userId}`);
  const language: 'en' | 'am' = storedLanguage === 'am' ? 'am' : 'en';
  const manifest = await getOfflinePackManifest(userId, language);
  if (!manifest || !manifest.contentKeys.some((contentKey) => contentKey === key || (contentKey === 'all_subtopics' && key.startsWith('subtopics_')) || (contentKey === 'quiz_questions_all' && key.startsWith('quiz_questions_')) || (contentKey === 'all_subtopics' && key.startsWith('lesson_')))) {
    return null;
  }
  return getOfflineData<T>(key);
}

export async function clearOfflineData(): Promise<void> {
  await initOfflineDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error ?? new Error('Unable to clear offline storage.'));
    transaction.oncomplete = () => {
      if (typeof window !== 'undefined') {
        const keysToRemove = Object.keys(window.localStorage).filter((key) => key.startsWith(`${LEGACY_READY_KEY}:`));
        keysToRemove.forEach((key) => window.localStorage.removeItem(key));
        window.localStorage.removeItem(LEGACY_READY_KEY);
      }
      resolve();
    };
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to clear offline storage.'));
  });
}

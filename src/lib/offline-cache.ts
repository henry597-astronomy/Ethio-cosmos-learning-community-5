// IndexedDB stores read-only CMS snapshots and explicit offline selections.
// Original CMS records are never rewritten or translated in the cache.
const DB_NAME = 'EthioCosmosOffline';
const DB_VERSION = 3;
const STORE_NAME = 'learning_data';

// Version 3 intentionally invalidates the old all-content pack contract. New
// offline access must be earned by an explicit topic/material download.
export const OFFLINE_PACK_VERSION = 'explicit-downloads-v1';
export const OFFLINE_PACK_SCHEMA_VERSION = 3;
const LEGACY_READY_KEY = 'ethio-offline-cache-ready';
const APP_LANGUAGE_STORAGE_KEY = 'ethio-cosmos-language';

export const OFFLINE_OVERVIEW_KEYS = new Set([
  'homepage_hero',
  'homepage_feature_cards',
  'homepage_featured_topics',
  'about_content',
  'topics',
  'materials_groups',
  'materials_gallery_images',
  'materials_videos',
  'materials_pdfs',
  'all_subtopics',
]);

interface CachedData<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
}

export type OfflinePackStatus = 'downloading' | 'complete' | 'error';
export type OfflineMaterialType = 'gallery' | 'video' | 'pdf';

export interface OfflineMaterialSelectionRecord {
  id: string;
  type: OfflineMaterialType;
  cacheKey: string;
  mediaUrls: string[];
  cacheable: boolean;
  downloadedAt: number;
}

export interface OfflinePackManifest {
  schemaVersion: number;
  version: string;
  downloadedAt: number;
  userId: string;
  language: 'en' | 'am';
  status: OfflinePackStatus;
  // These keys are exact structured records that completed an explicit save.
  // Overview keys may also be present, but they do not unlock detail pages.
  contentKeys: string[];
  sourceVersions: Record<string, string>;
  mediaCount: number;
  translationCount: number;
  selectedTopicIds: string[];
  topicContentKeys: Record<string, string[]>;
  selectedMaterials: OfflineMaterialSelectionRecord[];
  error?: string;
}

let db: IDBDatabase | null = null;
let openingDb: Promise<void> | null = null;

export function getOfflinePackManifestKey(userId: string, language: 'en' | 'am'): string {
  return `offline_pack_manifest:${userId}:${language}`;
}

export function getOfflineMediaKey(url: string): string {
  let hash = 2166136261;
  for (let index = 0; index < url.length; index += 1) {
    hash ^= url.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `offline_media:${(hash >>> 0).toString(16)}`;
}

export function isOfflineOverviewKey(key: string): boolean {
  return OFFLINE_OVERVIEW_KEYS.has(key);
}

export function isOfflineDetailKey(key: string): boolean {
  return key.startsWith('subtopics_') || key.startsWith('lesson_');
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
      && Array.isArray(manifest.contentKeys)
      && Array.isArray(manifest.selectedTopicIds)
      && manifest.topicContentKeys && typeof manifest.topicContentKeys === 'object'
      && Array.isArray(manifest.selectedMaterials)
  );
}

export async function saveOfflinePackManifest(manifest: OfflinePackManifest): Promise<void> {
  const normalized: OfflinePackManifest = {
    ...manifest,
    schemaVersion: manifest.schemaVersion || OFFLINE_PACK_SCHEMA_VERSION,
    version: manifest.version || OFFLINE_PACK_VERSION,
    sourceVersions: manifest.sourceVersions || {},
    translationCount: manifest.translationCount || 0,
    selectedTopicIds: manifest.selectedTopicIds || [],
    topicContentKeys: manifest.topicContentKeys || {},
    selectedMaterials: manifest.selectedMaterials || [],
  };
  await cacheOfflineData(getOfflinePackManifestKey(normalized.userId, normalized.language), normalized);
  if (typeof window !== 'undefined') {
    const readyKey = `${LEGACY_READY_KEY}:${normalized.userId}:${normalized.language}`;
    if (normalized.status === 'complete') {
      window.localStorage.setItem(readyKey, '1');
      window.localStorage.removeItem(LEGACY_READY_KEY);
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

/**
 * Overview data is safe to show as a last-known shell snapshot. Detailed
 * learning records are only readable when their exact key was completed by an
 * explicit, current-user download.
 */
export async function getValidatedOfflineData<T = unknown>(key: string): Promise<T | null> {
  if (typeof window === 'undefined') return null;

  if (isOfflineOverviewKey(key)) {
    return getOfflineData<T>(key);
  }

  if (!isOfflineDetailKey(key)) return null;

  const token = await import('@/supabase').then(({ supabase }) => supabase.auth.getSession());
  const userId = token.data.session?.user?.id;
  if (!userId) return null;

  const storedLanguage = window.localStorage.getItem(`${APP_LANGUAGE_STORAGE_KEY}:${userId}`);
  const language: 'en' | 'am' = storedLanguage === 'am' ? 'am' : 'en';
  const manifest = await getOfflinePackManifest(userId, language);
  if (!manifest?.contentKeys.includes(key)) return null;
  return getOfflineData<T>(key);
}

export async function getExplicitMaterialSelection(
  userId: string,
  language: 'en' | 'am',
  materialId: string,
  type: OfflineMaterialType,
): Promise<OfflineMaterialSelectionRecord | null> {
  const manifest = await getOfflinePackManifest(userId, language);
  return manifest?.selectedMaterials.find((item) => item.id === materialId && item.type === type) || null;
}

export async function isTopicOfflineReady(
  userId: string,
  language: 'en' | 'am',
  topicId: string,
): Promise<boolean> {
  const manifest = await getOfflinePackManifest(userId, language);
  if (!manifest?.selectedTopicIds.includes(topicId) || !manifest.contentKeys.includes(`subtopics_${topicId}`)) return false;
  const topicKeys = manifest.topicContentKeys[topicId] || [];
  if (!topicKeys.includes(`subtopics_${topicId}`)) return false;
  const records = await Promise.all(topicKeys.map((key) => getOfflineData<unknown>(key)));
  return records.every((record) => record !== null);
}

export async function isMaterialOfflineReady(
  userId: string,
  language: 'en' | 'am',
  materialId: string,
  type: OfflineMaterialType,
): Promise<boolean> {
  const selection = await getExplicitMaterialSelection(userId, language, materialId, type);
  if (!selection) return false;
  const cached = await getOfflineData<unknown>(selection.cacheKey);
  return cached !== null;
}

export async function getValidatedOfflineMaterial<T = unknown>(
  userId: string,
  language: 'en' | 'am',
  materialId: string,
  type: OfflineMaterialType,
): Promise<T | null> {
  const selection = await getExplicitMaterialSelection(userId, language, materialId, type);
  return selection ? getOfflineData<T>(selection.cacheKey) : null;
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

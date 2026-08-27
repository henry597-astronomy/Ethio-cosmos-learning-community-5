import { supabase } from '@/supabase';
import { getVideoType } from '@/lib/video-utils';
import type { Topic, Subtopic, Lesson, GalleryImage, VideoItem, PdfItem, GroupedMaterials, MaterialGroup } from '@/types';
import type { AppLanguage } from '@/context/AppLanguageContext';
import {
  OFFLINE_PACK_SCHEMA_VERSION,
  OFFLINE_PACK_VERSION,
  cacheOfflineData,
  clearOfflineData,
  getOfflineData,
  getOfflineMediaKey,
  getOfflinePackManifest,
  saveOfflinePackManifest,
  type OfflineMaterialSelectionRecord,
  type OfflinePackManifest,
} from '@/lib/offline-cache';
import {
  getAboutContent,
  getHomepageFeatureCards,
  getHomepageFeaturedTopics,
  getHomepageHero,
  getMaterialsGroups,
  getTopics,
  getAllSubtopics,
} from '@/services/cms';

export interface PrefetchProgress {
  total: number;
  completed: number;
  currentItem: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  error?: string;
}

export interface OfflineCacheEntry {
  key: string;
  data: unknown;
}

export interface OfflineSelectionInput {
  userId: string;
  language: AppLanguage;
  entries: OfflineCacheEntry[];
  contentKeys?: string[];
  mediaUrls?: string[];
  selectedTopicId?: string;
  topicContentKeys?: Record<string, string[]>;
  selectedMaterial?: OfflineMaterialSelectionRecord;
}

let prefetchProgress: PrefetchProgress = {
  total: 0,
  completed: 0,
  currentItem: '',
  status: 'idle',
};

let onProgressCallback: ((progress: PrefetchProgress) => void) | null = null;

export function setPrefetchProgressCallback(callback: (progress: PrefetchProgress) => void) {
  onProgressCallback = callback;
}

function updateProgress(update: Partial<PrefetchProgress>) {
  prefetchProgress = { ...prefetchProgress, ...update };
  onProgressCallback?.(prefetchProgress);
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

function isOfficialStructuredKey(key: string): boolean {
  return key === 'topics'
    || key === 'all_subtopics'
    || key === 'materials_groups'
    || key.startsWith('subtopics_')
    || key.startsWith('lesson_')
    || key.startsWith('offline_material:');
}

function getSessionUserId() {
  return supabase.auth.getSession().then(({ data }) => data.session?.user?.id || null);
}

async function fetchMediaBlob(url: string): Promise<Blob> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`Media request failed (${response.status}).`);
    const blob = await response.blob();
    if (!blob.size) throw new Error('The downloaded media file was empty.');
    await cacheOfflineData(getOfflineMediaKey(url), blob);
    return blob;
  } finally {
    window.clearTimeout(timer);
  }
}

function sendToServiceWorker<T = unknown>(type: string, payload?: unknown): Promise<T | undefined> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) {
      resolve(undefined);
      return;
    }
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => resolve(event.data as T);
    try {
      navigator.serviceWorker.controller.postMessage({ type, payload }, [channel.port2]);
    } catch {
      resolve(undefined);
    }
  });
}

async function getCompatibleManifest(userId: string, language: AppLanguage): Promise<OfflinePackManifest | null> {
  return getOfflinePackManifest(userId, language);
}

export async function saveSelectedOfflineContent(input: OfflineSelectionInput): Promise<void> {
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId || sessionUserId !== input.userId) {
    throw new Error('Sign in to save content for offline use.');
  }
  if (!input.entries.length) throw new Error('Choose content before saving it offline.');
  if (input.entries.some((entry) => !isOfficialStructuredKey(entry.key))) {
    throw new Error('This content cannot be saved for offline use.');
  }

  updateProgress({
    status: 'running',
    total: input.mediaUrls?.length || 1,
    completed: 0,
    currentItem: 'Saving selected content for offline use…',
    error: undefined,
  });

  // Structured data is written before the manifest, but is not authorized for
  // offline detail access until every required media file succeeds.
  await Promise.all(input.entries.map((entry) => cacheOfflineData(entry.key, entry.data)));

  const mediaUrls = [...new Set(input.mediaUrls || [])];
  for (const [index, url] of mediaUrls.entries()) {
    updateProgress({ currentItem: `Saving offline media ${index + 1} of ${mediaUrls.length}…`, completed: index });
    await fetchMediaBlob(url);
    await sendToServiceWorker('CACHE_URLS', { urls: [url] });
  }

  const existing = await getCompatibleManifest(input.userId, input.language);
  const contentKeys = new Set(existing?.contentKeys || []);
  input.contentKeys?.forEach((key) => contentKeys.add(key));
  input.entries.forEach((entry) => contentKeys.add(entry.key));
  const sourceVersions = { ...(existing?.sourceVersions || {}) };
  input.entries.forEach((entry) => { sourceVersions[entry.key] = stableDataHash(entry.data); });
  const selectedTopicIds = new Set(existing?.selectedTopicIds || []);
  if (input.selectedTopicId) selectedTopicIds.add(input.selectedTopicId);
  const topicContentKeys = { ...(existing?.topicContentKeys || {}), ...(input.topicContentKeys || {}) };
  if (input.selectedTopicId) topicContentKeys[input.selectedTopicId] = input.contentKeys || input.entries.map((entry) => entry.key);
  const selectedMaterials = [...(existing?.selectedMaterials || [])];
  if (input.selectedMaterial) {
    const index = selectedMaterials.findIndex((item) => item.id === input.selectedMaterial?.id && item.type === input.selectedMaterial?.type);
    if (index >= 0) selectedMaterials[index] = input.selectedMaterial;
    else selectedMaterials.push(input.selectedMaterial);
  }

  await saveOfflinePackManifest({
    schemaVersion: OFFLINE_PACK_SCHEMA_VERSION,
    version: OFFLINE_PACK_VERSION,
    downloadedAt: Date.now(),
    userId: input.userId,
    language: input.language,
    status: 'complete',
    contentKeys: [...contentKeys],
    sourceVersions,
    mediaCount: (existing?.mediaCount || 0) + mediaUrls.length,
    translationCount: existing?.translationCount || 0,
    selectedTopicIds: [...selectedTopicIds],
    topicContentKeys,
    selectedMaterials,
  });

  updateProgress({ status: 'completed', completed: mediaUrls.length || 1, currentItem: 'Selected content is ready offline.' });
}

async function getSelectedTopicPayload(topicId: string) {
  const [{ data: topic, error: topicError }, { data: subtopics, error: subtopicsError }] = await Promise.all([
    supabase.from('topics').select('*').eq('id', topicId).single(),
    supabase.from('subtopics').select('*').eq('topic_id', topicId).order('order_index'),
  ]);
  if (topicError) throw topicError;
  if (subtopicsError) throw subtopicsError;
  const resolvedSubtopics = (subtopics || []) as Subtopic[];
  const lessonResults = await Promise.all(resolvedSubtopics.map((subtopic) =>
    supabase.from('lessons').select('*').eq('subtopic_id', subtopic.id).maybeSingle(),
  ));
  const lessons = lessonResults.map((result) => {
    if (result.error) throw result.error;
    return result.data as Lesson | null;
  }).filter((lesson): lesson is Lesson => Boolean(lesson));
  return { topic: topic as Topic, subtopics: resolvedSubtopics, lessons };
}

function lessonMediaUrls(lessons: Lesson[]): string[] {
  return lessons.flatMap((lesson) => (lesson.content_blocks || [])
    .filter((block) => block.type === 'image' && /^https?:\/\//i.test(block.content))
    .map((block) => block.content));
}

export async function saveSelectedTopicOffline(
  userId: string,
  language: AppLanguage,
  topicId: string,
): Promise<void> {
  const payload = await getSelectedTopicPayload(topicId);
  const entries: OfflineCacheEntry[] = [
    { key: 'topics', data: await mergeSelectedArray('topics', [payload.topic]) },
    { key: `subtopics_${topicId}`, data: payload.subtopics },
    ...payload.lessons.map((lesson) => ({ key: `lesson_${lesson.subtopic_id}`, data: lesson })),
  ];
  await saveSelectedOfflineContent({
    userId,
    language,
    entries,
    contentKeys: entries.map((entry) => entry.key),
    mediaUrls: [payload.topic.image_url, ...lessonMediaUrls(payload.lessons)].filter((url): url is string => Boolean(url)),
    selectedTopicId: topicId,
    topicContentKeys: { [topicId]: entries.map((entry) => entry.key) },
  });
}

export async function saveSelectedLessonOffline(
  userId: string,
  language: AppLanguage,
  _lesson: Lesson,
  topic?: Topic,
  _subtopic?: Subtopic,
): Promise<void> {
  if (!topic?.id) throw new Error('Open the topic page to download this topic for offline use.');
  await saveSelectedTopicOffline(userId, language, topic.id);
}

async function mergeSelectedArray<T extends { id: string }>(key: string, incoming: T[]): Promise<T[]> {
  const cached = await getOfflineData<T[]>(key);
  const merged = new Map((cached || []).map((item) => [item.id, item]));
  incoming.forEach((item) => merged.set(item.id, item));
  return [...merged.values()];
}

export type MaterialSelection =
  | { type: 'gallery'; item: GalleryImage; group?: MaterialGroup }
  | { type: 'video'; item: VideoItem; group?: MaterialGroup }
  | { type: 'pdf'; item: PdfItem; group?: MaterialGroup };

function materialCacheKey(selection: MaterialSelection, language: AppLanguage) {
  return `offline_material:${selection.type}:${selection.item.id}:${language}`;
}

export async function saveSelectedMaterialOffline(
  userId: string,
  language: AppLanguage,
  selection: MaterialSelection,
): Promise<void> {
  if (selection.type === 'video' && getVideoType(selection.item.url) !== 'direct') {
    throw new Error('This video is an external embed and cannot be saved for offline use.');
  }
  const mediaUrls = selection.type === 'video'
    ? [selection.item.url, selection.item.thumbnail]
    : [selection.item.url];
  const record: OfflineMaterialSelectionRecord = {
    id: selection.item.id,
    type: selection.type,
    cacheKey: materialCacheKey(selection, language),
    mediaUrls,
    cacheable: true,
    downloadedAt: Date.now(),
  };
  await saveSelectedOfflineContent({
    userId,
    language,
    entries: [
      { key: record.cacheKey, data: selection.item },
      ...(selection.group ? [{ key: 'materials_groups', data: await mergeSelectedGroup(selection.group) }] : []),
    ],
    mediaUrls,
    selectedMaterial: record,
  });
}

async function mergeSelectedGroup(group: MaterialGroup): Promise<GroupedMaterials> {
  const cached = await getOfflineData<GroupedMaterials>('materials_groups');
  const current = cached || { groups: [], gallery: [], videos: [], pdfs: [] };
  return current.groups.some((item) => item.id === group.id)
    ? current
    : { ...current, groups: [...current.groups, group] };
}

/** Deprecated compatibility function. New flows must select a topic or item. */
export async function downloadOfficialLearningPack(): Promise<void> {
  throw new Error('Select a topic or material to download it for offline use.');
}

export const prefetchAllContent = downloadOfficialLearningPack;

export function getPrefetchProgress(): PrefetchProgress {
  return { ...prefetchProgress };
}

export async function getCacheSize(): Promise<number> {
  try {
    const result = await sendToServiceWorker<{ size?: number }>('GET_CACHE_SIZE');
    return Number(result?.size || 0);
  } catch {
    return 0;
  }
}

export async function clearAllCaches(): Promise<void> {
  await sendToServiceWorker('CLEAR_CACHE');
  await clearOfflineData();
}

async function refreshOverviewMetadata() {
  await Promise.allSettled([
    getHomepageHero().then((value) => value && cacheOfflineData('homepage_hero', value)),
    getHomepageFeatureCards().then((value) => value && cacheOfflineData('homepage_feature_cards', value)),
    getHomepageFeaturedTopics().then((value) => value && cacheOfflineData('homepage_featured_topics', value)),
    getAboutContent().then((value) => value && cacheOfflineData('about_content', value)),
    getTopics().then((value) => cacheOfflineData('topics', value)),
    getAllSubtopics().then((value) => cacheOfflineData('all_subtopics', value)),
    getMaterialsGroups().then((value) => cacheOfflineData('materials_groups', value)),
  ]);
}

export async function refreshSelectedOfflineContent(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) return;
  const storedLanguage = window.localStorage.getItem(`ethio-cosmos-language:${userId}`);
  const language: AppLanguage = storedLanguage === 'am' ? 'am' : 'en';
  const manifest = await getOfflinePackManifest(userId, language);
  if (!manifest) return;

  await refreshOverviewMetadata();
  await Promise.allSettled(manifest.selectedTopicIds.map(async (topicId) => {
    const payload = await getSelectedTopicPayload(topicId);
    const entries: OfflineCacheEntry[] = [
      { key: 'topics', data: await mergeSelectedArray('topics', [payload.topic]) },
      { key: `subtopics_${topicId}`, data: payload.subtopics },
      ...payload.lessons.map((lesson) => ({ key: `lesson_${lesson.subtopic_id}`, data: lesson })),
    ];
    await saveSelectedOfflineContent({
      userId,
      language,
      entries,
      mediaUrls: [payload.topic.image_url, ...lessonMediaUrls(payload.lessons)].filter((url): url is string => Boolean(url)),
      selectedTopicId: topicId,
      topicContentKeys: { [topicId]: entries.map((entry) => entry.key) },
    });
  }));

  const latestMaterials = await getMaterialsGroups();
  await Promise.allSettled(manifest.selectedMaterials.map(async (record) => {
    const collection = record.type === 'gallery' ? latestMaterials.gallery : record.type === 'video' ? latestMaterials.videos : latestMaterials.pdfs;
    const item = collection.find((candidate) => candidate.id === record.id);
    if (!item) return;
    if (record.type === 'video' && getVideoType(item.url) !== 'direct') return;
    const cacheKey = `offline_material:${record.type}:${record.id}:${language}`;
    const mediaUrls = record.type === 'video' ? [item.url, (item as VideoItem).thumbnail] : [item.url];
    await saveSelectedOfflineContent({
      userId,
      language,
      entries: [{ key: cacheKey, data: item }],
      mediaUrls,
      selectedMaterial: { ...record, cacheKey, mediaUrls, downloadedAt: Date.now() },
    });
  }));
}

export function setupOnlineListener(): void {
  const refresh = () => {
    void refreshSelectedOfflineContent().catch((error) => {
      console.warn('[OfflinePack] Selected-content refresh failed:', error);
    });
  };
  window.addEventListener('online', refresh);
}

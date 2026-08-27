import { useState, useEffect, useCallback } from 'react';
import { cacheOfflineData, getValidatedOfflineData } from '@/lib/offline-cache';
import {
  getHomepageHero, updateHomepageHero,
  getHomepageFeatureCards, updateHomepageFeatureCards,
  getHomepageFeaturedTopics, updateHomepageFeaturedTopics,
  getAboutContent, updateAboutContent,
  getMaterialsGalleryImages, updateMaterialsGalleryImages,
  getMaterialsVideos, updateMaterialsVideos,
  getMaterialsPdfs, updateMaterialsPdfs,
  getMaterialsGroups, appendMaterialGroups, updateMaterialsGroupsFull, deleteMaterialGroup, renameMaterialGroup, updateMaterialGroupFull, moveMaterialGroup, assignItemsToGroup,
  getTopics, createTopic, updateTopic, deleteTopic,
  getAllSubtopics, getSubtopicsByTopicId, createSubtopic, updateSubtopic, deleteSubtopic,
  getLessonBySubtopicId, createLesson, updateLesson,
  getQuizzes, createQuiz, updateQuiz, deleteQuiz,
  getQuizQuestionsByQuizId, createQuizQuestion, updateQuizQuestion, deleteQuizQuestion,
} from '@/services/cms';
import type {
  Topic, Subtopic, Lesson, FeaturedTopic, FeatureCard, GalleryImage, VideoItem, PdfItem,
  Quiz, QuizQuestion, AboutContent, GroupedMaterials, MaterialGroup, MaterialType
} from '@/types';

const CMS_REFRESH_TIMEOUT_MS = 3500;

function isNetworkAvailable() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

async function boundedRefresh<T>(request: Promise<T>): Promise<T> {
  let timeoutId: number | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('Network refresh timed out.')), CMS_REFRESH_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

async function readCached<T>(key: string): Promise<T | null> {
  try {
    return await getValidatedOfflineData<T>(key);
  } catch (error) {
    console.warn(`Failed to read cached ${key}:`, error);
    return null;
  }
}

// --- Homepage Hooks ---
export function useHomepageHero() {
  const [hero, setHero] = useState<{ 
    heroTitle: string; 
    heroSubtitle: string; 
    videoUrl?: string; 
    videoVisible?: boolean;
    secondaryVideoUrl?: string;
    enableVideoSequence?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchHero = async () => {
      const cachedData = await readCached<NonNullable<typeof hero>>('homepage_hero');
      if (!cancelled && cachedData !== null) {
        setHero(cachedData);
        setError(null);
        setLoading(false);
      }
      if (!isNetworkAvailable()) {
        if (!cancelled && cachedData === null) setError('Homepage content is unavailable offline.');
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const data = await boundedRefresh(getHomepageHero());
        const finalData = data ?? {
          heroTitle: 'Explore the Cosmos with Ethiopia',
          heroSubtitle: 'Join the EthioCosmos Learning Community — learn astronomy from Ethiopia to the universe',
          videoUrl: '',
          videoVisible: false,
          secondaryVideoUrl: '',
          enableVideoSequence: false,
        };
        if (!cancelled) {
          setHero(finalData);
          setError(null);
        }
        await cacheOfflineData('homepage_hero', finalData).catch((cacheErr) => console.warn('Failed to cache hero:', cacheErr));
      } catch (err) {
        console.error(err);
        if (!cancelled && cachedData === null) setError('Failed to load homepage hero.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchHero();
    return () => { cancelled = true; };
  }, []);

  const saveHero = useCallback(async (newHero: { 
    heroTitle: string; 
    heroSubtitle: string; 
    videoUrl?: string; 
    videoVisible?: boolean;
    secondaryVideoUrl?: string;
    enableVideoSequence?: boolean;
  }) => {
    try {
      await updateHomepageHero(newHero);
      setHero(newHero);
      setError(null);
      await cacheOfflineData('homepage_hero', newHero);
    } catch (err) {
      setError("Failed to save homepage hero.");
      console.error(err);
      throw err;
    }
  }, []);

  return { hero, loading, error, saveHero };
}

export function useHomepageFeatureCards() {
  const [featureCards, setFeatureCards] = useState<FeatureCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchCards = async () => {
      const cachedData = await readCached<FeatureCard[]>('homepage_feature_cards');
      if (!cancelled && cachedData !== null) {
        setFeatureCards(cachedData);
        setError(null);
        setLoading(false);
      }
      if (!isNetworkAvailable()) {
        if (!cancelled && cachedData === null) setError('Homepage content is unavailable offline.');
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const data = await boundedRefresh(getHomepageFeatureCards());
        const finalData = data || [
          { icon: '🔭', title: 'Astronomy Lessons', description: 'Structured learning paths from basics to advanced topics' },
          { icon: '🌍', title: 'Ethiopian Context', description: 'Explore the night sky from an Ethiopian perspective' },
          { icon: '🚀', title: 'Community Learning', description: 'Learn, discuss, and grow with fellow astronomy students' },
        ];
        if (!cancelled) {
          setFeatureCards(finalData);
          setError(null);
        }
        await cacheOfflineData('homepage_feature_cards', finalData).catch((cacheErr) => console.warn('Failed to cache feature cards:', cacheErr));
      } catch (err) {
        console.error(err);
        if (!cancelled && cachedData === null) setError('Failed to load feature cards.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchCards();
    return () => { cancelled = true; };
  }, []);

  const saveFeatureCards = useCallback(async (newCards: FeatureCard[]) => {
    try {
      await updateHomepageFeatureCards(newCards);
      setFeatureCards(newCards);
      setError(null);
      await cacheOfflineData('homepage_feature_cards', newCards);
    } catch (err) {
      setError("Failed to save feature cards.");
      console.error(err);
      throw err;
    }
  }, []);

  return { featureCards, loading, error, saveFeatureCards };
}

export function useHomepageFeaturedTopics() {
  const [featuredTopics, setFeaturedTopics] = useState<FeaturedTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchTopics = async () => {
      const cachedData = await readCached<FeaturedTopic[]>('homepage_featured_topics');
      if (!cancelled && cachedData !== null) {
        setFeaturedTopics(cachedData);
        setError(null);
        setLoading(false);
      }
      if (!isNetworkAvailable()) {
        if (!cancelled && cachedData === null) setError('Homepage content is unavailable offline.');
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const data = await boundedRefresh(getHomepageFeaturedTopics());
        const finalData = data || [];
        if (!cancelled) {
          setFeaturedTopics(finalData);
          setError(null);
        }
        await cacheOfflineData('homepage_featured_topics', finalData).catch((cacheErr) => console.warn('Failed to cache featured topics:', cacheErr));
      } catch (err) {
        console.error(err);
        if (!cancelled && cachedData === null) setError('Failed to load featured topics.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchTopics();
    return () => { cancelled = true; };
  }, []);

  const saveFeaturedTopics = useCallback(async (newTopics: FeaturedTopic[]) => {
    try {
      await updateHomepageFeaturedTopics(newTopics);
      setFeaturedTopics(newTopics);
      setError(null);
      await cacheOfflineData('homepage_featured_topics', newTopics);
    } catch (err) {
      setError("Failed to save featured topics.");
      console.error(err);
      throw err;
    }
  }, []);

  return { featuredTopics, loading, error, saveFeaturedTopics };
}

// --- About Page Hooks ---
export function useAboutContent() {
  const [aboutContent, setAboutContent] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchContent = async () => {
      const cachedData = await readCached<AboutContent>('about_content');
      if (!cancelled && cachedData !== null) {
        setAboutContent(cachedData);
        setError(null);
        setLoading(false);
      }
      if (!isNetworkAvailable()) {
        if (!cancelled && cachedData === null) setError('About content is unavailable offline.');
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const data = await boundedRefresh(getAboutContent());
        if (!cancelled) {
          setAboutContent(data);
          setError(null);
        }
        if (data) await cacheOfflineData('about_content', data).catch((cacheErr) => console.warn('Failed to cache about content:', cacheErr));
      } catch (err) {
        console.error(err);
        if (!cancelled && cachedData === null) setError('Failed to load about content.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchContent();
    return () => { cancelled = true; };
  }, []);

  const saveAboutContent = useCallback(async (newContent: AboutContent) => {
    try {
      // Fetch current content from database to merge with new changes
      const currentContent = await getAboutContent();
      // Merge current content with new content, preserving any fields not being updated
      const mergedContent: AboutContent = {
        ...currentContent,
        ...newContent,
        // Ensure team object is properly merged
        team: {
          platformCreators: newContent.team?.platformCreators ?? currentContent?.team?.platformCreators ?? [],
          educationalAdvisors: newContent.team?.educationalAdvisors ?? currentContent?.team?.educationalAdvisors ?? [],
          communityMembers: newContent.team?.communityMembers ?? currentContent?.team?.communityMembers ?? [],
        },
      };
      await updateAboutContent(mergedContent);
      setAboutContent(mergedContent);
      setError(null);
      await cacheOfflineData('about_content', mergedContent);
    } catch (err) {
      setError("Failed to save about content.");
      console.error(err);
      throw err;
    }
  }, []);

  return { aboutContent, loading, error, saveAboutContent };
}

// --- Materials Hooks ---
export function useMaterialsGalleryImages() {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchImages = async () => {
      const cachedData = await readCached<GalleryImage[]>('materials_gallery_images');
      if (!cancelled && cachedData !== null) {
        setGalleryImages(cachedData);
        setError(null);
        setLoading(false);
      }
      if (!isNetworkAvailable()) {
        if (!cancelled && cachedData === null) setError('Materials are unavailable offline.');
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const data = await boundedRefresh(getMaterialsGalleryImages());
        const finalData = data || [];
        if (!cancelled) {
          setGalleryImages(finalData);
          setError(null);
        }
        await cacheOfflineData('materials_gallery_images', finalData).catch((cacheErr) => console.warn('Failed to cache gallery images:', cacheErr));
      } catch (err) {
        console.error(err);
        if (!cancelled && cachedData === null) setError('Failed to load gallery images.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchImages();
    return () => { cancelled = true; };
  }, []);

  const saveGalleryImages = useCallback(async (newImages: GalleryImage[]) => {
    try {
      await updateMaterialsGalleryImages(newImages);
      setGalleryImages(newImages);
      setError(null);
    } catch (err) {
      setError("Failed to save gallery images.");
      console.error(err);
      throw err;
    }
  }, []);

  return { galleryImages, loading, error, saveGalleryImages };
}

export function useMaterialsVideos() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchVideos = async () => {
      const cachedData = await readCached<VideoItem[]>('materials_videos');
      if (!cancelled && cachedData !== null) {
        setVideos(cachedData);
        setError(null);
        setLoading(false);
      }
      if (!isNetworkAvailable()) {
        if (!cancelled && cachedData === null) setError('Materials are unavailable offline.');
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const data = await boundedRefresh(getMaterialsVideos());
        const finalData = data || [];
        if (!cancelled) {
          setVideos(finalData);
          setError(null);
        }
        await cacheOfflineData('materials_videos', finalData).catch((cacheErr) => console.warn('Failed to cache videos:', cacheErr));
      } catch (err) {
        console.error(err);
        if (!cancelled && cachedData === null) setError('Failed to load videos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchVideos();
    return () => { cancelled = true; };
  }, []);

  const saveVideos = useCallback(async (newVideos: VideoItem[]) => {
    try {
      await updateMaterialsVideos(newVideos);
      setVideos(newVideos);
      setError(null);
    } catch (err) {
      setError("Failed to save videos.");
      console.error(err);
      throw err;
    }
  }, []);

  return { videos, loading, error, saveVideos };
}

export function useMaterialsPdfs() {
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchPdfs = async () => {
      const cachedData = await readCached<PdfItem[]>('materials_pdfs');
      if (!cancelled && cachedData !== null) {
        setPdfs(cachedData);
        setError(null);
        setLoading(false);
      }
      if (!isNetworkAvailable()) {
        if (!cancelled && cachedData === null) setError('Materials are unavailable offline.');
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const data = await boundedRefresh(getMaterialsPdfs());
        const finalData = data || [];
        if (!cancelled) {
          setPdfs(finalData);
          setError(null);
        }
        await cacheOfflineData('materials_pdfs', finalData).catch((cacheErr) => console.warn('Failed to cache PDFs:', cacheErr));
      } catch (err) {
        console.error(err);
        if (!cancelled && cachedData === null) setError('Failed to load PDFs.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchPdfs();
    return () => { cancelled = true; };
  }, []);

  const savePdfs = useCallback(async (newPdfs: PdfItem[]) => {
    try {
      await updateMaterialsPdfs(newPdfs);
      setPdfs(newPdfs);
      setError(null);
    } catch (err) {
      setError("Failed to save PDFs.");
      console.error(err);
      throw err;
    }
  }, []);

  return { pdfs, loading, error, savePdfs };
}

// --- Material Groups Hook ---
// Single hook that loads the grouped-materials payload (groups + all items)
// so admins and users always work with the latest merged state. Saves use
// append-only helpers, so adding a new group or new materials never removes
// existing content.
export function useMaterialsGroups() {
  const [grouped, setGrouped] = useState<GroupedMaterials>({
    groups: [],
    gallery: [],
    videos: [],
    pdfs: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    const cachedData = await readCached<GroupedMaterials>('materials_groups');
    if (cachedData !== null) {
      setGrouped(cachedData);
      setError(null);
      setLoading(false);
    }
    if (!isNetworkAvailable()) {
      if (cachedData === null) setError('Materials are unavailable offline.');
      setLoading(false);
      return;
    }
    try {
      const data = await boundedRefresh(getMaterialsGroups());
      setGrouped(data);
      setError(null);
      await cacheOfflineData('materials_groups', data).catch((cacheErr) => console.warn('Failed to cache material groups:', cacheErr));
    } catch (err) {
      console.error(err);
      if (cachedData === null) setError('Failed to load material groups.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Append new groups (existing payload untouched).
  const addGroups = useCallback(async (groups: MaterialGroup[]) => {
    const next = await appendMaterialGroups({ groups });
    setGrouped(next);
    return next;
  }, []);

  const renameGroup = useCallback(async (groupId: string, name: string, description?: string) => {
    const next = await renameMaterialGroup(groupId, name, description);
    setGrouped(next);
    return next;
  }, []);

  const updateGroupFull = useCallback(async (groupId: string, updates: Partial<MaterialGroup>) => {
    const next = await updateMaterialGroupFull(groupId, updates);
    setGrouped(next);
    return next;
  }, []);

  const removeGroup = useCallback(async (groupId: string) => {
    const next = await deleteMaterialGroup(groupId);
    setGrouped(next);
    return next;
  }, []);

  const reorderGroup = useCallback(async (groupId: string, direction: -1 | 1) => {
    const next = await moveMaterialGroup(groupId, direction);
    setGrouped(next);
    return next;
  }, []);

  // Assign items to a group. `itemIds` = ids to place in the group; items
  // already assigned elsewhere get unassigned from their previous group.
  const assignItems = useCallback(async (groupId: string, type: MaterialType, itemIds: string[]) => {
    const next = await assignItemsToGroup(groupId, type, itemIds);
    setGrouped(next);
    return next;
  }, []);

  // Full-payload save used for item-level edits (titles/URLs) so field edits
  // persist correctly.
  const saveFull = useCallback(async (data: GroupedMaterials) => {
    await updateMaterialsGroupsFull(data);
    setGrouped(data);
  }, []);

  return { grouped, loading, error, fetchGroups, addGroups, renameGroup, updateGroupFull, removeGroup, reorderGroup, assignItems, saveFull };
}

// --- Topics Hooks ---
export function useTopics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    const cachedData = await readCached<Topic[]>('topics');
    if (cachedData !== null) {
      setTopics(cachedData);
      setError(null);
      setLoading(false);
    }
    if (!isNetworkAvailable()) {
      if (cachedData === null) setError('Learning topics are unavailable offline.');
      setLoading(false);
      return;
    }
    try {
      const data = await boundedRefresh(getTopics());
      setTopics(data);
      setError(null);
      await cacheOfflineData('topics', data).catch((cacheErr) => console.warn('Failed to cache topics:', cacheErr));
    } catch (err) {
      console.error(err);
      if (cachedData === null) setError('Failed to load topics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const addTopic = useCallback(async (newTopic: Omit<Topic, "id" | "created_at" | "updated_at">) => {
    try {
      const topic = await createTopic(newTopic);
      if (topic) setTopics((prev) => [...prev, topic]);
      setError(null);
    } catch (err) {
      setError("Failed to add topic.");
      console.error(err);
      throw err;
    }
  }, []);

  const editTopic = useCallback(async (id: string, updatedFields: Partial<Topic>) => {
    try {
      const topic = await updateTopic(id, updatedFields);
      if (topic) {
        setTopics((prev) => prev.map((t) => (t.id === id ? topic : t)));
      }
      setError(null);
    } catch (err) {
      setError("Failed to update topic.");
      console.error(err);
      throw err;
    }
  }, []);

  const removeTopic = useCallback(async (id: string) => {
    try {
      await deleteTopic(id);
      setTopics((prev) => prev.filter((t) => t.id !== id));
      setError(null);
    } catch (err) {
      setError("Failed to delete topic.");
      console.error(err);
      throw err;
    }
  }, []);

  return { topics, loading, error, addTopic, editTopic, removeTopic, fetchTopics };
}

// --- Subtopics Hooks ---
export function useAllSubtopics() {
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAllSubtopics = async () => {
      const cachedData = await readCached<Subtopic[]>('all_subtopics');
      if (!cancelled && cachedData !== null) {
        setSubtopics(cachedData);
        setError(null);
        setLoading(false);
      }
      if (!isNetworkAvailable()) {
        if (!cancelled && cachedData === null) setError('Lessons are unavailable offline.');
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const data = await boundedRefresh(getAllSubtopics());
        if (!cancelled) {
          setSubtopics(data);
          setError(null);
        }
        await cacheOfflineData('all_subtopics', data).catch((cacheErr) => console.warn('Failed to cache all subtopics:', cacheErr));
      } catch (err) {
        console.error(err);
        if (!cancelled && cachedData === null) setError('Failed to load lessons for search.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAllSubtopics();
    return () => {
      cancelled = true;
    };
  }, []);

  return { subtopics, loading, error };
}

export function useSubtopics(topicId: string | null) {
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubtopics = useCallback(async () => {
    if (!topicId) {
      setSubtopics([]);
      setLoading(false);
      return;
    }
    const cachedData = await readCached<Subtopic[]>(`subtopics_${topicId}`);
    if (cachedData !== null) {
      setSubtopics(cachedData);
      setError(null);
      setLoading(false);
    }
    if (!isNetworkAvailable()) {
      if (cachedData === null) setError('This topic must be downloaded before it works offline.');
      setLoading(false);
      return;
    }
    try {
      const data = await boundedRefresh(getSubtopicsByTopicId(topicId));
      setSubtopics(data);
      setError(null);
      await cacheOfflineData(`subtopics_${topicId}`, data).catch((cacheErr) => console.warn('Failed to cache subtopics:', cacheErr));
    } catch (err) {
      console.error(err);
      if (cachedData === null) setError('Failed to load subtopics.');
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    fetchSubtopics();
  }, [fetchSubtopics]);

  const addSubtopic = useCallback(async (newSubtopic: Omit<Subtopic, "id" | "created_at" | "updated_at">) => {
    try {
      const subtopic = await createSubtopic(newSubtopic);
      if (subtopic) setSubtopics((prev) => [...prev, subtopic]);
      setError(null);
    } catch (err) {
      setError("Failed to add subtopic.");
      console.error(err);
      throw err;
    }
  }, []);

  const editSubtopic = useCallback(async (id: string, updatedFields: Partial<Subtopic>) => {
    try {
      const subtopic = await updateSubtopic(id, updatedFields);
      if (subtopic) {
        setSubtopics((prev) => prev.map((s) => (s.id === id ? subtopic : s)));
      }
      setError(null);
    } catch (err) {
      setError("Failed to update subtopic.");
      console.error(err);
      throw err;
    }
  }, []);

  const removeSubtopic = useCallback(async (id: string) => {
    try {
      await deleteSubtopic(id);
      setSubtopics((prev) => prev.filter((s) => s.id !== id));
      setError(null);
    } catch (err) {
      setError("Failed to delete subtopic.");
      console.error(err);
      throw err;
    }
  }, []);

  return { subtopics, loading, error, addSubtopic, editSubtopic, removeSubtopic, fetchSubtopics };
}

// --- Lesson Hooks ---
export function useLesson(subtopicId: string | null) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchLesson = async () => {
      if (!subtopicId) {
        setLesson(null);
        setLoading(false);
        return;
      }
      const cachedData = await readCached<Lesson>(`lesson_${subtopicId}`);
      if (!cancelled && cachedData !== null) {
        setLesson(cachedData);
        setError(null);
        setLoading(false);
      }
      if (!isNetworkAvailable()) {
        if (!cancelled && cachedData === null) setError('This topic must be downloaded before its lessons work offline.');
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const data = await boundedRefresh(getLessonBySubtopicId(subtopicId));
        if (!cancelled) {
          setLesson(data);
          setError(null);
        }
        if (data) await cacheOfflineData(`lesson_${subtopicId}`, data).catch((cacheErr) => console.warn('Failed to cache lesson:', cacheErr));
      } catch (err) {
        console.error(err);
        if (!cancelled && cachedData === null) setError('Failed to load lesson.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchLesson();
    return () => { cancelled = true; };
  }, [subtopicId]);

  const saveLesson = useCallback(async (lessonData: Omit<Lesson, "id" | "created_at" | "updated_at"> & { subtopic_id: string }) => {
    try {
      let savedLesson;
      if (lesson?.id) {
        savedLesson = await updateLesson(lesson.id, lessonData);
      } else {
        savedLesson = await createLesson(lessonData);
      }
      if (savedLesson) {
        setLesson(savedLesson);
        await cacheOfflineData(`lesson_${subtopicId}`, savedLesson);
      }
      setError(null);
    } catch (err) {
      setError("Failed to save lesson.");
      console.error(err);
      throw err;
    }
  }, [lesson, subtopicId]);

  return { lesson, loading, error, saveLesson };
}

// --- Quiz Hooks ---
export function useQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getQuizzes();
      setQuizzes(data);
      await cacheOfflineData('quizzes', data).catch((cacheErr) => console.warn('Failed to cache quizzes:', cacheErr));
    } catch (err) {
      setError("Failed to load quizzes.");
      console.error(err);
      try {
        const cachedData = await getValidatedOfflineData<Quiz[]>('quizzes');
        if (cachedData) {
          setQuizzes(cachedData);
          setError(null);
        }
      } catch (cacheErr) {
        console.warn('Failed to load cached quizzes:', cacheErr);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const addQuiz = useCallback(async (newQuiz: Omit<Quiz, "id" | "created_at" | "updated_at">) => {
    try {
      const quiz = await createQuiz(newQuiz);
      if (quiz) setQuizzes((prev) => [...prev, quiz]);
      setError(null);
    } catch (err) {
      setError("Failed to add quiz.");
      console.error(err);
      throw err;
    }
  }, []);

  const editQuiz = useCallback(async (id: string, updatedFields: Partial<Quiz>) => {
    try {
      const quiz = await updateQuiz(id, updatedFields);
      if (quiz) {
        setQuizzes((prev) => prev.map((q) => (q.id === id ? quiz : q)));
      }
      setError(null);
    } catch (err) {
      setError("Failed to update quiz.");
      console.error(err);
      throw err;
    }
  }, []);

  const removeQuiz = useCallback(async (id: string) => {
    try {
      await deleteQuiz(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      setError(null);
    } catch (err) {
      setError("Failed to delete quiz.");
      console.error(err);
      throw err;
    }
  }, []);

  return { quizzes, loading, error, addQuiz, editQuiz, removeQuiz, fetchQuizzes };
}

// --- Quiz Question Hooks ---
export function useQuizQuestions(quizId: string | null) {
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    if (!quizId) {
      setQuizQuestions([]);
      return;
    }
    try {
      setLoading(true);
      const data = await getQuizQuestionsByQuizId(quizId);
      setQuizQuestions(data);
      await cacheOfflineData(`quiz_questions_${quizId}`, data).catch((cacheErr) => console.warn('Failed to cache quiz questions:', cacheErr));
    } catch (err) {
      setError("Failed to load quiz questions.");
      console.error(err);
      try {
        const cachedData = await getValidatedOfflineData<QuizQuestion[]>(`quiz_questions_${quizId}`);
        if (cachedData) {
          setQuizQuestions(cachedData);
          setError(null);
        }
      } catch (cacheErr) {
        console.warn('Failed to load cached quiz questions:', cacheErr);
      }
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const addQuizQuestion = useCallback(async (newQuestion: Omit<QuizQuestion, "id" | "created_at" | "updated_at">) => {
    try {
      const question = await createQuizQuestion(newQuestion);
      if (question) setQuizQuestions((prev) => [...prev, question]);
      setError(null);
    } catch (err) {
      setError("Failed to add quiz question.");
      console.error(err);
      throw err;
    }
  }, []);

  const editQuizQuestion = useCallback(async (id: string, updatedFields: Partial<QuizQuestion>) => {
    try {
      const question = await updateQuizQuestion(id, updatedFields);
      if (question) {
        setQuizQuestions((prev) => prev.map((q) => (q.id === id ? question : q)));
      }
      setError(null);
    } catch (err) {
      setError("Failed to update quiz question.");
      console.error(err);
      throw err;
    }
  }, []);

  const removeQuizQuestion = useCallback(async (id: string) => {
    try {
      await deleteQuizQuestion(id);
      setQuizQuestions((prev) => prev.filter((q) => q.id !== id));
      setError(null);
    } catch (err) {
      setError("Failed to delete quiz question.");
      console.error(err);
      throw err;
    }
  }, []);

  return { quizQuestions, loading, error, addQuizQuestion, editQuizQuestion, removeQuizQuestion, fetchQuestions };
}

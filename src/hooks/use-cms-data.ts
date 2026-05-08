import { useState, useEffect, useCallback } from 'react';
import { cacheOfflineData, getOfflineData } from '@/lib/offline-cache';
import {
  getHomepageHero, updateHomepageHero,
  getHomepageFeatureCards, updateHomepageFeatureCards,
  getHomepageFeaturedTopics, updateHomepageFeaturedTopics,
  getAboutContent, updateAboutContent,
  getMaterialsGalleryImages, updateMaterialsGalleryImages,
  getMaterialsVideos, updateMaterialsVideos,
  getMaterialsPdfs, updateMaterialsPdfs,
  getTopics, createTopic, updateTopic, deleteTopic,
  getSubtopicsByTopicId, createSubtopic, updateSubtopic, deleteSubtopic,
  getLessonBySubtopicId, createLesson, updateLesson,
  getQuizzes, createQuiz, updateQuiz, deleteQuiz,
  getQuizQuestionsByQuizId, createQuizQuestion, updateQuizQuestion, deleteQuizQuestion,
} from '@/services/cms';
import type {
  Topic, Subtopic, Lesson, FeaturedTopic, FeatureCard, GalleryImage, VideoItem, PdfItem,
  Quiz, QuizQuestion, AboutContent
} from '@/types';

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
    const fetchHero = async () => {
      try {
        setLoading(true);
        const data = await getHomepageHero();
        const finalData = data ?? {
          heroTitle:    'Explore the Cosmos with Ethiopia',
          heroSubtitle: 'Join the EthioCosmos Learning Community — learn astronomy from Ethiopia to the universe',
          videoUrl: '',
          videoVisible: false,
          secondaryVideoUrl: '',
          enableVideoSequence: false
        };
        setHero(finalData);
        // Cache for offline access
        await cacheOfflineData('homepage_hero', finalData).catch(err => console.warn('Failed to cache hero:', err));
      } catch (err) {
        setError("Failed to load homepage hero.");
        console.error(err);
        // Try to load from offline cache if online fetch fails
        try {
          const cachedData = await getOfflineData('homepage_hero');
          if (cachedData) {
            setHero(cachedData);
            setError(null);
          }
        } catch (cacheErr) {
          console.warn('Failed to load cached hero:', cacheErr);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchHero();
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
    const fetchCards = async () => {
      try {
        setLoading(true);
        const data = await getHomepageFeatureCards();
        const finalData = data || [
          { icon: '🔭', title: 'Astronomy Lessons',  description: 'Structured learning paths from basics to advanced topics'   },
          { icon: '🌍', title: 'Ethiopian Context',  description: 'Explore the night sky from an Ethiopian perspective'         },
          { icon: '🚀', title: 'Community Learning', description: 'Learn, discuss, and grow with fellow astronomy students'     },
        ];
        setFeatureCards(finalData);
        // Cache for offline access
        await cacheOfflineData('homepage_feature_cards', finalData).catch(err => console.warn('Failed to cache feature cards:', err));
      } catch (err) {
        setError("Failed to load feature cards.");
        console.error(err);
        // Try to load from offline cache if online fetch fails
        try {
          const cachedData = await getOfflineData('homepage_feature_cards');
          if (cachedData) {
            setFeatureCards(cachedData);
            setError(null);
          }
        } catch (cacheErr) {
          console.warn('Failed to load cached feature cards:', cacheErr);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
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
    const fetchTopics = async () => {
      try {
        setLoading(true);
        const data = await getHomepageFeaturedTopics();
        const finalData = data || [];
        setFeaturedTopics(finalData);
        // Cache for offline access
        await cacheOfflineData('homepage_featured_topics', finalData).catch(err => console.warn('Failed to cache featured topics:', err));
      } catch (err) {
        setError("Failed to load featured topics.");
        console.error(err);
        // Try to load from offline cache if online fetch fails
        try {
          const cachedData = await getOfflineData('homepage_featured_topics');
          if (cachedData) {
            setFeaturedTopics(cachedData);
            setError(null);
          }
        } catch (cacheErr) {
          console.warn('Failed to load cached featured topics:', cacheErr);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
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
    const fetchContent = async () => {
      try {
        setLoading(true);
        const data = await getAboutContent();
        setAboutContent(data);
        if (data) {
          // Cache for offline access
          await cacheOfflineData('about_content', data).catch(err => console.warn('Failed to cache about content:', err));
        }
      } catch (err) {
        setError("Failed to load about content.");
        console.error(err);
        // Try to load from offline cache if online fetch fails
        try {
          const cachedData = await getOfflineData('about_content');
          if (cachedData) {
            setAboutContent(cachedData);
            setError(null);
          }
        } catch (cacheErr) {
          console.warn('Failed to load cached about content:', cacheErr);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
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
    const fetchImages = async () => {
      try {
        setLoading(true);
        const data = await getMaterialsGalleryImages();
        setGalleryImages(data || []);
      } catch (err) {
        setError("Failed to load gallery images.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
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
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const data = await getMaterialsVideos();
        setVideos(data || []);
      } catch (err) {
        setError("Failed to load videos.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
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
    const fetchPdfs = async () => {
      try {
        setLoading(true);
        const data = await getMaterialsPdfs();
        setPdfs(data || []);
      } catch (err) {
        setError("Failed to load PDFs.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPdfs();
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

// --- Topics Hooks ---
export function useTopics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTopics();
      setTopics(data);
      // Cache topics for offline access
      await cacheOfflineData('topics', data).catch(err => console.warn('Failed to cache topics:', err));
    } catch (err) {
      setError("Failed to load topics.");
      console.error(err);
      // Try to load from offline cache if online fetch fails
      try {
        const cachedData = await getOfflineData('topics');
        if (cachedData) {
          setTopics(cachedData);
          setError(null);
        }
      } catch (cacheErr) {
        console.warn('Failed to load cached topics:', cacheErr);
      }
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
export function useSubtopics(topicId: string | null) {
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubtopics = useCallback(async () => {
    if (!topicId) {
      setSubtopics([]);
      return;
    }
    try {
      setLoading(true);
      const data = await getSubtopicsByTopicId(topicId);
      setSubtopics(data);
      // Cache for offline access
      await cacheOfflineData(`subtopics_${topicId}`, data).catch(err => console.warn('Failed to cache subtopics:', err));
    } catch (err) {
      setError("Failed to load subtopics.");
      console.error(err);
      // Try to load from offline cache if online fetch fails
      try {
        const cachedData = await getOfflineData(`subtopics_${topicId}`);
        if (cachedData) {
          setSubtopics(cachedData);
          setError(null);
        }
      } catch (cacheErr) {
        console.warn('Failed to load cached subtopics:', cacheErr);
      }
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
    const fetchLesson = async () => {
      if (!subtopicId) {
        setLesson(null);
        return;
      }
      try {
        setLoading(true);
        const data = await getLessonBySubtopicId(subtopicId);
        setLesson(data);
        if (data) {
          // Cache for offline access
          await cacheOfflineData(`lesson_${subtopicId}`, data).catch(err => console.warn('Failed to cache lesson:', err));
        }
      } catch (err) {
        setError("Failed to load lesson.");
        console.error(err);
        // Try to load from offline cache if online fetch fails
        try {
          const cachedData = await getOfflineData(`lesson_${subtopicId}`);
          if (cachedData) {
            setLesson(cachedData);
            setError(null);
          }
        } catch (cacheErr) {
          console.warn('Failed to load cached lesson:', cacheErr);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchLesson();
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
    } catch (err) {
      setError("Failed to load quizzes.");
      console.error(err);
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
    } catch (err) {
      setError("Failed to load quiz questions.");
      console.error(err);
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

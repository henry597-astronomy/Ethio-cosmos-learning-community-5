import { useState, useEffect, useCallback } from 'react';
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
  getLessonBySubtopicId, createLesson, updateLesson, deleteLesson,
  getQuizzes, createQuiz, updateQuiz, deleteQuiz,
  getQuizQuestionsByQuizId, createQuizQuestion, updateQuizQuestion, deleteQuizQuestion,
} from '@/services/cms';
import type {
  Topic, Subtopic, Lesson, FeaturedTopic, FeatureCard, GalleryImage, VideoItem, PdfItem,
  Quiz, QuizQuestion, AboutContent
} from '@/types';

// --- Homepage Hooks ---
export function useHomepageHero() {
  const [hero, setHero] = useState<{ heroTitle: string; heroSubtitle: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHero = async () => {
      try {
        setLoading(true);
        const data = await getHomepageHero();
        setHero(data ?? {
          heroTitle:    'Explore the Cosmos with Ethiopia',
          heroSubtitle: 'Join the EthioCosmos Learning Community — learn astronomy from Ethiopia to the universe'
        });
      } catch (err) {
        setError("Failed to load homepage hero.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHero();
  }, []);

  const saveHero = useCallback(async (newHero: { heroTitle: string; heroSubtitle: string }) => {
    try {
      setError(null);
      await updateHomepageHero(newHero);
      setHero(newHero);
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
        setFeatureCards(data || [
          { icon: '🔭', title: 'Astronomy Lessons',  description: 'Structured learning paths from basics to advanced topics'   },
          { icon: '🌍', title: 'Ethiopian Context',  description: 'Explore the night sky from an Ethiopian perspective'         },
          { icon: '🚀', title: 'Community Learning', description: 'Learn, discuss, and grow with fellow astronomy students'     },
        ]);
      } catch (err) {
        setError("Failed to load feature cards.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  const saveFeatureCards = useCallback(async (newCards: FeatureCard[]) => {
    try {
      setError(null);
      await updateHomepageFeatureCards(newCards);
      setFeatureCards(newCards);
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
        setFeaturedTopics(data || []);
      } catch (err) {
        setError("Failed to load featured topics.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, []);

  const saveFeaturedTopics = useCallback(async (newTopics: FeaturedTopic[]) => {
    try {
      setError(null);
      await updateHomepageFeaturedTopics(newTopics);
      setFeaturedTopics(newTopics);
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
      } catch (err) {
        setError("Failed to load about content.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const saveAboutContent = useCallback(async (newContent: AboutContent) => {
    try {
      setError(null);
      await updateAboutContent(newContent);
      setAboutContent(newContent);
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
      setError(null);
      await updateMaterialsGalleryImages(newImages);
      setGalleryImages(newImages);
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
      setError(null);
      await updateMaterialsVideos(newVideos);
      setVideos(newVideos);
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
      setError(null);
      await updateMaterialsPdfs(newPdfs);
      setPdfs(newPdfs);
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
    } catch (err) {
      setError("Failed to load topics.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const addTopic = useCallback(async (newTopic: Omit<Topic, "id" | "created_at" | "updated_at">) => {
    try {
      setError(null);
      const topic = await createTopic(newTopic);
      if (topic) setTopics((prev) => [...prev, topic]);
    } catch (err) {
      setError("Failed to add topic.");
      console.error(err);
      throw err;
    }
  }, []);

  const editTopic = useCallback(async (id: string, updatedFields: Partial<Topic>) => {
    try {
      setError(null);
      const topic = await updateTopic(id, updatedFields);
      if (topic) {
        setTopics((prev) => prev.map((t) => (t.id === id ? topic : t)));
      }
    } catch (err) {
      setError("Failed to update topic.");
      console.error(err);
      throw err;
    }
  }, []);

  const removeTopic = useCallback(async (id: string) => {
    try {
      setError(null);
      await deleteTopic(id);
      setTopics((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError("Failed to delete topic.");
      console.error(err);
      throw err;
    }
  }, []);

  return { topics, loading, error, fetchTopics, addTopic, editTopic, removeTopic };
}

// --- Subtopics Hooks ---
export function useSubtopics(topicId: string | null) {
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubtopics = useCallback(async () => {
    if (!topicId) {
      setSubtopics([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getSubtopicsByTopicId(topicId);
      setSubtopics(data);
    } catch (err) {
      setError("Failed to load subtopics.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    fetchSubtopics();
  }, [fetchSubtopics]);

  const addSubtopic = useCallback(async (newSubtopic: Omit<Subtopic, "id" | "created_at" | "updated_at">) => {
    try {
      setError(null);
      const subtopic = await createSubtopic(newSubtopic);
      if (subtopic) setSubtopics((prev) => [...prev, subtopic]);
    } catch (err) {
      setError("Failed to add subtopic.");
      console.error(err);
      throw err;
    }
  }, []);

  const editSubtopic = useCallback(async (id: string, updatedFields: Partial<Subtopic>) => {
    try {
      setError(null);
      const subtopic = await updateSubtopic(id, updatedFields);
      if (subtopic) {
        setSubtopics((prev) => prev.map((s) => (s.id === id ? subtopic : s)));
      }
    } catch (err) {
      setError("Failed to update subtopic.");
      console.error(err);
      throw err;
    }
  }, []);

  const removeSubtopic = useCallback(async (id: string) => {
    try {
      setError(null);
      await deleteSubtopic(id);
      setSubtopics((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError("Failed to delete subtopic.");
      console.error(err);
      throw err;
    }
  }, []);

  return { subtopics, loading, error, fetchSubtopics, addSubtopic, editSubtopic, removeSubtopic };
}

// --- Lessons Hooks ---
export function useLesson(subtopicId: string | null) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLesson = useCallback(async () => {
    if (!subtopicId) {
      setLesson(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getLessonBySubtopicId(subtopicId);
      setLesson(data);
    } catch (err) {
      setError("Failed to load lesson.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [subtopicId]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  const saveLesson = useCallback(async (newLesson: Omit<Lesson, "id" | "created_at" | "updated_at"> & { subtopic_id: string }) => {
    try {
      setError(null);
      let resultLesson;
      if (lesson?.id) {
        resultLesson = await updateLesson(lesson.id, newLesson);
      } else {
        resultLesson = await createLesson(newLesson);
      }
      if (resultLesson) setLesson(resultLesson);
    } catch (err) {
      setError("Failed to save lesson.");
      console.error(err);
      throw err;
    }
  }, [lesson]);

  const removeLesson = useCallback(async () => {
    if (!lesson?.id) return;
    try {
      setError(null);
      await deleteLesson(lesson.id);
      setLesson(null);
    } catch (err) {
      setError("Failed to delete lesson.");
      console.error(err);
      throw err;
    }
  }, [lesson]);

  return { lesson, loading, error, fetchLesson, saveLesson, removeLesson };
}

// --- Quizzes Hooks ---
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
      setError(null);
      const quiz = await createQuiz(newQuiz);
      if (quiz) setQuizzes((prev) => [...prev, quiz]);
    } catch (err) {
      setError("Failed to add quiz.");
      console.error(err);
      throw err;
    }
  }, []);

  const editQuiz = useCallback(async (id: string, updatedFields: Partial<Quiz>) => {
    try {
      setError(null);
      const quiz = await updateQuiz(id, updatedFields);
      if (quiz) {
        setQuizzes((prev) => prev.map((q) => (q.id === id ? quiz : q)));
      }
    } catch (err) {
      setError("Failed to update quiz.");
      console.error(err);
      throw err;
    }
  }, []);

  const removeQuiz = useCallback(async (id: string) => {
    try {
      setError(null);
      await deleteQuiz(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      setError("Failed to delete quiz.");
      console.error(err);
      throw err;
    }
  }, []);

  return { quizzes, loading, error, fetchQuizzes, addQuiz, editQuiz, removeQuiz };
}

// --- Quiz Questions Hooks ---
export function useQuizQuestions(quizId: string | null) {
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizQuestions = useCallback(async () => {
    if (!quizId) {
      setQuizQuestions([]);
      setLoading(false);
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
    fetchQuizQuestions();
  }, [fetchQuizQuestions]);

  const addQuizQuestion = useCallback(async (newQuestion: Omit<QuizQuestion, "id" | "created_at" | "updated_at">) => {
    try {
      setError(null);
      const question = await createQuizQuestion(newQuestion);
      if (question) setQuizQuestions((prev) => [...prev, question]);
    } catch (err) {
      setError("Failed to add quiz question.");
      console.error(err);
      throw err;
    }
  }, []);

  const editQuizQuestion = useCallback(async (id: string, updatedFields: Partial<QuizQuestion>) => {
    try {
      setError(null);
      const question = await updateQuizQuestion(id, updatedFields);
      if (question) {
        setQuizQuestions((prev) => prev.map((q) => (q.id === id ? question : q)));
      }
    } catch (err) {
      setError("Failed to update quiz question.");
      console.error(err);
      throw err;
    }
  }, []);

  const removeQuizQuestion = useCallback(async (id: string) => {
    try {
      setError(null);
      await deleteQuizQuestion(id);
      setQuizQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      setError("Failed to delete quiz question.");
      console.error(err);
      throw err;
    }
  }, []);

  return { quizQuestions, loading, error, fetchQuizQuestions, addQuizQuestion, editQuizQuestion, removeQuizQuestion };
}

import { supabase } from "@/supabase";
import type {
  Topic,
  Subtopic,
  Lesson,
  FeaturedTopic,
  FeatureCard,
  GalleryImage,
  VideoItem,
  PdfItem,
  Quiz,
  QuizQuestion,
  UserProgress,
  Bookmark,
  AboutContent,
} from "@/types";

// Helper to fetch single site content item
async function getSiteContent<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", key)
    .single();
  if (error && error.code !== "PGRST116") {
    console.error(`Error fetching site content for ${key}:`, error);
    return null;
  }
  return data ? (data.value as T) : null;
}

// Helper to update single site content item
async function updateSiteContent<T>(key: string, value: T): Promise<void> {
  const { error } = await supabase
    .from("site_content")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) {
    console.error(`Error updating site content for ${key}:`, error);
    throw error;
  }
}

// --- Homepage Content ---
export const getHomepageHero = () =>
  getSiteContent<{ heroTitle: string; heroSubtitle: string }>( "homepage_hero");
export const updateHomepageHero = (data: { heroTitle: string; heroSubtitle: string }) =>
  updateSiteContent("homepage_hero", data);

export const getHomepageFeatureCards = () =>
  getSiteContent<FeatureCard[]>("homepage_feature_cards");
export const updateHomepageFeatureCards = (data: FeatureCard[]) =>
  updateSiteContent("homepage_feature_cards", data);

export const getHomepageFeaturedTopics = () =>
  getSiteContent<FeaturedTopic[]>("homepage_featured_topics");
export const updateHomepageFeaturedTopics = (data: FeaturedTopic[]) =>
  updateSiteContent("homepage_featured_topics", data);

// --- About Page Content ---
export const getAboutContent = () => getSiteContent<AboutContent>("about_content");
export const updateAboutContent = (data: AboutContent) =>
  updateSiteContent("about_content", data);

// --- Materials Page Content ---
export const getMaterialsGalleryImages = () =>
  getSiteContent<GalleryImage[]>("materials_gallery_images");
export const updateMaterialsGalleryImages = (data: GalleryImage[]) =>
  updateSiteContent("materials_gallery_images", data);

export const getMaterialsVideos = () =>
  getSiteContent<VideoItem[]>("materials_videos");
export const updateMaterialsVideos = (data: VideoItem[]) =>
  updateSiteContent("materials_videos", data);

export const getMaterialsPdfs = () =>
  getSiteContent<PdfItem[]>("materials_pdfs");
export const updateMaterialsPdfs = (data: PdfItem[]) =>
  updateSiteContent("materials_pdfs", data);

// --- Topics ---
export const getTopics = async (): Promise<Topic[]> => {
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .order("order_index");
  if (error) {
    console.error("Error fetching topics:", error);
    return [];
  }
  return data as Topic[];
};

export const getTopicById = async (id: string): Promise<Topic | null> => {
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") {
    console.error(`Error fetching topic ${id}:`, error);
    return null;
  }
  return data as Topic;
};

export const createTopic = async (topic: Omit<Topic, "id" | "created_at" | "updated_at">): Promise<Topic | null> => {
  const { data, error } = await supabase
    .from("topics")
    .insert(topic)
    .select()
    .single();
  if (error) {
    console.error("Error creating topic:", error);
    throw error;
  }
  return data as Topic;
};

export const updateTopic = async (id: string, topic: Partial<Topic>): Promise<Topic | null> => {
  const { data, error } = await supabase
    .from("topics")
    .update(topic)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error(`Error updating topic ${id}:`, error);
    throw error;
  }
  return data as Topic;
};

export const deleteTopic = async (id: string): Promise<void> => {
  const { error } = await supabase.from("topics").delete().eq("id", id);
  if (error) {
    console.error(`Error deleting topic ${id}:`, error);
    throw error;
  }
};

// --- Subtopics ---
export const getSubtopicsByTopicId = async (topicId: string): Promise<Subtopic[]> => {
  const { data, error } = await supabase
    .from("subtopics")
    .select("*")
    .eq("topic_id", topicId)
    .order("order_index");
  if (error) {
    console.error(`Error fetching subtopics for topic ${topicId}:`, error);
    return [];
  }
  return data as Subtopic[];
};

export const getSubtopicById = async (id: string): Promise<Subtopic | null> => {
  const { data, error } = await supabase
    .from("subtopics")
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") {
    console.error(`Error fetching subtopic ${id}:`, error);
    return null;
  }
  return data as Subtopic;
};

export const createSubtopic = async (subtopic: Omit<Subtopic, "id" | "created_at" | "updated_at">): Promise<Subtopic | null> => {
  const { data, error } = await supabase
    .from("subtopics")
    .insert(subtopic)
    .select()
    .single();
  if (error) {
    console.error("Error creating subtopic:", error);
    throw error;
  }
  return data as Subtopic;
};

export const updateSubtopic = async (id: string, subtopic: Partial<Subtopic>): Promise<Subtopic | null> => {
  const { data, error } = await supabase
    .from("subtopics")
    .update(subtopic)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error(`Error updating subtopic ${id}:`, error);
    throw error;
  }
  return data as Subtopic;
};

export const deleteSubtopic = async (id: string): Promise<void> => {
  const { error } = await supabase.from("subtopics").delete().eq("id", id);
  if (error) {
    console.error(`Error deleting subtopic ${id}:`, error);
    throw error;
  }
};

// --- Lessons ---
export const getLessonBySubtopicId = async (subtopicId: string): Promise<Lesson | null> => {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("subtopic_id", subtopicId)
    .single();
  if (error && error.code !== "PGRST116") {
    console.error(`Error fetching lesson for subtopic ${subtopicId}:`, error);
    return null;
  }
  return data ? (data as Lesson) : null;
};

export const createLesson = async (lesson: Omit<Lesson, "id" | "created_at" | "updated_at"> & { subtopic_id: string }): Promise<Lesson | null> => {
  const { data, error } = await supabase
    .from("lessons")
    .insert(lesson)
    .select()
    .single();
  if (error) {
    console.error("Error creating lesson:", error);
    throw error;
  }
  return data as Lesson;
};

export const updateLesson = async (id: string, lesson: Partial<Lesson>): Promise<Lesson | null> => {
  const { data, error } = await supabase
    .from("lessons")
    .update(lesson)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error(`Error updating lesson ${id}:`, error);
    throw error;
  }
  return data as Lesson;
};

export const deleteLesson = async (id: string): Promise<void> => {
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) {
    console.error(`Error deleting lesson ${id}:`, error);
    throw error;
  }
};

// --- Quizzes ---
export const getQuizzes = async (): Promise<Quiz[]> => {
  const { data, error } = await supabase.from("quizzes").select("*");
  if (error) {
    console.error("Error fetching quizzes:", error);
    return [];
  }
  return data as Quiz[];
};

export const getQuizById = async (id: string): Promise<Quiz | null> => {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") {
    console.error(`Error fetching quiz ${id}:`, error);
    return null;
  }
  return data as Quiz;
};

export const createQuiz = async (quiz: Omit<Quiz, "id" | "created_at" | "updated_at">): Promise<Quiz | null> => {
  const { data, error } = await supabase
    .from("quizzes")
    .insert(quiz)
    .select()
    .single();
  if (error) {
    console.error("Error creating quiz:", error);
    throw error;
  }
  return data as Quiz;
};

export const updateQuiz = async (id: string, quiz: Partial<Quiz>): Promise<Quiz | null> => {
  const { data, error } = await supabase
    .from("quizzes")
    .update(quiz)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error(`Error updating quiz ${id}:`, error);
    throw error;
  }
  return data as Quiz;
};

export const deleteQuiz = async (id: string): Promise<void> => {
  const { error } = await supabase.from("quizzes").delete().eq("id", id);
  if (error) {
    console.error(`Error deleting quiz ${id}:`, error);
    throw error;
  }
};

// --- Quiz Questions ---
export const getQuizQuestionsByQuizId = async (quizId: string): Promise<QuizQuestion[]> => {
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order_index");
  if (error) {
    console.error(`Error fetching quiz questions for quiz ${quizId}:`, error);
    return [];
  }
  return data as QuizQuestion[];
};

export const getQuizQuestionById = async (id: string): Promise<QuizQuestion | null> => {
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") {
    console.error(`Error fetching quiz question ${id}:`, error);
    return null;
  }
  return data as QuizQuestion;
};

export const createQuizQuestion = async (question: Omit<QuizQuestion, "id" | "created_at" | "updated_at">): Promise<QuizQuestion | null> => {
  const { data, error } = await supabase
    .from("quiz_questions")
    .insert(question)
    .select()
    .single();
  if (error) {
    console.error("Error creating quiz question:", error);
    throw error;
  }
  return data as QuizQuestion;
};

export const updateQuizQuestion = async (id: string, question: Partial<QuizQuestion>): Promise<QuizQuestion | null> => {
  const { data, error } = await supabase
    .from("quiz_questions")
    .update(question)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error(`Error updating quiz question ${id}:`, error);
    throw error;
  }
  return data as QuizQuestion;
};

export const deleteQuizQuestion = async (id: string): Promise<void> => {
  const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
  if (error) {
    console.error(`Error deleting quiz question ${id}:`, error);
    throw error;
  }
};

// --- User Progress ---
export const getUserProgress = async (userId: string): Promise<UserProgress[]> => {
  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId);
  if (error) {
    console.error(`Error fetching user progress for user ${userId}:`, error);
    return [];
  }
  return data as UserProgress[];
};

export const markLessonCompleted = async (userId: string, subtopicId: string): Promise<void> => {
  const { error } = await supabase
    .from("user_progress")
    .upsert({ user_id: userId, subtopic_id: subtopicId }, { onConflict: "user_id,subtopic_id" });
  if (error) {
    console.error(`Error marking lesson ${subtopicId} complete for user ${userId}:`, error);
    throw error;
  }
};

export const isLessonCompleted = async (userId: string, subtopicId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from("user_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("subtopic_id", subtopicId)
    .maybeSingle();
  if (error) {
    console.error(`Error checking lesson completion for user ${userId}, subtopic ${subtopicId}:`, error);
    return false;
  }
  return !!data;
};

// --- Bookmarks ---
export const getBookmarks = async (userId: string): Promise<Bookmark[]> => {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(`Error fetching bookmarks for user ${userId}:`, error);
    return [];
  }
  return data as Bookmark[];
};

export const addBookmark = async (bookmark: Omit<Bookmark, "id" | "created_at">): Promise<Bookmark | null> => {
  const { data, error } = await supabase
    .from("bookmarks")
    .insert(bookmark)
    .select()
    .single();
  if (error) {
    console.error("Error adding bookmark:", error);
    throw error;
  }
  return data as Bookmark;
};

export const removeBookmark = async (id: string): Promise<void> => {
  const { error } = await supabase.from("bookmarks").delete().eq("id", id);
  if (error) {
    console.error(`Error removing bookmark ${id}:`, error);
    throw error;
  }
};

export const isBookmarked = async (userId: string, url: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("url", url)
    .maybeSingle();
  if (error) {
    console.error(`Error checking bookmark status for user ${userId}, url ${url}:`, error);
    return false;
  }
  return !!data;
};

// --- Image Upload Utility ---
export const uploadImage = async (file: File, bucket: string = "uploads"): Promise<string | null> => {
  if (!file) return null;

  const filePath = `images/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
  if (uploadError) {
    console.error("Error uploading image:", uploadError);
    throw uploadError;
  }
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return publicUrl;
};

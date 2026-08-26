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
  GroupedMaterials,
  MaterialGroup,
  LiveClassroom,
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
  getSiteContent<{ 
    heroTitle: string; 
    heroSubtitle: string; 
    videoUrl?: string; 
    videoVisible?: boolean;
    secondaryVideoUrl?: string;
    enableVideoSequence?: boolean;
  }>("homepage_hero");
export const updateHomepageHero = (data: { 
  heroTitle: string; 
  heroSubtitle: string; 
  videoUrl?: string; 
  videoVisible?: boolean;
  secondaryVideoUrl?: string;
  enableVideoSequence?: boolean;
}) =>
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

// --- Material Groups (admin-created categories) ---
// Stored as a single row under the key `materials_groups`. Every save
// appends new groups/items to the existing payload, so previous content is
// never lost when the admin adds a new category or new materials.
const EMPTY_GROUPED: GroupedMaterials = {
  groups: [],
  gallery: [],
  videos: [],
  pdfs: [],
};

export const getMaterialsGroups = async (): Promise<GroupedMaterials> => {
  const data = await getSiteContent<GroupedMaterials>("materials_groups");
  return data ?? { ...EMPTY_GROUPED };
};

export const updateMaterialsGroups = (data: GroupedMaterials) =>
  updateSiteContent("materials_groups", data);

// Merge helpers: existing payload is preserved; only the provided changes
// (new groups, newly added items) are appended.
export const appendMaterialGroups = async (
  partial: Partial<GroupedMaterials>
): Promise<GroupedMaterials> => {
  const current = await getMaterialsGroups();
  const next: GroupedMaterials = {
    groups: [...(current.groups ?? [])],
    gallery: [...(current.gallery ?? [])],
    videos: [...(current.videos ?? [])],
    pdfs: [...(current.pdfs ?? [])],
  };
  if (partial.groups) next.groups = [...next.groups, ...partial.groups];
  if (partial.gallery) next.gallery = [...next.gallery, ...partial.gallery];
  if (partial.videos) next.videos = [...next.videos, ...partial.videos];
  if (partial.pdfs) next.pdfs = [...next.pdfs, ...partial.pdfs];
  await updateMaterialsGroups(next);
  return next;
};

export const updateMaterialsGroupsFull = async (
  next: GroupedMaterials
): Promise<void> => {
  await updateMaterialsGroups(next);
};

export const deleteMaterialGroup = async (groupId: string): Promise<GroupedMaterials> => {
  const current = await getMaterialsGroups();
  const next: GroupedMaterials = {
    ...current,
    groups: (current.groups ?? []).filter((g) => g.id !== groupId),
    gallery: (current.gallery ?? []).map((item) =>
      item.group_id === groupId ? { ...item, group_id: undefined } : item
    ),
    videos: (current.videos ?? []).map((item) =>
      item.group_id === groupId ? { ...item, group_id: undefined } : item
    ),
    pdfs: (current.pdfs ?? []).map((item) =>
      item.group_id === groupId ? { ...item, group_id: undefined } : item
    ),
  };
  await updateMaterialsGroups(next);
  return next;
};

export const renameMaterialGroup = async (
  groupId: string,
  name: string,
  description?: string
): Promise<GroupedMaterials> => {
  const current = await getMaterialsGroups();
  const next = {
    ...current,
    groups: (current.groups ?? []).map((g) =>
      g.id === groupId ? { ...g, name, description } : g
    ),
  };
  await updateMaterialsGroups(next);
  return next;
};

export const updateMaterialGroupFull = async (
  groupId: string,
  updates: Partial<MaterialGroup>
): Promise<GroupedMaterials> => {
  const current = await getMaterialsGroups();
  const next = {
    ...current,
    groups: (current.groups ?? []).map((g) =>
      g.id === groupId ? { ...g, ...updates } : g
    ),
  };
  await updateMaterialsGroups(next);
  return next;
};

export const moveMaterialGroup = async (
  groupId: string,
  direction: -1 | 1
): Promise<GroupedMaterials> => {
  const current = await getMaterialsGroups();
  const groups = [...(current.groups ?? [])].sort((a, b) => a.order_index - b.order_index);
  const index = groups.findIndex((g) => g.id === groupId);
  if (index < 0) return current;
  const swapIndex = index + direction;
  if (swapIndex < 0 || swapIndex >= groups.length) return current;
  const temp = groups[index].order_index;
  groups[index] = { ...groups[index], order_index: groups[swapIndex].order_index };
  groups[swapIndex] = { ...groups[swapIndex], order_index: temp };
  await updateMaterialsGroups({ ...current, groups });
  return { ...current, groups };
};

export const assignItemsToGroup = async (
  groupId: string,
  type: MaterialGroup["type"],
  itemIds: string[]
): Promise<GroupedMaterials> => {
  const current = await getMaterialsGroups();
  const key = type === "gallery" ? "gallery" : type === "video" ? "videos" : "pdfs";
  const next = {
    ...current,
    [key]: (current[key] ?? []).map((item: { id: string; group_id?: string }) => ({
      ...item,
      group_id: itemIds.includes(item.id) ? groupId : item.group_id === groupId ? undefined : item.group_id,
    })),
  };
  await updateMaterialsGroups(next);
  return next;
};

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
export const getAllSubtopics = async (): Promise<Subtopic[]> => {
  const { data, error } = await supabase
    .from("subtopics")
    .select("*")
    .order("topic_id")
    .order("order_index");
  if (error) {
    console.error("Error fetching all subtopics:", error);
    return [];
  }
  return data as Subtopic[];
};

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

// --- Live Classrooms ---
export const getLiveClassrooms = async (admin = false): Promise<LiveClassroom[]> => {
  if (admin) {
    const { data, error } = await supabase
      .from("live_classrooms")
      .select("*")
      .order("scheduled_start_at", { ascending: true });
    if (error) {
      console.error("Error fetching live classrooms:", error);
      throw error;
    }
    return (data || []) as LiveClassroom[];
  }

  const { data, error } = await supabase
    .from("live_classrooms")
    .select("id, room_name, title, description, subject, grade_level, host_name, scheduled_start_at, scheduled_end_at, published, status, created_at, updated_at")
    .eq("published", true)
    .eq("status", "scheduled")
    .gte("scheduled_start_at", new Date().toISOString())
    .order("scheduled_start_at", { ascending: true });
  if (error) {
    console.error("Error fetching live classrooms:", error);
    throw error;
  }
  return (data || []) as unknown as LiveClassroom[];
};

export const createLiveClassroom = async (
  classroom: Omit<LiveClassroom, "id" | "created_at" | "updated_at" | "status">,
): Promise<LiveClassroom> => {
  const { data, error } = await supabase
    .from("live_classrooms")
    .insert({ ...classroom, status: "scheduled" })
    .select()
    .single();
  if (error) {
    console.error("Error creating live classroom:", error);
    throw error;
  }
  return data as LiveClassroom;
};

export const updateLiveClassroom = async (
  id: string,
  classroom: Partial<LiveClassroom>,
): Promise<LiveClassroom> => {
  const { data, error } = await supabase
    .from("live_classrooms")
    .update(classroom)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error(`Error updating live classroom ${id}:`, error);
    throw error;
  }
  return data as LiveClassroom;
};

export const deleteLiveClassroom = async (id: string): Promise<void> => {
  const { error } = await supabase.from("live_classrooms").delete().eq("id", id);
  if (error) {
    console.error(`Error deleting live classroom ${id}:`, error);
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

// --- Video Upload Utility ---
export const uploadVideo = async (file: File, bucket: string = "uploads"): Promise<string | null> => {
  if (!file) return null;

  const filePath = `videos/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
  if (uploadError) {
    console.error("Error uploading video:", uploadError);
    throw uploadError;
  }
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return publicUrl;
};

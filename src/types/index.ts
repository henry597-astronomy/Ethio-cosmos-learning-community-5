export interface Topic {
  id: string; // Changed to UUID
  emoji: string;
  title: string;
  description: string;
  image_url: string; // Changed from image to image_url
  difficulty?: string; // 'beginner' | 'intermediate' | 'advanced'
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface Subtopic {
  id: string; // Changed to UUID
  topic_id: string; // Changed to UUID
  emoji: string;
  title: string;
  description: string;
  difficulty?: string; // 'beginner' | 'intermediate' | 'advanced'
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface LessonBlock {
  type: 'text' | 'image';
  content: string;
}

export interface Lesson {
  id: string; // Changed to UUID
  subtopic_id: string; // Changed to UUID
  title: string; // Added title
  content_blocks: LessonBlock[];
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  message_text?: string | null;
  image_url?: string | null;
  created_at: string;
  // Optional joined fields (filled client-side from profiles)
  sender_name: string;
  sender_email?: string;
  sender_avatar?: string;
  sender_role?: string;
}

export interface ChannelReaction {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ChannelComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
  sender_role?: string;
  sender_email?: string;
  reactions?: CommentReaction[];
}

export interface ChannelPost {
  id: string;
  user_id: string;
  message_text?: string | null;
  image_url?: string | null;
  created_at: string;
  pinned_at?: string | null;
  sender_name: string;
  sender_email?: string;
  sender_avatar?: string;
  sender_role?: string;
  reactions: ChannelReaction[];
  comments: ChannelComment[];
}

export interface UserProfile {
  id: string;
  username: string | null;
  bio: string | null;
  email: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  is_blocked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SpaceNews {
  id: string;
  external_id: string;
  title: string;
  summary: string;
  full_explanation: string | null;
  fun_fact: string | null;
  image_url: string | null;
  source_name: string;
  source_url: string;
  category: string;
  published_date: string;
  ai_generated: boolean;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface FeaturedTopic {
  id: string;
  title: string;
  description: string;
  image_url: string;
}

// Backwards-compat helper for legacy seed data that may still use `image`
export type FeaturedTopicRaw = FeaturedTopic & { image?: string };

export interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  title: string;
  group_id?: string;
}

export interface VideoItem {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  group_id?: string;
}

export interface PdfItem {
  id: string;
  url: string;
  title: string;
  label: string;
  group_id?: string;
}

// Shape of the `about_content` row in `site_content`. Matches the JSON
// stored in Supabase and the form fields rendered in AdminPage.
export interface TeamMember {
  id: string;
  name: string;
  work: string;
  image_url: string;
}

export interface AboutContent {
  missionText: string;
  whoWeAreText1: string;
  whoWeAreText2: string;
  missionImage: string;
  whoWeAreImage1: string;
  whoWeAreImage2: string;
  team: {
    platformCreators: TeamMember[];
    educationalAdvisors: TeamMember[];
    communityMembers: TeamMember[];
  };
}

// New types for Quizzes
export interface Quiz {
  id: string;
  title: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

// New types for User Progress
export interface UserProgress {
  id: string;
  user_id: string;
  subtopic_id: string;
  completed_at?: string;
}

// New types for Bookmarks
export interface Bookmark {
  id: string;
  user_id: string;
  title: string;
  url: string;
  type: string;
  created_at?: string;
}

// Site Content types for site_content table
export type SiteContentKey = 
  | 'homepage_hero'
  | 'homepage_feature_cards'
  | 'homepage_featured_topics'
  | 'about_content'
  | 'materials_gallery_images'
  | 'materials_videos'
  | 'materials_pdfs'
  | 'materials_groups';

// Material groups: admin-created named categories for downloads, galleries
// and videos. Users browse materials grouped under these categories.
export type MaterialType = 'gallery' | 'video' | 'pdf';

export interface MaterialGroup {
  id: string;
  type: MaterialType;
  name: string;
  description?: string;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface GroupedMaterials {
  groups: MaterialGroup[];
  gallery: GalleryImage[];
  videos: VideoItem[];
  pdfs: PdfItem[];
}

export type SiteContentValue = 
  | { heroTitle: string; heroSubtitle: string; videoUrl?: string; videoVisible?: boolean }
  | FeatureCard[]
  | FeaturedTopic[]
  | AboutContent
  | GalleryImage[]
  | VideoItem[]
  | PdfItem[]
  | GroupedMaterials;

export interface SiteContent {
  key: SiteContentKey;
  value: SiteContentValue;
  updated_at?: string;
}

export interface Short {
  id: string;
  user_id: string;
  video_url: string;
  caption?: string;
  created_at: string;
  likes_count: number;
  is_active: boolean;
  // Optional joined fields
  user_name?: string;
  user_avatar?: string;
}

export interface Topic {
  id: string; // Changed to UUID
  emoji: string;
  title: string;
  description: string;
  image_url: string; // Changed from image to image_url
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
  sender_name?: string;
  sender_email?: string;
}

export interface UserProfile {
  id: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at?: string;
  updated_at?: string;
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
}

export interface VideoItem {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
}

export interface PdfItem {
  id: string;
  url: string;
  title: string;
  label: string;
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
  | 'materials_pdfs';

export type SiteContentValue = 
  | { heroTitle: string; heroSubtitle: string }
  | FeatureCard[]
  | FeaturedTopic[]
  | AboutContent
  | GalleryImage[]
  | VideoItem[]
  | PdfItem[];

export interface SiteContent {
  key: SiteContentKey;
  value: SiteContentValue;
  updated_at?: string;
}

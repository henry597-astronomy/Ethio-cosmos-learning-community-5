import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getVideoType, getEmbedUrl } from '@/lib/video-utils';
import { useHomepageHero, useHomepageFeatureCards, useHomepageFeaturedTopics, useAboutContent, useMaterialsGalleryImages, useMaterialsVideos, useMaterialsPdfs, useTopics, useQuizzes } from '@/hooks/use-cms-data';
import {
  useSubtopics,
  useLesson,
  useQuizQuestions,
} from '@/hooks/use-cms-data';
import { supabase, isValidConfig } from '@/supabase';
import { uploadImage } from '@/services/cms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUp, ArrowDown, Plus, Trash2, Upload, Check, X } from 'lucide-react';
import type {
  Topic,
  Subtopic,
  LessonBlock,
  FeaturedTopic,
  FeatureCard,
  GalleryImage,
  VideoItem,
  PdfItem,
  Quiz,
  QuizQuestion,
  AboutContent,
  TeamMember,
} from '@/types';

const DEFAULT_ABOUT: AboutContent = {
  missionText: '',
  whoWeAreText1: '',
  whoWeAreText2: '',
  missionImage: '',
  whoWeAreImage1: '',
  whoWeAreImage2: '',
  team: {
    platformCreators: [],
    educationalAdvisors: [],
    communityMembers: [],
  },
};

// Use the platform's built-in UUID generator instead of pulling in the `uuid`
// package, which wasn't actually listed in package.json.
function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Extremely defensive fallback (shouldn't be needed in any modern browser).
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Image Upload Component ───────────────────────────────────────────────────
interface ImageUploadProps {
  currentImage: string;
  onImageUploaded: (url: string) => void;
  label?: string;
}

function ImageUpload({ currentImage, onImageUploaded, label }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidConfig) {
      alert('Supabase is not configured. Please add your credentials to the .env file.');
      return;
    }

    setUploading(true);
    try {
      const publicUrl = await uploadImage(file, 'uploads');
      if (publicUrl) {
        onImageUploaded(publicUrl);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Make sure the "uploads" storage bucket exists in Supabase and RLS policies allow uploads.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {label && <label className="block text-sm text-gray-400">{label}</label>}
      <div className="flex items-center gap-4">
        {currentImage && (
          <img src={currentImage} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-white/10" />
        )}
        <div className="flex-1">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Upload size={16} className="mr-2" />
            {uploading ? 'Uploading...' : 'Upload Image'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Page ───────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user } = useAuth();
  const homepageHero = useHomepageHero();
  const homepageFeatureCards = useHomepageFeatureCards();
  const homepageFeaturedTopics = useHomepageFeaturedTopics();
  const aboutContent = useAboutContent();
  const materialsGalleryImages = useMaterialsGalleryImages();
  const materialsVideos = useMaterialsVideos();
  const materialsPdfs = useMaterialsPdfs();
  const topicsHook = useTopics();
  const quizzesHook = useQuizzes();

  const [activeTab, setActiveTab] = useState('homepage');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedSubtopicId, setSelectedSubtopicId] = useState<string | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; email: string; username: string; role: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, username, role')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (err: unknown) {
      setUsersError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;
      setUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, role: newRole } : u)
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  // Local state for hero section (to avoid auto-save)
  const [heroLocal, setHeroLocal] = useState(homepageHero.hero);
  const [heroModified, setHeroModified] = useState(false);

  // Sync local state when data finishes loading
  useEffect(() => {
    if (homepageHero.hero && !heroLocal) {
      setHeroLocal(homepageHero.hero);
    }
  }, [homepageHero.hero, heroLocal]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  // Local state for feature cards
  const [featureCardsLocal, setFeatureCardsLocal] = useState(homepageFeatureCards.featureCards);
  const [featureCardsModified, setFeatureCardsModified] = useState(false);

  // Local state for featured topics
  const [featuredTopicsLocal, setFeaturedTopicsLocal] = useState(homepageFeaturedTopics.featuredTopics);
  const [featuredTopicsModified, setFeaturedTopicsModified] = useState(false);

  // Local state for about content
  const [aboutLocal, setAboutLocal] = useState(aboutContent.aboutContent || DEFAULT_ABOUT);
  const [aboutModified, setAboutModified] = useState(false);

  // Local state for gallery images
  const [galleryImagesLocal, setGalleryImagesLocal] = useState(materialsGalleryImages.galleryImages);
  const [galleryImagesModified, setGalleryImagesModified] = useState(false);

  // Local state for videos
  const [videosLocal, setVideosLocal] = useState(materialsVideos.videos);
  const [videosModified, setVideosModified] = useState(false);

  // Local state for PDFs
  const [pdfsLocal, setPdfsLocal] = useState(materialsPdfs.pdfs);
  const [pdfsModified, setPdfsModified] = useState(false);

  // Parameterized hooks are called directly here (proper React hooks usage)
  // instead of through factory functions on the context.
  const { topics, addTopic, editTopic, removeTopic, fetchTopics, loading: topicsLoading, error: topicsError } = topicsHook;
  const { subtopics, addSubtopic, editSubtopic, removeSubtopic, fetchSubtopics, loading: subtopicsLoading, error: subtopicsError } =
    useSubtopics(selectedTopicId);
  const { lesson, saveLesson, loading: lessonLoading, error: lessonError } =
    useLesson(selectedSubtopicId);
  const { quizzes, addQuiz, editQuiz, removeQuiz, loading: quizzesLoading, error: quizzesError } = quizzesHook;
  const { quizQuestions, addQuizQuestion, editQuizQuestion, removeQuizQuestion, loading: quizQuestionsLoading, error: quizQuestionsError } =
    useQuizQuestions(selectedQuizId);

  // Auth guarding (login + admin role check) is handled by <ProtectedRoute>.
  // We only need the user here for display.
  if (!user) return null;

  // Only block on initial load errors, not on save errors
  const allLoading = topicsLoading || subtopicsLoading || lessonLoading || quizzesLoading || quizQuestionsLoading || homepageHero.loading || homepageFeatureCards.loading || homepageFeaturedTopics.loading || aboutContent.loading || materialsGalleryImages.loading || materialsVideos.loading || materialsPdfs.loading;
  const initialLoadError = topicsError || subtopicsError || lessonError || quizzesError || quizQuestionsError || homepageHero.error || homepageFeatureCards.error || homepageFeaturedTopics.error || aboutContent.error || materialsGalleryImages.error || materialsVideos.error || materialsPdfs.error;

  if (allLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#0a0e1a] text-white">
        Loading admin data...
      </div>
    );
  }

  if (initialLoadError) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#0a0e1a] text-red-400">
        Error loading admin data: {initialLoadError}
      </div>
    );
  }

  // ── Homepage ────────────────────────────────────────────────────────────────
  const updateHeroLocal = (field: 'heroTitle' | 'heroSubtitle' | 'videoUrl' | 'videoVisible', value: string | boolean) => {
    setHeroLocal(prev => {
      const current = prev || { heroTitle: '', heroSubtitle: '', videoUrl: '', videoVisible: false };
      return { ...current, [field]: value };
    });
    setHeroModified(true);
  };

  const saveHero = async () => {
    if (!heroLocal) return;
    try {
      await homepageHero.saveHero(heroLocal);
      setHeroModified(false);
    } catch (err) {
      console.error('Failed to save hero:', err);
    }
  };

  const resetHero = () => {
    setHeroLocal(homepageHero.hero);
    setHeroModified(false);
  };

  const updateFeatureCardLocal = (i: number, field: keyof FeatureCard, value: string) => {
    const updated = [...featureCardsLocal];
    updated[i] = { ...updated[i], [field]: value };
    setFeatureCardsLocal(updated);
    setFeatureCardsModified(true);
  };

  const saveFeatureCards = async () => {
    try {
      await homepageFeatureCards.saveFeatureCards(featureCardsLocal);
      setFeatureCardsModified(false);
    } catch (err) {
      console.error('Failed to save feature cards:', err);
    }
  };

  const resetFeatureCards = () => {
    setFeatureCardsLocal(homepageFeatureCards.featureCards);
    setFeatureCardsModified(false);
  };

  const addFeatureCardLocal = () => {
    setFeatureCardsLocal([...featureCardsLocal, { icon: '✨', title: 'New Card', description: 'New description' }]);
    setFeatureCardsModified(true);
  };

  const deleteFeatureCardLocal = (i: number) => {
    setFeatureCardsLocal(featureCardsLocal.filter((_, idx) => idx !== i));
    setFeatureCardsModified(true);
  };

  const updateFeaturedTopicLocal = (i: number, field: keyof FeaturedTopic, value: string) => {
    const updated = [...featuredTopicsLocal];
    updated[i] = { ...updated[i], [field]: value };
    setFeaturedTopicsLocal(updated);
    setFeaturedTopicsModified(true);
  };

  const saveFeaturedTopics = async () => {
    try {
      await homepageFeaturedTopics.saveFeaturedTopics(featuredTopicsLocal);
      setFeaturedTopicsModified(false);
    } catch (err) {
      console.error('Failed to save featured topics:', err);
    }
  };

  const resetFeaturedTopics = () => {
    setFeaturedTopicsLocal(homepageFeaturedTopics.featuredTopics);
    setFeaturedTopicsModified(false);
  };

  const addFeaturedTopicLocal = () => {
    const newTopic: FeaturedTopic = { id: newId(), title: 'New Topic', description: 'Description', image_url: '/images/topic-fundamentals.jpg' };
    setFeaturedTopicsLocal([...featuredTopicsLocal, newTopic]);
    setFeaturedTopicsModified(true);
  };

  const deleteFeaturedTopicLocal = (i: number) => {
    setFeaturedTopicsLocal(featuredTopicsLocal.filter((_, idx) => idx !== i));
    setFeaturedTopicsModified(true);
  };

  // ── Topics ──────────────────────────────────────────────────────────────────
  const handleUpdateTopic = async (id: string, field: keyof Topic, value: string | number) => {
    try {
      await editTopic(id, { [field]: value });
    } catch (err) {
      console.error('Failed to update topic:', err);
    }
  };

  const handleAddTopic = async () => {
    try {
      const newTopic: Omit<Topic, "id" | "created_at" | "updated_at"> = { 
        emoji: '🚀', 
        title: 'New Topic', 
        description: 'Description', 
        order_index: topics.length, 
        image_url: '/images/topic-fundamentals.jpg' 
      };
      await addTopic(newTopic);
    } catch (err) {
      console.error('Failed to add topic:', err);
    }
  };

  const handleDeleteTopic = async (id: string) => {
    try {
      await removeTopic(id);
    } catch (err) {
      console.error('Failed to delete topic:', err);
    }
  };

  const moveTopic = async (i: number, dir: 'up' | 'down') => {
    try {
      const updatedTopics = [...topics];
      if (dir === 'up' && i === 0) return;
      if (dir === 'down' && i === updatedTopics.length - 1) return;
      const swap = dir === 'up' ? i - 1 : i + 1;
      [updatedTopics[i], updatedTopics[swap]] = [updatedTopics[swap], updatedTopics[i]];
      // Update order_index for both swapped topics
      await editTopic(updatedTopics[i].id, { order_index: i });
      await editTopic(updatedTopics[swap].id, { order_index: swap });
      // Re-fetch to ensure UI is consistent with DB order
      fetchTopics();
    } catch (err) {
      console.error('Failed to move topic:', err);
    }
  };

  // ── Subtopics ───────────────────────────────────────────────────────────────
  const handleUpdateSubtopic = async (id: string, field: keyof Subtopic, value: string | number) => {
    try {
      await editSubtopic(id, { [field]: value });
    } catch (err) {
      console.error('Failed to update subtopic:', err);
    }
  };

  const handleAddSubtopic = async () => {
    try {
      if (!selectedTopicId) return;
      const newSubtopic: Omit<Subtopic, "id" | "created_at" | "updated_at"> = { 
        topic_id: selectedTopicId, 
        emoji: '📚', 
        title: 'New Lesson', 
        description: 'Lesson description', 
        order_index: subtopics.length 
      };
      await addSubtopic(newSubtopic);
    } catch (err) {
      console.error('Failed to add subtopic:', err);
    }
  };

  const handleDeleteSubtopic = async (id: string) => {
    try {
      await removeSubtopic(id);
    } catch (err) {
      console.error('Failed to delete subtopic:', err);
    }
  };

  const moveSubtopic = async (i: number, dir: 'up' | 'down') => {
    try {
      if (!selectedTopicId) return;
      const updatedSubtopics = [...subtopics];
      if (dir === 'up' && i === 0) return;
      if (dir === 'down' && i === updatedSubtopics.length - 1) return;
      const swap = dir === 'up' ? i - 1 : i + 1;
      [updatedSubtopics[i], updatedSubtopics[swap]] = [updatedSubtopics[swap], updatedSubtopics[i]];
      // Update order_index for both swapped subtopics
      await editSubtopic(updatedSubtopics[i].id, { order_index: i });
      await editSubtopic(updatedSubtopics[swap].id, { order_index: swap });
      // Re-fetch to ensure UI is consistent with DB order
      fetchSubtopics();
    } catch (err) {
      console.error('Failed to move subtopic:', err);
    }
  };

  // ── Lessons ─────────────────────────────────────────────────────────────────
  const currentLessonBlocks = lesson?.content_blocks || [];

  const handleSaveLessonBlocks = async (blocks: LessonBlock[]) => {
    try {
      if (!selectedSubtopicId) return;
      const currentSubtopic = subtopics.find(s => s.id === selectedSubtopicId);
      if (!currentSubtopic) return;

      await saveLesson({
        subtopic_id: selectedSubtopicId,
        title: currentSubtopic.title, // Lesson title from subtopic
        content_blocks: blocks,
      });
    } catch (err) {
      console.error('Failed to save lesson blocks:', err);
    }
  };

  const updateLessonBlock = (i: number, content: string) => {
    const updatedBlocks = [...currentLessonBlocks];
    updatedBlocks[i] = { ...updatedBlocks[i], content };
    handleSaveLessonBlocks(updatedBlocks);
  };

  const addLessonBlock = (type: 'text' | 'image') => {
    handleSaveLessonBlocks([...currentLessonBlocks, { type, content: '' }]);
  };

  const removeLessonBlock = (i: number) => {
    handleSaveLessonBlocks(currentLessonBlocks.filter((_, idx) => idx !== i));
  };

  const moveLessonBlock = (i: number, dir: 'up' | 'down') => {
    const updatedBlocks = [...currentLessonBlocks];
    if (dir === 'up' && i === 0) return;
    if (dir === 'down' && i === updatedBlocks.length - 1) return;
    const swap = dir === 'up' ? i - 1 : i + 1;
    [updatedBlocks[i], updatedBlocks[swap]] = [updatedBlocks[swap], updatedBlocks[i]];
    handleSaveLessonBlocks(updatedBlocks);
  };

  // ── About Page ──────────────────────────────────────────────────────────────
  const updateAboutLocal = (field: keyof AboutContent, value: string) => {
    setAboutLocal(prev => ({ ...prev, [field]: value }));
    setAboutModified(true);
  };

  const saveAbout = async () => {
    try {
      await aboutContent.saveAboutContent(aboutLocal);
      setAboutModified(false);
    } catch (err) {
      console.error('Failed to save about content:', err);
    }
  };

  const resetAbout = () => {
    setAboutLocal(aboutContent.aboutContent || DEFAULT_ABOUT);
    setAboutModified(false);
  };

  const updateTeamMemberLocal = (
    category: keyof AboutContent['team'],
    id: string,
    field: keyof TeamMember,
    value: string
  ) => {
    const updatedTeam = { ...aboutLocal.team };
    updatedTeam[category] = updatedTeam[category].map((member) =>
      member.id === id ? { ...member, [field]: value } : member
    );
    setAboutLocal((prev) => ({ ...prev, team: updatedTeam }));
    setAboutModified(true);
  };

  const addTeamMemberLocal = (category: keyof AboutContent['team']) => {
    const updatedTeam = { ...aboutLocal.team };
    const newMember: TeamMember = { id: newId(), name: 'New Member', work: 'Role/Work', image_url: '' };
    updatedTeam[category] = [...updatedTeam[category], newMember];
    setAboutLocal((prev) => ({ ...prev, team: updatedTeam }));
    setAboutModified(true);
  };

  const deleteTeamMemberLocal = (category: keyof AboutContent['team'], id: string) => {
    const updatedTeam = { ...aboutLocal.team };
    updatedTeam[category] = updatedTeam[category].filter((member) => member.id !== id);
    setAboutLocal((prev) => ({ ...prev, team: updatedTeam }));
    setAboutModified(true);
  };

  // ── Materials ───────────────────────────────────────────────────────────────
  const updateGalleryImageLocal = (id: string, field: keyof GalleryImage, value: string) => {
    const updated = galleryImagesLocal.map(img => 
      img.id === id ? { ...img, [field]: value } : img
    );
    setGalleryImagesLocal(updated);
    setGalleryImagesModified(true);
  };

  const saveGalleryImages = async () => {
    try {
      await materialsGalleryImages.saveGalleryImages(galleryImagesLocal);
      setGalleryImagesModified(false);
    } catch (err) {
      console.error('Failed to save gallery images:', err);
    }
  };

  const resetGalleryImages = () => {
    setGalleryImagesLocal(materialsGalleryImages.galleryImages);
    setGalleryImagesModified(false);
  };

  const addGalleryImageLocal = () => {
    const newImage: GalleryImage = { id: newId(), url: '', title: 'New Image' };
    setGalleryImagesLocal([...galleryImagesLocal, newImage]);
    setGalleryImagesModified(true);
  };

  const deleteGalleryImageLocal = (id: string) => {
    setGalleryImagesLocal(galleryImagesLocal.filter(img => img.id !== id));
    setGalleryImagesModified(true);
  };

  const updateVideoLocal = (id: string, field: keyof VideoItem, value: string) => {
    const updated = videosLocal.map(video => 
      video.id === id ? { ...video, [field]: value } : video
    );
    setVideosLocal(updated);
    setVideosModified(true);
  };

  const saveVideos = async () => {
    try {
      await materialsVideos.saveVideos(videosLocal);
      setVideosModified(false);
    } catch (err) {
      console.error('Failed to save videos:', err);
    }
  };

  const resetVideos = () => {
    setVideosLocal(materialsVideos.videos);
    setVideosModified(false);
  };

  const addVideoLocal = () => {
    const newVideo: VideoItem = { id: newId(), url: '', thumbnail: '', title: 'New Video' };
    setVideosLocal([...videosLocal, newVideo]);
    setVideosModified(true);
  };

  const deleteVideoLocal = (id: string) => {
    setVideosLocal(videosLocal.filter(video => video.id !== id));
    setVideosModified(true);
  };

  const updatePdfLocal = (id: string, field: keyof PdfItem, value: string) => {
    const updated = pdfsLocal.map(pdf => 
      pdf.id === id ? { ...pdf, [field]: value } : pdf
    );
    setPdfsLocal(updated);
    setPdfsModified(true);
  };

  const savePdfs = async () => {
    try {
      await materialsPdfs.savePdfs(pdfsLocal);
      setPdfsModified(false);
    } catch (err) {
      console.error('Failed to save PDFs:', err);
    }
  };

  const resetPdfs = () => {
    setPdfsLocal(materialsPdfs.pdfs);
    setPdfsModified(false);
  };

  const addPdfLocal = () => {
    const newPdf: PdfItem = { id: newId(), url: '', title: 'New PDF', label: 'New PDF' };
    setPdfsLocal([...pdfsLocal, newPdf]);
    setPdfsModified(true);
  };

  const deletePdfLocal = (id: string) => {
    setPdfsLocal(pdfsLocal.filter(pdf => pdf.id !== id));
    setPdfsModified(true);
  };

  // ── Quizzes ─────────────────────────────────────────────────────────────────
  const handleAddQuiz = async () => {
    try {
      const newQuiz: Omit<Quiz, "id" | "created_at" | "updated_at"> = { title: 'New Quiz', description: 'Quiz description' };
      await addQuiz(newQuiz);
    } catch (err) {
      console.error('Failed to add quiz:', err);
    }
  };

  const handleUpdateQuiz = async (id: string, field: keyof Quiz, value: string) => {
    try {
      await editQuiz(id, { [field]: value });
    } catch (err) {
      console.error('Failed to update quiz:', err);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    try {
      await removeQuiz(id);
    } catch (err) {
      console.error('Failed to delete quiz:', err);
    }
  };

  // ── Quiz Questions ──────────────────────────────────────────────────────────
  const handleAddQuizQuestion = async () => {
    try {
      if (!selectedQuizId) return;
      const newQuestion: Omit<QuizQuestion, "id" | "created_at" | "updated_at"> = {
        quiz_id: selectedQuizId,
        question_text: 'New Question',
        options: ['Option 1', 'Option 2'],
        correct_answer: 0,
        order_index: quizQuestions.length,
      };
      await addQuizQuestion(newQuestion);
    } catch (err) {
      console.error('Failed to add quiz question:', err);
    }
  };

  const handleUpdateQuizQuestion = async (
    id: string,
    field: keyof QuizQuestion,
    value: QuizQuestion[keyof QuizQuestion]
  ) => {
    try {
      await editQuizQuestion(id, { [field]: value });
    } catch (err) {
      console.error('Failed to update quiz question:', err);
    }
  };

  const handleDeleteQuizQuestion = async (id: string) => {
    try {
      await removeQuizQuestion(id);
    } catch (err) {
      console.error('Failed to delete quiz question:', err);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 bg-[#0a0e1a]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400 mb-8">Signed in as {user.email}</p>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900 border border-white/10 mb-8 flex flex-wrap gap-1 h-auto p-1">
            {['homepage','topics','subtopics','lessons','about','materials', 'quizzes', 'users'].map(tab => (
              <TabsTrigger key={tab} value={tab} className="data-[state=active]:bg-orange-500 data-[state=active]:text-white capitalize">
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── HOMEPAGE TAB ────────────────────────────────────────────── */}
          <TabsContent value="homepage" className="space-y-8">
            {/* Hero Section */}
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Hero Section</h2>
                {heroModified && (
                  <div className="flex gap-2">
                    <Button onClick={saveHero} className="bg-green-600 hover:bg-green-700 text-white">
                      <Check size={16} className="mr-2" /> Save Changes
                    </Button>
                    <Button onClick={resetHero} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <X size={16} className="mr-2" /> Discard
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title</label>
                  <Input value={heroLocal?.heroTitle || ''} onChange={(e) => updateHeroLocal('heroTitle', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Subtitle</label>
                  <Input value={heroLocal?.heroSubtitle || ''} onChange={(e) => updateHeroLocal('heroSubtitle', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                </div>
                <div className="border-t border-white/10 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Hero Video</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Video URL</label>
                      <Input value={heroLocal?.videoUrl || ''} onChange={(e) => updateHeroLocal('videoUrl', e.target.value)} placeholder="https://example.com/video.mp4 or https://youtube.com/watch?v=..." className="bg-slate-800 border-white/20 text-white" />
                      <p className="text-xs text-gray-500 mt-1">Supports: Direct video files (MP4, WebM), YouTube links, or Google Drive videos</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="videoVisible" 
                        checked={heroLocal?.videoVisible || false} 
                        onChange={(e) => updateHeroLocal('videoVisible', e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-slate-800 cursor-pointer"
                      />
                      <label htmlFor="videoVisible" className="text-sm text-gray-400 cursor-pointer">Show video on homepage</label>
                    </div>
                    {heroLocal?.videoUrl && (
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-white/10">
                        <p className="text-xs text-gray-400 mb-2">Video Type: <span className="text-orange-400 font-semibold">{getVideoType(heroLocal.videoUrl) === 'youtube' ? 'YouTube' : getVideoType(heroLocal.videoUrl) === 'google-drive' ? 'Google Drive' : getVideoType(heroLocal.videoUrl) === 'direct' ? 'Direct Video' : 'Unknown'}</span></p>
                        {getVideoType(heroLocal.videoUrl) === 'youtube' ? (
                          <div className="relative w-full aspect-video bg-black rounded overflow-hidden">
                            <iframe
                              width="100%"
                              height="100%"
                              src={getEmbedUrl(heroLocal.videoUrl) || ''}
                              title="Preview"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="absolute inset-0"
                            />
                          </div>
                        ) : getVideoType(heroLocal.videoUrl) === 'google-drive' ? (
                          <div className="relative w-full aspect-video bg-black rounded overflow-hidden">
                            <iframe
                              width="100%"
                              height="100%"
                              src={getEmbedUrl(heroLocal.videoUrl) || ''}
                              title="Preview"
                              frameBorder="0"
                              allow="autoplay"
                              allowFullScreen
                              className="absolute inset-0"
                            />
                          </div>
                        ) : getVideoType(heroLocal.videoUrl) === 'direct' ? (
                          <video 
                            controls 
                            className="w-full h-auto max-h-48 rounded bg-black"
                            src={heroLocal.videoUrl}
                          />
                        ) : (
                          <div className="w-full aspect-video bg-black rounded flex items-center justify-center text-gray-500 text-sm">
                            Invalid video URL
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Feature Cards</h2>
                {featureCardsModified && (
                  <div className="flex gap-2">
                    <Button onClick={saveFeatureCards} className="bg-green-600 hover:bg-green-700 text-white">
                      <Check size={16} className="mr-2" /> Save Changes
                    </Button>
                    <Button onClick={resetFeatureCards} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <X size={16} className="mr-2" /> Discard
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {featureCardsLocal.map((card, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="block text-sm text-gray-400">Icon (Emoji)</label>
                      <Input value={card.icon} onChange={(e) => updateFeatureCardLocal(i, 'icon', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <label className="block text-sm text-gray-400">Title</label>
                      <Input value={card.title} onChange={(e) => updateFeatureCardLocal(i, 'title', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <label className="block text-sm text-gray-400">Description</label>
                      <Textarea value={card.description} onChange={(e) => updateFeatureCardLocal(i, 'description', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => deleteFeatureCardLocal(i)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
                <Button onClick={addFeatureCardLocal} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus size={18} className="mr-2" /> Add Feature Card
                </Button>
              </div>
            </div>

            {/* Featured Topics */}
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Featured Topics</h2>
                {featuredTopicsModified && (
                  <div className="flex gap-2">
                    <Button onClick={saveFeaturedTopics} className="bg-green-600 hover:bg-green-700 text-white">
                      <Check size={16} className="mr-2" /> Save Changes
                    </Button>
                    <Button onClick={resetFeaturedTopics} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <X size={16} className="mr-2" /> Discard
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {featuredTopicsLocal.map((topic, i) => (
                  <div key={topic.id} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="block text-sm text-gray-400">Title</label>
                      <Input value={topic.title} onChange={(e) => updateFeaturedTopicLocal(i, 'title', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <label className="block text-sm text-gray-400">Description</label>
                      <Textarea value={topic.description} onChange={(e) => updateFeaturedTopicLocal(i, 'description', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <ImageUpload 
                        currentImage={topic.image_url}
                        onImageUploaded={(url) => updateFeaturedTopicLocal(i, 'image_url', url)}
                        label="Image URL"
                      />
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => deleteFeaturedTopicLocal(i)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
                <Button onClick={addFeaturedTopicLocal} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus size={18} className="mr-2" /> Add Featured Topic
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── TOPICS TAB ──────────────────────────────────────────────── */}
          <TabsContent value="topics" className="space-y-8">
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Manage Topics</h2>
              <div className="space-y-4">
                {topics.map((topic, i) => (
                  <div key={topic.id} className="flex items-center gap-4 p-3 bg-slate-800 rounded-lg border border-white/10">
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" onClick={() => moveTopic(i, 'up')} disabled={i === 0}><ArrowUp size={16} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => moveTopic(i, 'down')} disabled={i === topics.length - 1}><ArrowDown size={16} /></Button>
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="block text-sm text-gray-400">Emoji</label>
                      <Input value={topic.emoji} onChange={(e) => handleUpdateTopic(topic.id, 'emoji', e.target.value)} className="bg-slate-700 border-white/20 text-white" />
                      <label className="block text-sm text-gray-400">Title</label>
                      <Input value={topic.title} onChange={(e) => handleUpdateTopic(topic.id, 'title', e.target.value)} className="bg-slate-700 border-white/20 text-white" />
                      <label className="block text-sm text-gray-400">Description</label>
                      <Textarea value={topic.description || ''} onChange={(e) => handleUpdateTopic(topic.id, 'description', e.target.value)} className="bg-slate-700 border-white/20 text-white" />
                      <ImageUpload 
                        currentImage={topic.image_url}
                        onImageUploaded={(url) => handleUpdateTopic(topic.id, 'image_url', url)}
                        label="Image URL"
                      />
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteTopic(topic.id)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
                <Button onClick={handleAddTopic} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus size={18} className="mr-2" /> Add Topic
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── SUBTOPICS TAB ───────────────────────────────────────────── */}
          <TabsContent value="subtopics" className="space-y-8">
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Manage Subtopics</h2>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Select Topic</label>
                <select 
                  value={selectedTopicId || ''}
                  onChange={(e) => setSelectedTopicId(e.target.value || null)}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-white/20 text-white"
                >
                  <option value="">-- Select a Topic --</option>
                  {topics.map(topic => (
                    <option key={topic.id} value={topic.id}>{topic.title}</option>
                  ))}
                </select>
              </div>

              {selectedTopicId && (
                <div className="space-y-4 mt-4">
                  {subtopics.map((subtopic, i) => (
                    <div key={subtopic.id} className="flex items-center gap-4 p-3 bg-slate-800 rounded-lg border border-white/10">
                      <div className="flex flex-col gap-1">
                        <Button variant="ghost" size="icon" onClick={() => moveSubtopic(i, 'up')} disabled={i === 0}><ArrowUp size={16} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => moveSubtopic(i, 'down')} disabled={i === subtopics.length - 1}><ArrowDown size={16} /></Button>
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="block text-sm text-gray-400">Emoji</label>
                        <Input value={subtopic.emoji} onChange={(e) => handleUpdateSubtopic(subtopic.id, 'emoji', e.target.value)} className="bg-slate-700 border-white/20 text-white" />
                        <label className="block text-sm text-gray-400">Title</label>
                        <Input value={subtopic.title} onChange={(e) => handleUpdateSubtopic(subtopic.id, 'title', e.target.value)} className="bg-slate-700 border-white/20 text-white" />
                        <label className="block text-sm text-gray-400">Description</label>
                        <Textarea value={subtopic.description || ''} onChange={(e) => handleUpdateSubtopic(subtopic.id, 'description', e.target.value)} className="bg-slate-700 border-white/20 text-white" />
                      </div>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteSubtopic(subtopic.id)}>
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  ))}
                  <Button onClick={handleAddSubtopic} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus size={18} className="mr-2" /> Add Subtopic
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── LESSONS TAB ─────────────────────────────────────────────── */}
          <TabsContent value="lessons" className="space-y-8">
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Manage Lessons</h2>
              <div className="mb-4 flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1">Select Topic</label>
                  <select 
                    value={selectedTopicId || ''}
                    onChange={(e) => {
                      setSelectedTopicId(e.target.value || null);
                      setSelectedSubtopicId(null);
                    }}
                    className="w-full p-2 rounded-lg bg-slate-800 border border-white/20 text-white"
                  >
                    <option value="">-- Select a Topic --</option>
                    {topics.map(topic => (
                      <option key={topic.id} value={topic.id}>{topic.title}</option>
                    ))}
                  </select>
                </div>
                {selectedTopicId && (
                  <div className="flex-1">
                    <label className="block text-sm text-gray-400 mb-1">Select Subtopic</label>
                    <select 
                      value={selectedSubtopicId || ''}
                      onChange={(e) => setSelectedSubtopicId(e.target.value || null)}
                      className="w-full p-2 rounded-lg bg-slate-800 border border-white/20 text-white"
                    >
                      <option value="">-- Select a Subtopic --</option>
                      {subtopics.map(subtopic => (
                        <option key={subtopic.id} value={subtopic.id}>{subtopic.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {selectedSubtopicId && (
                <div className="space-y-4 mt-4">
                  {currentLessonBlocks.map((block, i) => (
                    <div key={i} className="flex items-start gap-4 p-3 bg-slate-800 rounded-lg border border-white/10">
                      <div className="flex flex-col gap-1">
                        <Button variant="ghost" size="icon" onClick={() => moveLessonBlock(i, 'up')} disabled={i === 0}><ArrowUp size={16} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => moveLessonBlock(i, 'down')} disabled={i === currentLessonBlocks.length - 1}><ArrowDown size={16} /></Button>
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="block text-sm text-gray-400">{block.type === 'image' ? 'Upload image' : `Type: ${block.type}`}</label>
                        {block.type === 'image' ? (
                          <div className="mt-2">
                            <ImageUpload 
                              currentImage={block.content}
                              onImageUploaded={(url) => updateLessonBlock(i, url)}
                            />
                          </div>
                        ) : (
                          <Textarea value={block.content} onChange={(e) => updateLessonBlock(i, e.target.value)} className="bg-slate-700 border-white/20 text-white" />
                        )}
                      </div>
                      <Button variant="destructive" size="icon" onClick={() => removeLessonBlock(i)}>
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button onClick={() => addLessonBlock('text')} className="bg-orange-500 hover:bg-orange-600 text-white">
                      <Plus size={18} className="mr-2" /> Add Text Block
                    </Button>
                    <Button onClick={() => addLessonBlock('image')} className="bg-orange-500 hover:bg-orange-600 text-white">
                      <Plus size={18} className="mr-2" /> Add Image Block
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── ABOUT TAB ───────────────────────────────────────────────── */}
          <TabsContent value="about" className="space-y-8">
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">About Page Content</h2>
                {aboutModified && (
                  <div className="flex gap-2">
                    <Button onClick={saveAbout} className="bg-green-600 hover:bg-green-700 text-white">
                      <Check size={16} className="mr-2" /> Save Changes
                    </Button>
                    <Button onClick={resetAbout} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <X size={16} className="mr-2" /> Discard
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Mission Text</label>
                  <Textarea value={aboutLocal.missionText} onChange={(e) => updateAboutLocal('missionText', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                </div>
                <ImageUpload 
                  currentImage={aboutLocal.missionImage}
                  onImageUploaded={(url) => updateAboutLocal('missionImage', url)}
                  label="Mission Image"
                />
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Who We Are - Text 1</label>
                  <Textarea value={aboutLocal.whoWeAreText1} onChange={(e) => updateAboutLocal('whoWeAreText1', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                </div>
                <ImageUpload 
                  currentImage={aboutLocal.whoWeAreImage1}
                  onImageUploaded={(url) => updateAboutLocal('whoWeAreImage1', url)}
                  label="Who We Are - Image 1"
                />
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Who We Are - Text 2</label>
                  <Textarea value={aboutLocal.whoWeAreText2} onChange={(e) => updateAboutLocal('whoWeAreText2', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                </div>
                <ImageUpload 
                  currentImage={aboutLocal.whoWeAreImage2}
                  onImageUploaded={(url) => updateAboutLocal('whoWeAreImage2', url)}
                  label="Who We Are - Image 2"
                />
              </div>

              {/* Team Sections */}
              <div className="mt-12 space-y-12">
                {(['platformCreators', 'educationalAdvisors', 'communityMembers'] as const).map((category) => (
                  <div key={category} className="bg-slate-800/50 rounded-xl p-6 border border-white/10">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-white capitalize">
                        {category.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                      <Button 
                        onClick={() => addTeamMemberLocal(category)} 
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <Plus size={16} className="mr-2" /> Add Member
                      </Button>
                    </div>
                    
                    <div className="space-y-6">
                      {(aboutLocal.team?.[category] || []).map((member) => (
                        <div key={member.id} className="flex items-start gap-4 p-4 bg-slate-900/50 rounded-lg border border-white/5">
                          <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="block text-xs text-gray-400">Name</label>
                                <Input 
                                  value={member.name} 
                                  onChange={(e) => updateTeamMemberLocal(category, member.id, 'name', e.target.value)} 
                                  className="bg-slate-800 border-white/10 text-white" 
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-xs text-gray-400">Work/Role</label>
                                <Input 
                                  value={member.work} 
                                  onChange={(e) => updateTeamMemberLocal(category, member.id, 'work', e.target.value)} 
                                  className="bg-slate-800 border-white/10 text-white" 
                                />
                              </div>
                            </div>
                            <ImageUpload 
                              currentImage={member.image_url}
                              onImageUploaded={(url) => updateTeamMemberLocal(category, member.id, 'image_url', url)}
                              label="Profile Image"
                            />
                          </div>
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            onClick={() => deleteTeamMemberLocal(category, member.id)}
                            className="mt-6"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      ))}
                      {(aboutLocal.team?.[category] || []).length === 0 && (
                        <p className="text-gray-500 text-center py-4">No members added yet.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── MATERIALS TAB ───────────────────────────────────────────── */}
          <TabsContent value="materials" className="space-y-8">
            {/* Gallery Images */}
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Gallery Images</h2>
                {galleryImagesModified && (
                  <div className="flex gap-2">
                    <Button onClick={saveGalleryImages} className="bg-green-600 hover:bg-green-700 text-white">
                      <Check size={16} className="mr-2" /> Save Changes
                    </Button>
                    <Button onClick={resetGalleryImages} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <X size={16} className="mr-2" /> Discard
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {galleryImagesLocal.map((image) => (
                  <div key={image.id} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="block text-sm text-gray-400">Title</label>
                      <Input value={image.title} onChange={(e) => updateGalleryImageLocal(image.id, 'title', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <ImageUpload 
                        currentImage={image.url}
                        onImageUploaded={(url) => updateGalleryImageLocal(image.id, 'url', url)}
                        label="Image"
                      />
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => deleteGalleryImageLocal(image.id)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
                <Button onClick={addGalleryImageLocal} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus size={18} className="mr-2" /> Add Gallery Image
                </Button>
              </div>
            </div>

            {/* Videos */}
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Videos</h2>
                {videosModified && (
                  <div className="flex gap-2">
                    <Button onClick={saveVideos} className="bg-green-600 hover:bg-green-700 text-white">
                      <Check size={16} className="mr-2" /> Save Changes
                    </Button>
                    <Button onClick={resetVideos} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <X size={16} className="mr-2" /> Discard
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {videosLocal.map((video) => (
                  <div key={video.id} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="block text-sm text-gray-400">Title</label>
                      <Input value={video.title} onChange={(e) => updateVideoLocal(video.id, 'title', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <label className="block text-sm text-gray-400">Video URL</label>
                      <Input value={video.url} onChange={(e) => updateVideoLocal(video.id, 'url', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <ImageUpload 
                        currentImage={video.thumbnail}
                        onImageUploaded={(url) => updateVideoLocal(video.id, 'thumbnail', url)}
                        label="Thumbnail"
                      />
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => deleteVideoLocal(video.id)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
                <Button onClick={addVideoLocal} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus size={18} className="mr-2" /> Add Video
                </Button>
              </div>
            </div>

            {/* PDFs */}
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">PDFs</h2>
                {pdfsModified && (
                  <div className="flex gap-2">
                    <Button onClick={savePdfs} className="bg-green-600 hover:bg-green-700 text-white">
                      <Check size={16} className="mr-2" /> Save Changes
                    </Button>
                    <Button onClick={resetPdfs} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <X size={16} className="mr-2" /> Discard
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {pdfsLocal.map((pdf) => (
                  <div key={pdf.id} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="block text-sm text-gray-400">Title</label>
                      <Input value={pdf.title} onChange={(e) => updatePdfLocal(pdf.id, 'title', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <label className="block text-sm text-gray-400">Label</label>
                      <Input value={pdf.label} onChange={(e) => updatePdfLocal(pdf.id, 'label', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <label className="block text-sm text-gray-400">PDF URL</label>
                      <Input value={pdf.url} onChange={(e) => updatePdfLocal(pdf.id, 'url', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => deletePdfLocal(pdf.id)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
                <Button onClick={addPdfLocal} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus size={18} className="mr-2" /> Add PDF
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── QUIZZES TAB ─────────────────────────────────────────────── */}
          <TabsContent value="quizzes" className="space-y-8">
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Manage Quizzes</h2>
              <div className="space-y-4">
                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="p-3 bg-slate-800 rounded-lg border border-white/10">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex-1 space-y-1">
                        <label className="block text-sm text-gray-400">Title</label>
                        <Input value={quiz.title} onChange={(e) => handleUpdateQuiz(quiz.id, 'title', e.target.value)} className="bg-slate-700 border-white/20 text-white" />
                        <label className="block text-sm text-gray-400">Description</label>
                        <Textarea value={quiz.description || ''} onChange={(e) => handleUpdateQuiz(quiz.id, 'description', e.target.value)} className="bg-slate-700 border-white/20 text-white" />
                      </div>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteQuiz(quiz.id)}>
                        <Trash2 size={18} />
                      </Button>
                    </div>

                    {/* Quiz Questions */}
                    {selectedQuizId === quiz.id && (
                      <div className="mt-4 p-3 bg-slate-700 rounded-lg border border-white/10">
                        <h3 className="text-white font-semibold mb-3">Questions</h3>
                        <div className="space-y-3">
                          {quizQuestions.map((question) => (
                            <div key={question.id} className="p-2 bg-slate-600 rounded border border-white/10">
                              <label className="block text-sm text-gray-400 mb-1">Question</label>
                              <Textarea value={question.question_text} onChange={(e) => handleUpdateQuizQuestion(question.id, 'question_text', e.target.value)} className="bg-slate-700 border-white/20 text-white mb-2" />
                              <label className="block text-sm text-gray-400 mb-1">Options (comma-separated)</label>
                              <Input value={question.options.join(', ')} onChange={(e) => handleUpdateQuizQuestion(question.id, 'options', e.target.value.split(', '))} className="bg-slate-700 border-white/20 text-white mb-2" />
                              <label className="block text-sm text-gray-400 mb-1">Correct Answer Index</label>
                              <Input type="number" value={question.correct_answer} onChange={(e) => handleUpdateQuizQuestion(question.id, 'correct_answer', parseInt(e.target.value))} className="bg-slate-700 border-white/20 text-white" />
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteQuizQuestion(question.id)} className="mt-2">
                                <Trash2 size={14} className="mr-1" /> Delete Question
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button onClick={handleAddQuizQuestion} className="mt-3 bg-orange-500 hover:bg-orange-600 text-white">
                          <Plus size={16} className="mr-2" /> Add Question
                        </Button>
                      </div>
                    )}

                    <Button onClick={() => setSelectedQuizId(selectedQuizId === quiz.id ? null : quiz.id)} className="mt-3 bg-blue-600 hover:bg-blue-700 text-white">
                      {selectedQuizId === quiz.id ? 'Hide Questions' : 'Manage Questions'}
                    </Button>
                  </div>
                ))}
                <Button onClick={handleAddQuiz} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus size={18} className="mr-2" /> Add Quiz
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── USERS TAB ─────────────────────────────────────────────── */}
          <TabsContent value="users" className="space-y-8">
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Manage Users</h2>
                <Button
                  onClick={fetchUsers}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Refresh
                </Button>
              </div>
              {usersLoading && (
                <p className="text-gray-400">Loading users...</p>
              )}
              {usersError && (
                <p className="text-red-400">Error: {usersError}</p>
              )}
              {!usersLoading && !usersError && (
                <div className="space-y-3">
                  {users.map(u => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-white/10"
                    >
                      <div>
                        <p className="text-white font-medium">{u.username || '(no username)'}</p>
                        <p className="text-gray-400 text-sm">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold px-2 py-1 rounded ${u.role === 'admin' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-gray-400'}`}>
                          {u.role}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleToggleRole(u.id, u.role)}
                          className={u.role === 'admin' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
                        >
                          {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No users found.</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useHomepageHero, useHomepageFeatureCards, useHomepageFeaturedTopics, useAboutContent, useMaterialsGalleryImages, useMaterialsVideos, useMaterialsPdfs, useTopics, useQuizzes } from '@/hooks/use-cms-data';
import {
  useSubtopics,
  useLesson,
  useQuizQuestions,
} from '@/hooks/use-cms-data';
import { isValidConfig } from '@/supabase';
import { uploadImage } from '@/services/cms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUp, ArrowDown, Plus, Trash2, Upload, Check, X } from 'lucide-react';
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

  // Local state for hero section (to avoid auto-save)
  const [heroLocal, setHeroLocal] = useState(homepageHero.hero);
  const [heroModified, setHeroModified] = useState(false);

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
    setHeroLocal(prev => prev ? { ...prev, [field]: value } : null);
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
    const newTopic: FeaturedTopic = { id: newId(), title: 'New Topic', description: 'New description', image_url: '' };
    setFeaturedTopicsLocal([...featuredTopicsLocal, newTopic]);
    setFeaturedTopicsModified(true);
  };

  const deleteFeaturedTopicLocal = (id: string) => {
    setFeaturedTopicsLocal(featuredTopicsLocal.filter(t => t.id !== id));
    setFeaturedTopicsModified(true);
  };

  // ── About ───────────────────────────────────────────────────────────────────
  const updateAboutLocal = (field: keyof AboutContent, value: any) => {
    setAboutLocal(prev => ({ ...prev, [field]: value }));
    setAboutModified(true);
  };

  const updateTeamMemberLocal = (category: keyof AboutContent['team'], id: string, field: keyof TeamMember, value: string) => {
    setAboutLocal(prev => ({
      ...prev,
      team: {
        ...prev.team,
        [category]: prev.team[category].map(m => m.id === id ? { ...m, [field]: value } : m)
      }
    }));
    setAboutModified(true);
  };

  const addTeamMemberLocal = (category: keyof AboutContent['team']) => {
    const newMember: TeamMember = { id: newId(), name: 'New Member', work: 'Role', image_url: '' };
    setAboutLocal(prev => ({
      ...prev,
      team: {
        ...prev.team,
        [category]: [...prev.team[category], newMember]
      }
    }));
    setAboutModified(true);
  };

  const deleteTeamMemberLocal = (category: keyof AboutContent['team'], id: string) => {
    setAboutLocal(prev => ({
      ...prev,
      team: {
        ...prev.team,
        [category]: prev.team[category].filter(m => m.id !== id)
      }
    }));
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

  // ── Materials ───────────────────────────────────────────────────────────────
  const updateGalleryImageLocal = (id: string, field: keyof GalleryImage, value: string) => {
    setGalleryImagesLocal(prev => prev.map(img => img.id === id ? { ...img, [field]: value } : img));
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
    setGalleryImagesLocal([...galleryImagesLocal, { id: newId(), url: '', title: 'New Image' }]);
    setGalleryImagesModified(true);
  };

  const deleteGalleryImageLocal = (id: string) => {
    setGalleryImagesLocal(galleryImagesLocal.filter(img => img.id !== id));
    setGalleryImagesModified(true);
  };

  const updateVideoLocal = (id: string, field: keyof VideoItem, value: string) => {
    setVideosLocal(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
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
    setVideosLocal([...videosLocal, { id: newId(), url: '', thumbnail: '', title: 'New Video' }]);
    setVideosModified(true);
  };

  const deleteVideoLocal = (id: string) => {
    setVideosLocal(videosLocal.filter(v => v.id !== id));
    setVideosModified(true);
  };

  const updatePdfLocal = (id: string, field: keyof PdfItem, value: string) => {
    setPdfsLocal(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
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
    setPdfsLocal([...pdfsLocal, { id: newId(), url: '', title: 'New PDF', label: 'Download' }]);
    setPdfsModified(true);
  };

  const deletePdfLocal = (id: string) => {
    setPdfsLocal(pdfsLocal.filter(p => p.id !== id));
    setPdfsModified(true);
  };

  // ── Topics ──────────────────────────────────────────────────────────────────
  const handleAddTopic = async () => {
    const newTopic: Omit<Topic, "id" | "created_at" | "updated_at"> = {
      title: 'New Topic',
      emoji: '🚀',
      description: 'Topic description',
      image_url: '',
      order_index: topics.length
    };
    await addTopic(newTopic);
  };

  const handleUpdateTopic = async (id: string, field: keyof Topic, value: any) => {
    await editTopic(id, { [field]: value });
  };

  const handleDeleteTopic = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this topic and all its subtopics?')) {
      await removeTopic(id);
      if (selectedTopicId === id) setSelectedTopicId(null);
    }
  };

  const moveTopic = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= topics.length) return;
    
    const updatedTopics = [...topics];
    const temp = updatedTopics[index].order_index;
    updatedTopics[index].order_index = updatedTopics[newIndex].order_index;
    updatedTopics[newIndex].order_index = temp;
    
    await editTopic(updatedTopics[index].id, { order_index: updatedTopics[index].order_index });
    await editTopic(updatedTopics[newIndex].id, { order_index: updatedTopics[newIndex].order_index });
    fetchTopics();
  };

  // ── Subtopics ───────────────────────────────────────────────────────────────
  const handleAddSubtopic = async () => {
    if (!selectedTopicId) return;
    const newSub: Omit<Subtopic, "id" | "created_at" | "updated_at"> = {
      topic_id: selectedTopicId,
      title: 'New Subtopic',
      emoji: '📖',
      description: 'Subtopic description',
      order_index: subtopics.length
    };
    await addSubtopic(newSub);
  };

  const handleUpdateSubtopic = async (id: string, field: keyof Subtopic, value: any) => {
    await editSubtopic(id, { [field]: value });
  };

  const handleDeleteSubtopic = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this subtopic?')) {
      await removeSubtopic(id);
      if (selectedSubtopicId === id) setSelectedSubtopicId(null);
    }
  };

  const moveSubtopic = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= subtopics.length) return;
    
    const updated = [...subtopics];
    const temp = updated[index].order_index;
    updated[index].order_index = updated[newIndex].order_index;
    updated[newIndex].order_index = temp;
    
    await editSubtopic(updated[index].id, { order_index: updated[index].order_index });
    await editSubtopic(updated[newIndex].id, { order_index: updated[newIndex].order_index });
    fetchSubtopics();
  };

  // ── Lessons ─────────────────────────────────────────────────────────────────
  const currentLessonBlocks = lesson?.content_blocks || [];

  const addLessonBlock = async (type: 'text' | 'image') => {
    if (!selectedSubtopicId) return;
    const newBlocks = [...currentLessonBlocks, { type, content: type === 'text' ? 'New text block' : '' }];
    const lessonData: Omit<Lesson, "id" | "created_at" | "updated_at"> & { subtopic_id: string } = {
      subtopic_id: selectedSubtopicId,
      title: lesson?.title || 'Lesson Title',
      content_blocks: newBlocks
    };
    await saveLesson(lessonData);
  };

  const updateLessonBlock = async (index: number, content: string) => {
    if (!selectedSubtopicId) return;
    const newBlocks = [...currentLessonBlocks];
    newBlocks[index] = { ...newBlocks[index], content };
    const lessonData: Omit<Lesson, "id" | "created_at" | "updated_at"> & { subtopic_id: string } = {
      subtopic_id: selectedSubtopicId,
      title: lesson?.title || 'Lesson Title',
      content_blocks: newBlocks
    };
    await saveLesson(lessonData);
  };

  const removeLessonBlock = async (index: number) => {
    if (!selectedSubtopicId) return;
    const newBlocks = currentLessonBlocks.filter((_, i) => i !== index);
    const lessonData: Omit<Lesson, "id" | "created_at" | "updated_at"> & { subtopic_id: string } = {
      subtopic_id: selectedSubtopicId,
      title: lesson?.title || 'Lesson Title',
      content_blocks: newBlocks
    };
    await saveLesson(lessonData);
  };

  const moveLessonBlock = async (index: number, direction: 'up' | 'down') => {
    if (!selectedSubtopicId) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentLessonBlocks.length) return;
    const newBlocks = [...currentLessonBlocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    const lessonData: Omit<Lesson, "id" | "created_at" | "updated_at"> & { subtopic_id: string } = {
      subtopic_id: selectedSubtopicId,
      title: lesson?.title || 'Lesson Title',
      content_blocks: newBlocks
    };
    await saveLesson(lessonData);
  };

  // ── Quizzes ─────────────────────────────────────────────────────────────────
  const handleAddQuiz = async () => {
    const newQuiz: Omit<Quiz, "id" | "created_at" | "updated_at"> = { title: 'New Quiz', description: 'Quiz description' };
    await addQuiz(newQuiz);
  };

  const handleUpdateQuiz = async (id: string, field: keyof Quiz, value: any) => {
    await editQuiz(id, { [field]: value });
  };

  const handleDeleteQuiz = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this quiz?')) {
      await removeQuiz(id);
      if (selectedQuizId === id) setSelectedQuizId(null);
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedQuizId) return;
    const newQ: Omit<QuizQuestion, "id" | "created_at" | "updated_at"> = {
      quiz_id: selectedQuizId,
      question_text: 'New Question',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correct_answer: 0,
      order_index: quizQuestions.length
    };
    await addQuizQuestion(newQ);
  };

  const handleUpdateQuestion = async (id: string, field: keyof QuizQuestion, value: any) => {
    await editQuizQuestion(id, { [field]: value });
  };

  const handleDeleteQuestion = async (id: string) => {
    await removeQuizQuestion(id);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 bg-[#0a0e1a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <div className="text-sm text-gray-400">
            Logged in as: <span className="text-orange-400 font-semibold">{user.email}</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900 border border-white/10 p-1">
            <TabsTrigger value="homepage" className="data-[state=active]:bg-orange-500">Homepage</TabsTrigger>
            <TabsTrigger value="topics" className="data-[state=active]:bg-orange-500">Topics</TabsTrigger>
            <TabsTrigger value="subtopics" className="data-[state=active]:bg-orange-500">Subtopics</TabsTrigger>
            <TabsTrigger value="lessons" className="data-[state=active]:bg-orange-500">Lessons</TabsTrigger>
            <TabsTrigger value="about" className="data-[state=active]:bg-orange-500">About</TabsTrigger>
            <TabsTrigger value="materials" className="data-[state=active]:bg-orange-500">Materials</TabsTrigger>
            <TabsTrigger value="quizzes" className="data-[state=active]:bg-orange-500">Quizzes</TabsTrigger>
          </TabsList>

          {/* Homepage Tab */}
          <TabsContent value="homepage" className="space-y-8">
            {/* Hero Section */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Hero Section</h2>
                <div className="flex gap-2">
                  {heroModified && (
                    <>
                      <Button variant="outline" size="sm" onClick={resetHero}>Reset</Button>
                      <Button size="sm" onClick={saveHero} className="bg-orange-500 hover:bg-orange-600">Save Changes</Button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Hero Title</label>
                    <Input
                      value={heroLocal?.heroTitle || ''}
                      onChange={(e) => updateHeroLocal('heroTitle', e.target.value)}
                      className="bg-slate-800 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Hero Subtitle</label>
                    <Textarea
                      value={heroLocal?.heroSubtitle || ''}
                      onChange={(e) => updateHeroLocal('heroSubtitle', e.target.value)}
                      className="bg-slate-800 border-white/10 text-white h-24"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Video URL (YouTube/Direct)</label>
                    <Input
                      value={heroLocal?.videoUrl || ''}
                      onChange={(e) => updateHeroLocal('videoUrl', e.target.value)}
                      placeholder="https://..."
                      className="bg-slate-800 border-white/10 text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="videoVisible"
                      checked={heroLocal?.videoVisible || false}
                      onChange={(e) => updateHeroLocal('videoVisible', e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-slate-800 text-orange-500"
                    />
                    <label htmlFor="videoVisible" className="text-sm text-gray-400">Show Video on Homepage</label>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Feature Cards</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addFeatureCardLocal}><Plus size={16} className="mr-2" /> Add Card</Button>
                  {featureCardsModified && (
                    <>
                      <Button variant="outline" size="sm" onClick={resetFeatureCards}>Reset</Button>
                      <Button size="sm" onClick={saveFeatureCards} className="bg-orange-500 hover:bg-orange-600">Save Changes</Button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featureCardsLocal.map((card, i) => (
                  <div key={i} className="bg-slate-800/50 border border-white/10 rounded-lg p-4 relative group">
                    <button
                      onClick={() => deleteFeatureCardLocal(i)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                    <div className="space-y-3">
                      <Input
                        value={card.icon}
                        onChange={(e) => updateFeatureCardLocal(i, 'icon', e.target.value)}
                        className="bg-slate-900 border-white/10 text-2xl w-16 text-center"
                      />
                      <Input
                        value={card.title}
                        onChange={(e) => updateFeatureCardLocal(i, 'title', e.target.value)}
                        className="bg-slate-900 border-white/10 text-white font-semibold"
                      />
                      <Textarea
                        value={card.description}
                        onChange={(e) => updateFeatureCardLocal(i, 'description', e.target.value)}
                        className="bg-slate-900 border-white/10 text-gray-400 text-sm h-20"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured Topics */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Featured Topics</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addFeaturedTopicLocal}><Plus size={16} className="mr-2" /> Add Topic</Button>
                  {featuredTopicsModified && (
                    <>
                      <Button variant="outline" size="sm" onClick={resetFeaturedTopics}>Reset</Button>
                      <Button size="sm" onClick={saveFeaturedTopics} className="bg-orange-500 hover:bg-orange-600">Save Changes</Button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {featuredTopicsLocal.map((topic, i) => (
                  <div key={topic.id} className="bg-slate-800/50 border border-white/10 rounded-lg p-4 relative group">
                    <button
                      onClick={() => deleteFeaturedTopicLocal(topic.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <ImageUpload
                          currentImage={topic.image_url}
                          onImageUploaded={(url) => updateFeaturedTopicLocal(i, 'image_url', url)}
                          label="Topic Image"
                        />
                      </div>
                      <div className="space-y-3">
                        <Input
                          value={topic.title}
                          onChange={(e) => updateFeaturedTopicLocal(i, 'title', e.target.value)}
                          placeholder="Topic Title"
                          className="bg-slate-900 border-white/10 text-white font-semibold"
                        />
                        <Textarea
                          value={topic.description}
                          onChange={(e) => updateFeaturedTopicLocal(i, 'description', e.target.value)}
                          placeholder="Topic Description"
                          className="bg-slate-900 border-white/10 text-gray-400 text-sm h-24"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Topics Tab */}
          <TabsContent value="topics" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Manage Topics</h2>
              <Button onClick={handleAddTopic} className="bg-orange-500 hover:bg-orange-600">
                <Plus size={16} className="mr-2" /> Add New Topic
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {topics.map((topic, index) => (
                <div
                  key={topic.id}
                  className={`bg-slate-900/50 border rounded-xl p-4 transition-colors ${selectedTopicId === topic.id ? 'border-orange-500' : 'border-white/10'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="sm" onClick={() => moveTopic(index, 'up')} disabled={index === 0}><ArrowUp size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => moveTopic(index, 'down')} disabled={index === topics.length - 1}><ArrowDown size={14} /></Button>
                    </div>
                    <Input
                      value={topic.emoji}
                      onChange={(e) => handleUpdateTopic(topic.id, 'emoji', e.target.value)}
                      className="w-16 text-center bg-slate-800 border-white/10"
                    />
                    <div className="flex-1">
                      <Input
                        value={topic.title}
                        onChange={(e) => handleUpdateTopic(topic.id, 'title', e.target.value)}
                        className="bg-slate-800 border-white/10 text-white font-semibold mb-2"
                      />
                      <Textarea
                        value={topic.description}
                        onChange={(e) => handleUpdateTopic(topic.id, 'description', e.target.value)}
                        className="bg-slate-800 border-white/10 text-gray-400 text-sm h-16"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant={selectedTopicId === topic.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTopicId(topic.id)}
                        className={selectedTopicId === topic.id ? 'bg-orange-500' : ''}
                      >
                        Manage Subtopics
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteTopic(topic.id)}><Trash2 size={16} /></Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <ImageUpload
                      currentImage={topic.image_url}
                      onImageUploaded={(url) => handleUpdateTopic(topic.id, 'image_url', url)}
                      label="Topic Hero Image"
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Subtopics Tab */}
          <TabsContent value="subtopics" className="space-y-6">
            {!selectedTopicId ? (
              <div className="text-center py-12 bg-slate-900/50 border border-white/10 rounded-xl text-gray-400">
                Please select a topic first from the Topics tab.
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Subtopics for {topics.find(t => t.id === selectedTopicId)?.title}</h2>
                    <p className="text-sm text-gray-400">Manage the learning modules for this topic.</p>
                  </div>
                  <Button onClick={handleAddSubtopic} className="bg-orange-500 hover:bg-orange-600">
                    <Plus size={16} className="mr-2" /> Add Subtopic
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {subtopics.map((sub, index) => (
                    <div
                      key={sub.id}
                      className={`bg-slate-900/50 border rounded-xl p-4 transition-colors ${selectedSubtopicId === sub.id ? 'border-orange-500' : 'border-white/10'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                          <Button variant="ghost" size="sm" onClick={() => moveSubtopic(index, 'up')} disabled={index === 0}><ArrowUp size={14} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => moveSubtopic(index, 'down')} disabled={index === subtopics.length - 1}><ArrowDown size={14} /></Button>
                        </div>
                        <Input
                          value={sub.emoji}
                          onChange={(e) => handleUpdateSubtopic(sub.id, 'emoji', e.target.value)}
                          className="w-16 text-center bg-slate-800 border-white/10"
                        />
                        <div className="flex-1">
                          <Input
                            value={sub.title}
                            onChange={(e) => handleUpdateSubtopic(sub.id, 'title', e.target.value)}
                            className="bg-slate-800 border-white/10 text-white font-semibold mb-2"
                          />
                          <Textarea
                            value={sub.description}
                            onChange={(e) => handleUpdateSubtopic(sub.id, 'description', e.target.value)}
                            className="bg-slate-800 border-white/10 text-gray-400 text-sm h-16"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant={selectedSubtopicId === sub.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedSubtopicId(sub.id)}
                            className={selectedSubtopicId === sub.id ? 'bg-orange-500' : ''}
                          >
                            Edit Lesson
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteSubtopic(sub.id)}><Trash2 size={16} /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* Lessons Tab */}
          <TabsContent value="lessons" className="space-y-6">
            {!selectedSubtopicId ? (
              <div className="text-center py-12 bg-slate-900/50 border border-white/10 rounded-xl text-gray-400">
                Please select a subtopic first from the Subtopics tab.
              </div>
            ) : (
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Lesson Content</h2>
                    <p className="text-sm text-gray-400">Editing: {subtopics.find(s => s.id === selectedSubtopicId)?.title}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => addLessonBlock('text')}><Plus size={16} className="mr-2" /> Add Text</Button>
                    <Button variant="outline" size="sm" onClick={() => addLessonBlock('image')}><Plus size={16} className="mr-2" /> Add Image</Button>
                  </div>
                </div>

                <div className="space-y-6">
                  {currentLessonBlocks.map((block, index) => (
                    <div key={index} className="bg-slate-800/50 border border-white/10 rounded-lg p-4 relative group">
                      <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => moveLessonBlock(index, 'up')} disabled={index === 0}><ArrowUp size={14} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => moveLessonBlock(index, 'down')} disabled={index === currentLessonBlocks.length - 1}><ArrowDown size={14} /></Button>
                      </div>
                      <button
                        onClick={() => removeLessonBlock(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>

                      {block.type === 'text' ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider">
                            <Check size={12} /> Text Block
                          </div>
                          <Textarea
                            value={block.content}
                            onChange={(e) => updateLessonBlock(index, e.target.value)}
                            className="bg-slate-900 border-white/10 text-white min-h-[150px]"
                            placeholder="Enter lesson content (Markdown supported)..."
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider">
                            <Upload size={12} /> Image Block
                          </div>
                          <ImageUpload
                            currentImage={block.content}
                            onImageUploaded={(url) => updateLessonBlock(index, url)}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {currentLessonBlocks.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl text-gray-500">
                      No content blocks yet. Add your first block above.
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-8">
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">About Page Content</h2>
                <div className="flex gap-2">
                  {aboutModified && (
                    <>
                      <Button variant="outline" size="sm" onClick={resetAbout}>Reset</Button>
                      <Button size="sm" onClick={saveAbout} className="bg-orange-500 hover:bg-orange-600">Save Changes</Button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                {/* Mission Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-800/30 rounded-lg">
                  <div className="space-y-4">
                    <h3 className="text-orange-400 font-medium">Mission Section</h3>
                    <Textarea
                      value={aboutLocal.missionText}
                      onChange={(e) => updateAboutLocal('missionText', e.target.value)}
                      placeholder="Mission statement..."
                      className="bg-slate-900 border-white/10 text-white h-32"
                    />
                  </div>
                  <ImageUpload
                    currentImage={aboutLocal.missionImage}
                    onImageUploaded={(url) => updateAboutLocal('missionImage', url)}
                    label="Mission Image"
                  />
                </div>

                {/* Who We Are Section 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-800/30 rounded-lg">
                  <div className="space-y-4">
                    <h3 className="text-orange-400 font-medium">Who We Are (Part 1)</h3>
                    <Textarea
                      value={aboutLocal.whoWeAreText1}
                      onChange={(e) => updateAboutLocal('whoWeAreText1', e.target.value)}
                      placeholder="Description..."
                      className="bg-slate-900 border-white/10 text-white h-32"
                    />
                  </div>
                  <ImageUpload
                    currentImage={aboutLocal.whoWeAreImage1}
                    onImageUploaded={(url) => updateAboutLocal('whoWeAreImage1', url)}
                    label="Section 1 Image"
                  />
                </div>

                {/* Who We Are Section 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-800/30 rounded-lg">
                  <div className="space-y-4">
                    <h3 className="text-orange-400 font-medium">Who We Are (Part 2)</h3>
                    <Textarea
                      value={aboutLocal.whoWeAreText2}
                      onChange={(e) => updateAboutLocal('whoWeAreText2', e.target.value)}
                      placeholder="Description..."
                      className="bg-slate-900 border-white/10 text-white h-32"
                    />
                  </div>
                  <ImageUpload
                    currentImage={aboutLocal.whoWeAreImage2}
                    onImageUploaded={(url) => updateAboutLocal('whoWeAreImage2', url)}
                    label="Section 2 Image"
                  />
                </div>

                {/* Team Sections */}
                {(['platformCreators', 'educationalAdvisors', 'communityMembers'] as const).map((category) => (
                  <div key={category} className="space-y-4 p-4 bg-slate-800/30 rounded-lg">
                    <div className="flex justify-between items-center">
                      <h3 className="text-orange-400 font-medium capitalize">{category.replace(/([A-Z])/g, ' $1')}</h3>
                      <Button variant="outline" size="sm" onClick={() => addTeamMemberLocal(category)}><Plus size={14} className="mr-1" /> Add Member</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {aboutLocal.team[category].map((member) => (
                        <div key={member.id} className="bg-slate-900/50 border border-white/10 rounded-lg p-3 relative group">
                          <button
                            onClick={() => deleteTeamMemberLocal(category, member.id)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                          <div className="space-y-3">
                            <ImageUpload
                              currentImage={member.image_url}
                              onImageUploaded={(url) => updateTeamMemberLocal(category, member.id, 'image_url', url)}
                            />
                            <Input
                              value={member.name}
                              onChange={(e) => updateTeamMemberLocal(category, member.id, 'name', e.target.value)}
                              placeholder="Name"
                              className="bg-slate-800 border-white/10 text-sm"
                            />
                            <Input
                              value={member.work}
                              onChange={(e) => updateTeamMemberLocal(category, member.id, 'work', e.target.value)}
                              placeholder="Role/Work"
                              className="bg-slate-800 border-white/10 text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials" className="space-y-8">
            {/* Gallery Section */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Gallery Images</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addGalleryImageLocal}><Plus size={16} className="mr-2" /> Add Image</Button>
                  {galleryImagesModified && (
                    <>
                      <Button variant="outline" size="sm" onClick={resetGalleryImages}>Reset</Button>
                      <Button size="sm" onClick={saveGalleryImages} className="bg-orange-500 hover:bg-orange-600">Save Changes</Button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {galleryImagesLocal.map((img) => (
                  <div key={img.id} className="bg-slate-800/50 border border-white/10 rounded-lg p-3 relative group">
                    <button
                      onClick={() => deleteGalleryImageLocal(img.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                    <div className="space-y-3">
                      <ImageUpload
                        currentImage={img.url}
                        onImageUploaded={(url) => updateGalleryImageLocal(img.id, 'url', url)}
                      />
                      <Input
                        value={img.title}
                        onChange={(e) => updateGalleryImageLocal(img.id, 'title', e.target.value)}
                        placeholder="Image Title"
                        className="bg-slate-900 border-white/10 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Videos Section */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Educational Videos</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addVideoLocal}><Plus size={16} className="mr-2" /> Add Video</Button>
                  {videosModified && (
                    <>
                      <Button variant="outline" size="sm" onClick={resetVideos}>Reset</Button>
                      <Button size="sm" onClick={saveVideos} className="bg-orange-500 hover:bg-orange-600">Save Changes</Button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {videosLocal.map((video) => (
                  <div key={video.id} className="bg-slate-800/50 border border-white/10 rounded-lg p-4 relative group">
                    <button
                      onClick={() => deleteVideoLocal(video.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ImageUpload
                        currentImage={video.thumbnail}
                        onImageUploaded={(url) => updateVideoLocal(video.id, 'thumbnail', url)}
                        label="Thumbnail"
                      />
                      <div className="space-y-3">
                        <Input
                          value={video.title}
                          onChange={(e) => updateVideoLocal(video.id, 'title', e.target.value)}
                          placeholder="Video Title"
                          className="bg-slate-900 border-white/10"
                        />
                        <Input
                          value={video.url}
                          onChange={(e) => updateVideoLocal(video.id, 'url', e.target.value)}
                          placeholder="Video URL (YouTube/Direct)"
                          className="bg-slate-900 border-white/10 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PDFs Section */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">PDF Resources</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addPdfLocal}><Plus size={16} className="mr-2" /> Add PDF</Button>
                  {pdfsModified && (
                    <>
                      <Button variant="outline" size="sm" onClick={resetPdfs}>Reset</Button>
                      <Button size="sm" onClick={savePdfs} className="bg-orange-500 hover:bg-orange-600">Save Changes</Button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pdfsLocal.map((pdf) => (
                  <div key={pdf.id} className="bg-slate-800/50 border border-white/10 rounded-lg p-4 relative group">
                    <button
                      onClick={() => deletePdfLocal(pdf.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                    <div className="space-y-3">
                      <Input
                        value={pdf.title}
                        onChange={(e) => updatePdfLocal(pdf.id, 'title', e.target.value)}
                        placeholder="PDF Title"
                        className="bg-slate-900 border-white/10 font-medium"
                      />
                      <Input
                        value={pdf.label}
                        onChange={(e) => updatePdfLocal(pdf.id, 'label', e.target.value)}
                        placeholder="Button Label (e.g. Download)"
                        className="bg-slate-900 border-white/10 text-sm"
                      />
                      <Input
                        value={pdf.url}
                        onChange={(e) => updatePdfLocal(pdf.id, 'url', e.target.value)}
                        placeholder="PDF URL"
                        className="bg-slate-900 border-white/10 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Manage Quizzes</h2>
              <Button onClick={handleAddQuiz} className="bg-orange-500 hover:bg-orange-600">
                <Plus size={16} className="mr-2" /> Add New Quiz
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className={`bg-slate-900/50 border rounded-xl p-4 transition-colors ${selectedQuizId === quiz.id ? 'border-orange-500' : 'border-white/10'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Input
                        value={quiz.title}
                        onChange={(e) => handleUpdateQuiz(quiz.id, 'title', e.target.value)}
                        className="bg-slate-800 border-white/10 text-white font-semibold mb-2"
                      />
                      <Textarea
                        value={quiz.description || ''}
                        onChange={(e) => handleUpdateQuiz(quiz.id, 'description', e.target.value)}
                        className="bg-slate-800 border-white/10 text-gray-400 text-sm h-16"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant={selectedQuizId === quiz.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedQuizId(quiz.id)}
                        className={selectedQuizId === quiz.id ? 'bg-orange-500' : ''}
                      >
                        Manage Questions
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteQuiz(quiz.id)}><Trash2 size={16} /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedQuizId && (
              <div className="mt-12 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-white">Questions for {quizzes.find(q => q.id === selectedQuizId)?.title}</h3>
                  <Button onClick={handleAddQuestion} variant="outline" size="sm">
                    <Plus size={16} className="mr-2" /> Add Question
                  </Button>
                </div>
                <div className="space-y-6">
                  {quizQuestions.map((q, qIdx) => (
                    <div key={q.id} className="bg-slate-800/30 border border-white/10 rounded-xl p-6 relative group">
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-gray-500 uppercase mb-1">Question {qIdx + 1}</label>
                          <Input
                            value={q.question_text}
                            onChange={(e) => handleUpdateQuestion(q.id, 'question_text', e.target.value)}
                            className="bg-slate-900 border-white/10 text-white"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${q.id}`}
                                checked={q.correct_answer === optIdx}
                                onChange={() => handleUpdateQuestion(q.id, 'correct_answer', optIdx)}
                                className="w-4 h-4 text-orange-500 bg-slate-900 border-white/10"
                              />
                              <Input
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...q.options];
                                  newOpts[optIdx] = e.target.value;
                                  handleUpdateQuestion(q.id, 'options', newOpts);
                                }}
                                className={`bg-slate-900 border-white/10 text-sm ${q.correct_answer === optIdx ? 'border-green-500/50' : ''}`}
                              />
                            </div>
                          ))}
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 uppercase mb-1">Explanation (Optional)</label>
                          <Textarea
                            value={q.explanation || ''}
                            onChange={(e) => handleUpdateQuestion(q.id, 'explanation', e.target.value)}
                            className="bg-slate-900 border-white/10 text-sm h-20"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

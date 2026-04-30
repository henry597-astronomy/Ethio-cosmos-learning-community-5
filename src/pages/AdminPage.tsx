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
import { ArrowUp, ArrowDown, Plus, Trash2, Upload, FileText, Image as ImageIcon } from 'lucide-react';
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
} from '@/types';

const DEFAULT_ABOUT: AboutContent = {
  missionText: '',
  whoWeAreText1: '',
  whoWeAreText2: '',
  missionImage: '',
  whoWeAreImage1: '',
  whoWeAreImage2: '',
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
  label: string;
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
          <Input
            value={currentImage}
            onChange={(e) => onImageUploaded(e.target.value)}
            className="bg-slate-800 border-white/20 text-white mb-2"
            placeholder="Or paste image URL here"
          />
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

  const allLoading = topicsLoading || subtopicsLoading || lessonLoading || quizzesLoading || quizQuestionsLoading || homepageHero.loading || homepageFeatureCards.loading || homepageFeaturedTopics.loading || aboutContent.loading || materialsGalleryImages.loading || materialsVideos.loading || materialsPdfs.loading;
  const anyError = topicsError || subtopicsError || lessonError || quizzesError || quizQuestionsError || homepageHero.error || homepageFeatureCards.error || homepageFeaturedTopics.error || aboutContent.error || materialsGalleryImages.error || materialsVideos.error || materialsPdfs.error;

  if (allLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#0a0e1a] text-white">
        Loading admin data...
      </div>
    );
  }

  if (anyError) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#0a0e1a] text-red-400">
        Error loading admin data: {anyError}
      </div>
    );
  }

  // ── Homepage ────────────────────────────────────────────────────────────────
  const updateFeatureCard = async (i: number, field: keyof FeatureCard, value: string) => {
    const updatedCards = [...homepageFeatureCards.featureCards];
    updatedCards[i] = { ...updatedCards[i], [field]: value };
    await homepageFeatureCards.saveFeatureCards(updatedCards);
  };

  const updateFeaturedTopic = async (i: number, field: keyof FeaturedTopic, value: string) => {
    const updatedTopics = [...homepageFeaturedTopics.featuredTopics];
    updatedTopics[i] = { ...updatedTopics[i], [field]: value };
    await homepageFeaturedTopics.saveFeaturedTopics(updatedTopics);
  };

  const addFeaturedTopic = async () => {
    const newTopic: FeaturedTopic = { id: newId(), title: 'New Topic', description: 'Description', image_url: '/images/topic-fundamentals.jpg' };
    await homepageFeaturedTopics.saveFeaturedTopics([...homepageFeaturedTopics.featuredTopics, newTopic]);
  };

  const deleteFeaturedTopic = async (i: number) => {
    const updatedTopics = homepageFeaturedTopics.featuredTopics.filter((_, idx) => idx !== i);
    await homepageFeaturedTopics.saveFeaturedTopics(updatedTopics);
  };

  // ── Topics ──────────────────────────────────────────────────────────────────
  const handleUpdateTopic = async (id: string, field: keyof Topic, value: string | number) => {
    await editTopic(id, { [field]: value });
  };

  const handleAddTopic = async () => {
    const newTopic: Omit<Topic, "id" | "created_at" | "updated_at"> = { 
      emoji: '🚀', 
      title: 'New Topic', 
      description: 'Description', 
      order_index: topics.length, 
      image_url: '/images/topic-fundamentals.jpg' 
    };
    await addTopic(newTopic);
  };

  const handleDeleteTopic = async (id: string) => {
    await removeTopic(id);
  };

  const moveTopic = async (i: number, dir: 'up' | 'down') => {
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
  };

  // ── Subtopics ───────────────────────────────────────────────────────────────
  const handleUpdateSubtopic = async (id: string, field: keyof Subtopic, value: string) => {
    await editSubtopic(id, { [field]: value });
  };

  const handleAddSubtopic = async () => {
    if (!selectedTopicId) return;
    const newSubtopic: Omit<Subtopic, "id" | "created_at" | "updated_at"> = { 
      topic_id: selectedTopicId, 
      emoji: '📚', 
      title: 'New Lesson', 
      description: 'Lesson description', 
      order_index: subtopics.length 
    };
    await addSubtopic(newSubtopic);
  };

  const handleDeleteSubtopic = async (id: string) => {
    await removeSubtopic(id);
  };

  const moveSubtopic = async (i: number, dir: 'up' | 'down') => {
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
  };

  // ── Lessons ─────────────────────────────────────────────────────────────────
  const currentLessonBlocks = lesson?.content_blocks || [];

  const handleSaveLessonBlocks = async (blocks: LessonBlock[]) => {
    if (!selectedSubtopicId) return;
    const currentSubtopic = subtopics.find(s => s.id === selectedSubtopicId);
    if (!currentSubtopic) return;

    await saveLesson({
      subtopic_id: selectedSubtopicId,
      title: currentSubtopic.title, // Lesson title from subtopic
      content_blocks: blocks,
    });
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
  const handleUpdateAboutContent = async (field: keyof AboutContent, value: string) => {
    const base = aboutContent.aboutContent ?? DEFAULT_ABOUT;
    const updatedContent: AboutContent = { ...base, [field]: value };
    await aboutContent.saveAboutContent(updatedContent);
  };

  // ── Materials ───────────────────────────────────────────────────────────────
  const handleAddGalleryImage = async () => {
    const newImage: GalleryImage = { id: newId(), url: '', title: 'New Image' };
    await materialsGalleryImages.saveGalleryImages([...materialsGalleryImages.galleryImages, newImage]);
  };

  const handleUpdateGalleryImage = async (id: string, field: keyof GalleryImage, value: string) => {
    const updatedImages = materialsGalleryImages.galleryImages.map(img => 
      img.id === id ? { ...img, [field]: value } : img
    );
    await materialsGalleryImages.saveGalleryImages(updatedImages);
  };

  const handleDeleteGalleryImage = async (id: string) => {
    const updatedImages = materialsGalleryImages.galleryImages.filter(img => img.id !== id);
    await materialsGalleryImages.saveGalleryImages(updatedImages);
  };

  const handleAddVideo = async () => {
    const newVideo: VideoItem = { id: newId(), url: '', thumbnail: '', title: 'New Video' };
    await materialsVideos.saveVideos([...materialsVideos.videos, newVideo]);
  };

  const handleUpdateVideo = async (id: string, field: keyof VideoItem, value: string) => {
    const updatedVideos = materialsVideos.videos.map(video => 
      video.id === id ? { ...video, [field]: value } : video
    );
    await materialsVideos.saveVideos(updatedVideos);
  };

  const handleDeleteVideo = async (id: string) => {
    const updatedVideos = materialsVideos.videos.filter(video => video.id !== id);
    await materialsVideos.saveVideos(updatedVideos);
  };

  const handleAddPdf = async () => {
    const newPdf: PdfItem = { id: newId(), url: '', title: 'New PDF', label: 'New PDF' };
    await materialsPdfs.savePdfs([...materialsPdfs.pdfs, newPdf]);
  };

  const handleUpdatePdf = async (id: string, field: keyof PdfItem, value: string) => {
    const updatedPdfs = materialsPdfs.pdfs.map(pdf => 
      pdf.id === id ? { ...pdf, [field]: value } : pdf
    );
    await materialsPdfs.savePdfs(updatedPdfs);
  };

  const handleDeletePdf = async (id: string) => {
    const updatedPdfs = materialsPdfs.pdfs.filter(pdf => pdf.id !== id);
    await materialsPdfs.savePdfs(updatedPdfs);
  };

  // ── Quizzes ─────────────────────────────────────────────────────────────────
  const handleAddQuiz = async () => {
    const newQuiz: Omit<Quiz, "id" | "created_at" | "updated_at"> = { title: 'New Quiz', description: 'Quiz description' };
    await addQuiz(newQuiz);
  };
  // (Quiz / QuizQuestion types are imported above)

  const handleUpdateQuiz = async (id: string, field: keyof Quiz, value: string) => {
    await editQuiz(id, { [field]: value });
  };

  const handleDeleteQuiz = async (id: string) => {
    await removeQuiz(id);
  };

  // ── Quiz Questions ──────────────────────────────────────────────────────────
  const handleAddQuizQuestion = async () => {
    if (!selectedQuizId) return;
    const newQuestion: Omit<QuizQuestion, "id" | "created_at" | "updated_at"> = {
      quiz_id: selectedQuizId,
      question_text: 'New Question',
      options: ['Option 1', 'Option 2'],
      correct_answer: 0,
      order_index: quizQuestions.length,
    };
    await addQuizQuestion(newQuestion);
  };

  const handleUpdateQuizQuestion = async (
    id: string,
    field: keyof QuizQuestion,
    value: QuizQuestion[keyof QuizQuestion]
  ) => {
    await editQuizQuestion(id, { [field]: value });
  };

  const handleDeleteQuizQuestion = async (id: string) => {
    await removeQuizQuestion(id);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 bg-[#0a0e1a]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400 mb-8">Signed in as {user.email}</p>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900 border border-white/10 mb-8 flex flex-wrap gap-1 h-auto p-1">
            {['homepage','topics','subtopics','lessons','about','materials', 'quizzes'].map(tab => (
              <TabsTrigger key={tab} value={tab} className="data-[state=active]:bg-orange-500 data-[state=active]:text-white capitalize">
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── HOMEPAGE TAB ────────────────────────────────────────────── */}
          <TabsContent value="homepage" className="space-y-8">
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Hero Section</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title</label>
                  <Input value={homepageHero.hero?.heroTitle || ''} onChange={(e) => homepageHero.saveHero({ ...homepageHero.hero!, heroTitle: e.target.value })} className="bg-slate-800 border-white/20 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Subtitle</label>
                  <Input value={homepageHero.hero?.heroSubtitle || ''} onChange={(e) => homepageHero.saveHero({ ...homepageHero.hero!, heroSubtitle: e.target.value })} className="bg-slate-800 border-white/20 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Feature Cards</h2>
              <div className="space-y-4">
                {homepageFeatureCards.featureCards.map((card, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="block text-sm text-gray-400">Icon (Emoji)</label>
                      <Input value={card.icon} onChange={(e) => updateFeatureCard(i, 'icon', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <label className="block text-sm text-gray-400">Title</label>
                      <Input value={card.title} onChange={(e) => updateFeatureCard(i, 'title', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <label className="block text-sm text-gray-400">Description</label>
                      <Textarea value={card.description} onChange={(e) => updateFeatureCard(i, 'description', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => {
                      const updatedCards = homepageFeatureCards.featureCards.filter((_, idx) => idx !== i);
                      homepageFeatureCards.saveFeatureCards(updatedCards);
                    }}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
                <Button onClick={() => homepageFeatureCards.saveFeatureCards([...homepageFeatureCards.featureCards, { icon: '✨', title: 'New Card', description: 'New description' }])} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus size={18} className="mr-2" /> Add Feature Card
                </Button>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Featured Topics</h2>
              <div className="space-y-4">
                {homepageFeaturedTopics.featuredTopics.map((topic, i) => (
                  <div key={topic.id} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="block text-sm text-gray-400">Title</label>
                      <Input value={topic.title} onChange={(e) => updateFeaturedTopic(i, 'title', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <label className="block text-sm text-gray-400">Description</label>
                      <Textarea value={topic.description} onChange={(e) => updateFeaturedTopic(i, 'description', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <ImageUpload 
                        currentImage={topic.image_url}
                        onImageUploaded={(url) => updateFeaturedTopic(i, 'image_url', url)}
                        label="Image URL"
                      />
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => deleteFeaturedTopic(i)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
                <Button onClick={addFeaturedTopic} className="bg-orange-500 hover:bg-orange-600 text-white">
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

          {/* ── LESSONS TAB ──────────────────────────────────────────────── */}
          <TabsContent value="lessons" className="space-y-8">
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Manage Lessons</h2>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Select Topic</label>
                <select 
                  value={selectedTopicId || ''}
                  onChange={(e) => {
                    setSelectedTopicId(e.target.value || null);
                    setSelectedSubtopicId(null); // Reset subtopic when topic changes
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
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-1">Select Subtopic (Lesson)</label>
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

              {selectedSubtopicId && (
                <div className="space-y-4 mt-4">
                  <h3 className="text-lg font-bold text-white">Lesson Content</h3>
                  {currentLessonBlocks.map((block, i) => (
                    <div key={i} className="flex items-end gap-2 p-3 bg-slate-800 rounded-lg border border-white/10">
                      <div className="flex flex-col gap-1">
                        <Button variant="ghost" size="icon" onClick={() => moveLessonBlock(i, 'up')} disabled={i === 0}><ArrowUp size={16} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => moveLessonBlock(i, 'down')} disabled={i === currentLessonBlocks.length - 1}><ArrowDown size={16} /></Button>
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="block text-sm text-gray-400">Block Type: {block.type}</label>
                        {block.type === 'text' ? (
                          <Textarea value={block.content} onChange={(e) => updateLessonBlock(i, e.target.value)} className="bg-slate-700 border-white/20 text-white" />
                        ) : (
                          <ImageUpload 
                            currentImage={block.content}
                            onImageUploaded={(url) => updateLessonBlock(i, url)}
                            label="Image URL"
                          />
                        )}
                      </div>
                      <Button variant="destructive" size="icon" onClick={() => removeLessonBlock(i)}>
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button onClick={() => addLessonBlock('text')} className="bg-blue-500 hover:bg-blue-600 text-white">
                      <FileText size={18} className="mr-2" /> Add Text Block
                    </Button>
                    <Button onClick={() => addLessonBlock('image')} className="bg-purple-500 hover:bg-purple-600 text-white">
                      <ImageIcon size={18} className="mr-2" /> Add Image Block
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── ABOUT TAB ───────────────────────────────────────────────── */}
          <TabsContent value="about" className="space-y-8">
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">About Page Content</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Mission Text</label>
                  <Textarea value={aboutContent.aboutContent?.missionText || ''} onChange={(e) => handleUpdateAboutContent('missionText', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Who We Are Text 1</label>
                  <Textarea value={aboutContent.aboutContent?.whoWeAreText1 || ''} onChange={(e) => handleUpdateAboutContent('whoWeAreText1', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Who We Are Text 2</label>
                  <Textarea value={aboutContent.aboutContent?.whoWeAreText2 || ''} onChange={(e) => handleUpdateAboutContent('whoWeAreText2', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                </div>
                <ImageUpload 
                  currentImage={aboutContent.aboutContent?.missionImage || ''}
                  onImageUploaded={(url) => handleUpdateAboutContent('missionImage', url)}
                  label="Mission Image URL"
                />
                <ImageUpload 
                  currentImage={aboutContent.aboutContent?.whoWeAreImage1 || ''}
                  onImageUploaded={(url) => handleUpdateAboutContent('whoWeAreImage1', url)}
                  label="Who We Are Image 1 URL"
                />
                <ImageUpload 
                  currentImage={aboutContent.aboutContent?.whoWeAreImage2 || ''}
                  onImageUploaded={(url) => handleUpdateAboutContent('whoWeAreImage2', url)}
                  label="Who We Are Image 2 URL"
                />
              </div>
            </div>
          </TabsContent>

          {/* ── MATERIALS TAB ───────────────────────────────────────────── */}
          <TabsContent value="materials" className="space-y-8">
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Gallery Images</h2>
              <div className="space-y-4">
                {materialsGalleryImages.galleryImages.map((img) => (
                  <div key={img.id} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="block text-sm text-gray-400">Title</label>
                      <Input value={img.title} onChange={(e) => handleUpdateGalleryImage(img.id, 'title', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <ImageUpload 
                        currentImage={img.url}
                        onImageUploaded={(url) => handleUpdateGalleryImage(img.id, 'url', url)}
                        label="Image URL"
                      />
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteGalleryImage(img.id)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
                <Button onClick={handleAddGalleryImage} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus size={18} className="mr-2" /> Add Gallery Image
                </Button>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Videos</h2>
              <div className="space-y-4">
                {materialsVideos.videos.map((video) => (
                  <div key={video.id} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="block text-sm text-gray-400">Title</label>
                      <Input value={video.title} onChange={(e) => handleUpdateVideo(video.id, 'title', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <label className="block text-sm text-gray-400">Video URL</label>
                      <Input value={video.url} onChange={(e) => handleUpdateVideo(video.id, 'url', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <ImageUpload 
                        currentImage={video.thumbnail}
                        onImageUploaded={(url) => handleUpdateVideo(video.id, 'thumbnail', url)}
                        label="Thumbnail URL"
                      />
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteVideo(video.id)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
                <Button onClick={handleAddVideo} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus size={18} className="mr-2" /> Add Video
                </Button>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">PDFs</h2>
              <div className="space-y-4">
                {materialsPdfs.pdfs.map((pdf) => (
                  <div key={pdf.id} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="block text-sm text-gray-400">Title</label>
                      <Input value={pdf.title} onChange={(e) => handleUpdatePdf(pdf.id, 'title', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <label className="block text-sm text-gray-400">Label</label>
                      <Input value={pdf.label} onChange={(e) => handleUpdatePdf(pdf.id, 'label', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                      <label className="block text-sm text-gray-400">PDF URL</label>
                      <Input value={pdf.url} onChange={(e) => handleUpdatePdf(pdf.id, 'url', e.target.value)} className="bg-slate-800 border-white/20 text-white" />
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => handleDeletePdf(pdf.id)}>
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
                <Button onClick={handleAddPdf} className="bg-orange-500 hover:bg-orange-600 text-white">
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
                  <div key={quiz.id} className="flex items-end gap-2 p-3 bg-slate-800 rounded-lg border border-white/10">
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
                ))}
                <Button onClick={handleAddQuiz} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus size={18} className="mr-2" /> Add Quiz
                </Button>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Manage Quiz Questions</h2>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Select Quiz</label>
                <select 
                  value={selectedQuizId || ''}
                  onChange={(e) => setSelectedQuizId(e.target.value || null)}
                  className="w-full p-2 rounded-lg bg-slate-800 border border-white/20 text-white"
                >
                  <option value="">-- Select a Quiz --</option>
                  {quizzes.map(quiz => (
                    <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
                  ))}
                </select>
              </div>

              {selectedQuizId && (
                <div className="space-y-4 mt-4">
                  {quizQuestions.map((question, i) => (
                    <div key={question.id} className="flex items-end gap-2 p-3 bg-slate-800 rounded-lg border border-white/10">
                      <div className="flex flex-col gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleUpdateQuizQuestion(question.id, 'order_index', i - 1)} disabled={i === 0}><ArrowUp size={16} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleUpdateQuizQuestion(question.id, 'order_index', i + 1)} disabled={i === quizQuestions.length - 1}><ArrowDown size={16} /></Button>
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="block text-sm text-gray-400">Question Text</label>
                        <Textarea value={question.question_text} onChange={(e) => handleUpdateQuizQuestion(question.id, 'question_text', e.target.value)} className="bg-slate-700 border-white/20 text-white" />
                        <label className="block text-sm text-gray-400">Options (comma-separated)</label>
                        <Input value={question.options.join(', ')} onChange={(e) => handleUpdateQuizQuestion(question.id, 'options', e.target.value.split(',').map(opt => opt.trim()))} className="bg-slate-700 border-white/20 text-white" />
                        <label className="block text-sm text-gray-400">Correct Answer Index</label>
                        <Input type="number" value={question.correct_answer} onChange={(e) => handleUpdateQuizQuestion(question.id, 'correct_answer', parseInt(e.target.value))} className="bg-slate-700 border-white/20 text-white" />
                        <label className="block text-sm text-gray-400">Explanation</label>
                        <Textarea value={question.explanation || ''} onChange={(e) => handleUpdateQuizQuestion(question.id, 'explanation', e.target.value)} className="bg-slate-700 border-white/20 text-white" />
                      </div>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteQuizQuestion(question.id)}>
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  ))}
                  <Button onClick={handleAddQuizQuestion} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus size={18} className="mr-2" /> Add Quiz Question
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

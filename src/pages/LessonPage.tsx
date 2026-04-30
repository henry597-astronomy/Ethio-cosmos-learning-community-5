import { useParams, Link } from 'react-router-dom';
import { useTopics } from '@/hooks/use-cms-data';
import { useSubtopics, useLesson } from '@/hooks/use-cms-data';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/supabase';
import { ArrowLeft, ArrowRight, BookmarkPlus, BookmarkCheck, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SafeImage } from '@/components/SafeImage';
import { useState, useEffect } from 'react';
import {
  isBookmarked as checkIsBookmarked,
  isLessonCompleted as checkIsLessonCompleted,
  markLessonCompleted,
} from '@/services/cms';

export default function LessonPage() {
  const { topicId, subtopicId } = useParams<{ topicId: string; subtopicId: string }>();
  const topicsHook = useTopics();
  const { user } = useAuth();

  const { topics, loading: topicsLoading, error: topicsError } = topicsHook;
  // Parameterized hooks are called directly so they stay valid React hooks.
  const { subtopics, loading: subtopicsLoading, error: subtopicsError } =
    useSubtopics(topicId ?? null);
  const { lesson, loading: lessonLoading, error: lessonError } =
    useLesson(subtopicId ?? null);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topic = topics.find(t => t.id === topicId);
  const currentSubtopic = subtopics.find(s => s.id === subtopicId);
  const currentIndex = subtopics.findIndex(s => s.id === subtopicId);
  
  const prevLesson = currentIndex > 0 ? subtopics[currentIndex - 1] : null;
  const nextLesson = currentIndex < subtopics.length - 1 ? subtopics[currentIndex + 1] : null;
  const progress = subtopics.length > 0 ? ((currentIndex + 1) / subtopics.length) * 100 : 0;

  // Check bookmark and progress status on mount
  useEffect(() => {
    if (!user || !currentSubtopic || !topicId || !subtopicId) return;

    const checkStatus = async () => {
      try {
        const bookmarked = await checkIsBookmarked(user.id, `/learning/${topicId}/${subtopicId}`);
        setIsBookmarked(bookmarked);

        const completed = await checkIsLessonCompleted(user.id, subtopicId);
        setIsCompleted(completed);
      } catch (err) {
        console.error('Unexpected error checking status:', err);
      }
    };
    checkStatus();
  }, [user, currentSubtopic, topicId, subtopicId]);

  const handleBookmark = async () => {
    if (!user) {
      setError('Please log in to bookmark lessons.');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      if (isBookmarked) {
        const { error: deleteError } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('url', `/learning/${topicId}/${subtopicId}`);

        if (deleteError) throw deleteError;
        setIsBookmarked(false);
      } else {
        const { error: insertError } = await supabase.from('bookmarks').insert({
          user_id: user.id,
          title: currentSubtopic?.title || 'Untitled Lesson',
          url: `/learning/${topicId}/${subtopicId}`,
          type: 'lesson',
        });

        if (insertError) throw insertError;
        setIsBookmarked(true);
      }
    } catch (err) {
      console.error('Error updating bookmark:', err);
      setError('Failed to update bookmark. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!user || isCompleted || !subtopicId) return;

    setActionLoading(true);
    setError(null);

    try {
      await markLessonCompleted(user.id, subtopicId);
      setIsCompleted(true);
    } catch (err) {
      console.error('Error marking lesson complete:', err);
      setError('Failed to mark lesson complete. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (topicsLoading || subtopicsLoading || lessonLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#0a0e1a] text-white">
        Loading lesson...
      </div>
    );
  }

  if (topicsError || subtopicsError || lessonError) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#0a0e1a] text-red-400">
        Error loading lesson: {topicsError || subtopicsError || lessonError}
      </div>
    );
  }

  if (!topic || !currentSubtopic) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Lesson Not Found</h1>
          <Link to={`/learning/${topicId}`}>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <ArrowLeft size={18} className="mr-2" />
              Back to Topic
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Default lesson content if none exists in DB
  const defaultBlocks = [
    { type: 'text' as const, content: `${currentSubtopic.title} is an important topic in astronomy. In this lesson, we will explore the key concepts and understand why it matters in our study of the cosmos.` },
    { type: 'text' as const, content: currentSubtopic.description },
    { type: 'text' as const, content: 'As you continue your journey through astronomy, remember that each discovery builds upon previous knowledge. Take time to observe the night sky and apply what you learn.' }
  ];

  const blocks = lesson?.content_blocks || defaultBlocks;

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/learning" className="hover:text-white">Learning</Link>
          <span>/</span>
          <Link to={`/learning/${topicId}`} className="hover:text-white">{topic.title}</Link>
          <span>/</span>
          <span className="text-orange-500">{currentSubtopic.title}</span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Lesson Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{currentSubtopic.emoji}</span>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">{currentSubtopic.title}</h1>
          </div>
          
          {/* Progress */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm text-gray-400">
              Lesson {currentIndex + 1} of {subtopics.length}
            </span>
            <div className="flex-1 max-w-xs">
              <Progress value={progress} className="h-2 bg-slate-700" />
            </div>
          </div>

          {/* Action Buttons */}
          {user && (
            <div className="flex gap-2">
              <Button
                onClick={handleBookmark}
                disabled={actionLoading}
                variant="outline"
                className={`border-white/20 text-white hover:bg-white/10 ${
                  isBookmarked ? 'bg-orange-500/20 border-orange-500/50' : ''
                }`}
              >
                {isBookmarked ? (
                  <>
                    <BookmarkCheck size={18} className="mr-2" />
                    Bookmarked
                  </>
                ) : (
                  <>
                    <BookmarkPlus size={18} className="mr-2" />
                    Bookmark
                  </>
                )}
              </Button>
              {!isCompleted && (
                <Button
                  onClick={handleMarkCompleted}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle size={18} className="mr-2" />
                  Mark Complete
                </Button>
              )}
              {isCompleted && (
                <Button
                  disabled
                  className="bg-green-600/50 text-white"
                >
                  <CheckCircle size={18} className="mr-2" />
                  Completed
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Lesson Content */}
        <div className="space-y-8 mb-12">
          {blocks.map((block, index) => (
            <div key={index}>
              {block.type === 'text' ? (
                <p className="text-gray-300 leading-relaxed text-lg">{block.content}</p>
              ) : (
                <div className="my-8">
                  <SafeImage
                    src={block.content}
                    alt="Lesson illustration"
                    className="w-full rounded-lg"
                    fallbackText="Lesson image not available"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-8 border-t border-white/10">
          {prevLesson ? (
            <Link to={`/learning/${topicId}/${prevLesson.id}`}>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <ArrowLeft size={18} className="mr-2" />
                Previous Lesson
              </Button>
            </Link>
          ) : (
            <div />
          )}
          
          {nextLesson ? (
            <Link to={`/learning/${topicId}/${nextLesson.id}`}>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                Next Lesson
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
          ) : (
            <Link to={`/learning/${topicId}`}>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                Complete Topic
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

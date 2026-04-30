import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, BookOpen, Target, Star, Loader } from 'lucide-react';

interface TopicProgress {
  topicId: string;
  topicName: string;
  completedLessons: number;
  totalLessons: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

interface TopicRow {
  id: string;
  title: string;
}

interface SubtopicRow {
  id: string;
  topic_id: string;
}

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth();

  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchProgress = async () => {
      try {
        setLoading(true);
        setError(null);

        // Pull topics, subtopics, and the user's progress in parallel.
        const [topicsRes, subtopicsRes, progressRes] = await Promise.all([
          supabase.from('topics').select('id, title').order('order_index'),
          supabase.from('subtopics').select('id, topic_id'),
          supabase.from('user_progress').select('subtopic_id').eq('user_id', user.id),
        ]);

        if (topicsRes.error) throw topicsRes.error;
        if (subtopicsRes.error) throw subtopicsRes.error;
        if (progressRes.error) throw progressRes.error;

        const topics = (topicsRes.data ?? []) as TopicRow[];
        const subtopics = (subtopicsRes.data ?? []) as SubtopicRow[];
        const completedSet = new Set(
          (progressRes.data ?? []).map((row) => row.subtopic_id as string)
        );

        let total = 0;
        const progressByTopic: TopicProgress[] = topics.map((t) => {
          const subs = subtopics.filter((s) => s.topic_id === t.id);
          total += subs.length;
          const done = subs.filter((s) => completedSet.has(s.id)).length;
          return {
            topicId: t.id,
            topicName: t.title,
            completedLessons: done,
            totalLessons: subs.length,
          };
        });

        const completed = progressByTopic.reduce(
          (sum, tp) => sum + tp.completedLessons,
          0
        );

        setTopicProgress(progressByTopic);
        setTotalCompleted(completed);
        setTotalLessons(total);
      } catch (err) {
        console.error('Error fetching progress:', err);
        setError('Failed to load progress. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();

    const channel = supabase
      .channel('progress-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchProgress();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Loader size={48} className="text-orange-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const overallProgress = totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0;

  const achievements: Achievement[] = [
    { id: '1', title: 'First Steps', description: 'Complete your first lesson', icon: '🌟', unlocked: totalCompleted >= 1 },
    { id: '2', title: 'Rising Star', description: 'Complete 5 lessons', icon: '⭐', unlocked: totalCompleted >= 5 },
    { id: '3', title: 'Space Explorer', description: 'Complete 10 lessons', icon: '🚀', unlocked: totalCompleted >= 10 },
    { id: '4', title: 'Cosmic Scholar', description: 'Complete 25 lessons', icon: '🎓', unlocked: totalCompleted >= 25 },
    { id: '5', title: 'Astronomy Master', description: 'Complete 50 lessons', icon: '🏆', unlocked: totalCompleted >= 50 },
    {
      id: '6',
      title: 'Universal Expert',
      description: 'Complete all lessons',
      icon: '🌌',
      unlocked: totalLessons > 0 && totalCompleted >= totalLessons,
    },
  ];

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="min-h-screen pt-24 pb-12 bg-[#0a0e1a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Your Progress</h1>
          <p className="text-gray-400">Track your journey through the cosmos</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Overall Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-900/50 border-white/10">
            <CardContent className="p-6 text-center">
              <BookOpen className="text-orange-500 mx-auto mb-2" size={32} />
              <div className="text-3xl font-bold text-white">{totalCompleted}</div>
              <div className="text-gray-400">Lessons Completed</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-white/10">
            <CardContent className="p-6 text-center">
              <Target className="text-blue-500 mx-auto mb-2" size={32} />
              <div className="text-3xl font-bold text-white">{Math.round(overallProgress)}%</div>
              <div className="text-gray-400">Overall Progress</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-white/10">
            <CardContent className="p-6 text-center">
              <Trophy className="text-yellow-500 mx-auto mb-2" size={32} />
              <div className="text-3xl font-bold text-white">
                {unlockedCount}/{achievements.length}
              </div>
              <div className="text-gray-400">Achievements</div>
            </CardContent>
          </Card>
        </div>

        {/* Per-topic progress */}
        <Card className="bg-slate-900/50 border-white/10 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Progress by Topic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topicProgress.length === 0 ? (
              <p className="text-gray-400 text-sm">No topics yet.</p>
            ) : (
              topicProgress.map((tp) => {
                const pct =
                  tp.totalLessons > 0 ? (tp.completedLessons / tp.totalLessons) * 100 : 0;
                return (
                  <div key={tp.topicId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white">{tp.topicName}</span>
                      <span className="text-sm text-gray-400">
                        {tp.completedLessons}/{tp.totalLessons}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2 bg-slate-700" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Star size={18} className="text-yellow-400" /> Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            {achievements.map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  a.unlocked
                    ? 'border-yellow-500/40 bg-yellow-500/5'
                    : 'border-white/10 bg-slate-800/50 opacity-60'
                }`}
              >
                <div className="text-2xl">{a.icon}</div>
                <div>
                  <p className="text-white text-sm font-medium">{a.title}</p>
                  <p className="text-gray-400 text-xs">{a.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

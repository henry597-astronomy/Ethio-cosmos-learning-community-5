import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity,
  BookOpen,
  Check,
  ChevronRight,
  CircleCheck,
  Flame,
  LockKeyhole,
  Rocket,
  Sparkles,
  Star,
  Target,
  Telescope,
  Trophy,
  Zap,
  Loader,
} from 'lucide-react';
import { useAppLanguage } from '@/context/AppLanguageContext';
import { usePremium } from '@/context/usePremium';
import { PremiumRequiredScreen } from '@/components/PremiumRequiredMessage';
import LocalizedOfficialText from '@/components/LocalizedOfficialText';

interface TopicProgress {
  topicId: string;
  topicName: string;
  completedLessons: number;
  totalLessons: number;
}

interface Achievement {
  id: string;
  title: string;
  threshold: number;
  icon: typeof Star;
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

type ProgressSnapshot = {
  topicProgress: TopicProgress[];
  totalCompleted: number;
  totalLessons: number;
};

const progressMemoryCache = new Map<string, ProgressSnapshot>();

function ProgressPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useAppLanguage();
  const navigate = useNavigate();

  const initialProgress = user ? progressMemoryCache.get(user.id) : undefined;
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>(() => initialProgress?.topicProgress ?? []);
  const [totalCompleted, setTotalCompleted] = useState(() => initialProgress?.totalCompleted ?? 0);
  const [totalLessons, setTotalLessons] = useState(() => initialProgress?.totalLessons ?? 0);
  const [loading, setLoading] = useState(() => !initialProgress);
  const [hasLoaded, setHasLoaded] = useState(() => Boolean(initialProgress));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchProgress = async () => {
      try {
        setLoading(true);
        setError(null);

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
          (progressRes.data ?? []).map((row) => row.subtopic_id as string),
        );

        let total = 0;
        const progressByTopic: TopicProgress[] = topics.map((topic) => {
          const subs = subtopics.filter((subtopic) => subtopic.topic_id === topic.id);
          total += subs.length;
          const done = subs.filter((subtopic) => completedSet.has(subtopic.id)).length;
          return {
            topicId: topic.id,
            topicName: topic.title,
            completedLessons: done,
            totalLessons: subs.length,
          };
        });

        const completed = progressByTopic.reduce(
          (sum, topic) => sum + topic.completedLessons,
          0,
        );

        setTopicProgress(progressByTopic);
        setTotalCompleted(completed);
        setTotalLessons(total);
        progressMemoryCache.set(user.id, {
          topicProgress: progressByTopic,
          totalCompleted: completed,
          totalLessons: total,
        });
      } catch (err) {
        console.error('Error fetching progress:', err);
        setError(t('progressLoadError'));
      } finally {
        setLoading(false);
        setHasLoaded(true);
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
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [t, user]);

  const overallProgress = totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0;
  const focusTopic = useMemo(
    () => topicProgress.find((topic) => topic.completedLessons < topic.totalLessons) ?? topicProgress[0],
    [topicProgress],
  );
  const exploredTopics = topicProgress.filter((topic) => topic.completedLessons > 0).length;
  const unlockedCount = [1, 5, 10, 25, 50, totalLessons].filter(
    (threshold, index, values) =>
      (index === values.length - 1 && totalLessons > 0 && totalCompleted >= totalLessons) ||
      (index < values.length - 1 && totalCompleted >= threshold),
  ).length;

  const achievements: Achievement[] = [
    { id: '1', title: t('firstSteps'), threshold: 1, icon: Sparkles, unlocked: totalCompleted >= 1 },
    { id: '2', title: t('risingStar'), threshold: 5, icon: Star, unlocked: totalCompleted >= 5 },
    { id: '3', title: t('spaceExplorer'), threshold: 10, icon: Rocket, unlocked: totalCompleted >= 10 },
    { id: '4', title: t('cosmicScholar'), threshold: 25, icon: Telescope, unlocked: totalCompleted >= 25 },
    { id: '5', title: t('astronomyMaster'), threshold: 50, icon: Trophy, unlocked: totalCompleted >= 50 },
    { id: '6', title: t('universalExpert'), threshold: totalLessons, icon: Zap, unlocked: totalLessons > 0 && totalCompleted >= totalLessons },
  ];

  if (authLoading || (!hasLoaded && loading)) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#070b16]">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-14 w-14">
            <div className="absolute inset-0 rounded-full border border-orange-400/30 animate-ping" />
            <Loader size={44} className="relative text-orange-400 animate-spin" />
          </div>
          <p className="text-gray-400">{t('loadingProgress')}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const lessonsRemaining = Math.max(totalLessons - totalCompleted, 0);
  const weeklyLessonGoal = Math.min(totalCompleted, 3);
  const topicGoal = Math.min(exploredTopics, 3);
  return (
    <div
      className="min-h-screen overflow-hidden bg-[#070b16] pt-24 text-white"
      style={{ paddingBottom: 'calc(3rem + max(0px, env(safe-area-inset-bottom)))' }}
    >
      {loading && hasLoaded && (
        <div className="fixed right-4 top-[4.75rem] z-20 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/80 px-2.5 py-1 text-[10px] font-medium text-slate-400 shadow-lg backdrop-blur-sm">
          <Loader size={11} className="animate-spin text-orange-300" />
          {t('updating')}
        </div>
      )}
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute left-[-12%] top-24 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute right-[-12%] top-[38%] h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-[35%] h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-3 sm:px-5 lg:px-8">
        <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-300/80">
              <Telescope size={15} />
              {t('missionControl')}
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t('yourProgress')}</h1>
            <p className="mt-1 text-sm text-slate-400 sm:text-base">{t('trackJourney')}</p>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-2 text-xs text-orange-100">
            <Activity size={15} className="text-orange-300" />
            {t('journeyStatus')}
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <section className="relative mb-5 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-[#101a32] to-[#111827] p-5 shadow-2xl shadow-blue-950/20 sm:p-7">
          <div className="absolute right-[-4rem] top-[-4rem] h-48 w-48 rounded-full border border-orange-300/10" />
          <div className="absolute right-[-1rem] top-[-1rem] h-24 w-24 rounded-full border border-orange-300/10" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
                <Flame size={14} className="text-orange-400" />
                {t('missionReady')}
              </div>
              <h2 className="max-w-xl text-2xl font-bold leading-tight sm:text-3xl">
                {focusTopic ? (
                  <>
                    {t('focusTopic')}:{' '}
                    <span className="text-orange-300">
                      <LocalizedOfficialText sourceType="topic" sourceId={focusTopic.topicId} field="title" sourceText={focusTopic.topicName} />
                    </span>
                  </>
                ) : t('noTopicsYet')}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
                {lessonsRemaining > 0
                  ? `${lessonsRemaining} ${t('lessonsToGo')}`
                  : t('universalExpert')}
              </p>
              <button
                type="button"
                onClick={() => navigate('/learning')}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                {t('continueMission')}
                <ChevronRight size={17} />
              </button>
            </div>
            <div className="relative mx-auto flex h-36 w-36 items-center justify-center sm:h-44 sm:w-44">
              <div className="absolute inset-0 rounded-full border border-orange-300/25" />
              <div className="absolute inset-3 rounded-full border border-blue-300/20 border-dashed" />
              <div className="absolute inset-7 rounded-full bg-orange-400/10 blur-xl" />
              <div className="relative flex h-24 w-24 flex-col items-center justify-center rounded-full border border-orange-300/40 bg-slate-950/80 shadow-xl sm:h-28 sm:w-28">
                <span className="text-3xl font-black text-orange-300">{Math.round(overallProgress)}%</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">{t('mastery')}</span>
              </div>
              <Sparkles size={16} className="absolute right-2 top-8 text-blue-300" />
              <Star size={14} className="absolute bottom-7 left-3 text-orange-200" />
            </div>
          </div>
        </section>

        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: BookOpen, value: totalCompleted, label: t('lessonsCompleted'), color: 'text-orange-300', glow: 'from-orange-500/20' },
            { icon: Target, value: `${Math.round(overallProgress)}%`, label: t('overallProgress'), color: 'text-blue-300', glow: 'from-blue-500/20' },
            { icon: Trophy, value: `${unlockedCount}/${achievements.length}`, label: t('achievements'), color: 'text-yellow-300', glow: 'from-yellow-500/20' },
            { icon: Flame, value: exploredTopics, label: t('topics'), color: 'text-purple-300', glow: 'from-purple-500/20' },
          ].map(({ icon: Icon, value, label, color, glow }) => (
            <Card key={label} className={`overflow-hidden rounded-2xl border-white/10 bg-gradient-to-br ${glow} to-slate-900/80`}>
              <CardContent className="relative p-4 sm:p-5">
                <Icon size={19} className={`${color} mb-3`} />
                <div className="text-2xl font-black tracking-tight text-white sm:text-3xl">{value}</div>
                <div className="mt-1 text-[11px] leading-4 text-slate-400 sm:text-xs">{label}</div>
              </CardContent>
            </Card>
          ))}
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-3xl border-white/10 bg-slate-900/70 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg text-white">{t('weeklyMission')}</CardTitle>
                <p className="mt-1 text-xs text-slate-500">{t('journeyStatus')}</p>
              </div>
              <div className="rounded-xl bg-orange-400/10 p-2 text-orange-300"><Zap size={18} /></div>
            </CardHeader>
            <CardContent className="space-y-5 pb-6">
              {[
                { label: t('lessonsCompleted'), value: weeklyLessonGoal, total: 3, color: 'bg-orange-400', icon: BookOpen },
                { label: t('topics'), value: topicGoal, total: 3, color: 'bg-blue-400', icon: Telescope },
                { label: t('overallProgress'), value: Math.round(overallProgress), total: 100, color: 'bg-purple-400', icon: Target },
              ].map(({ label, value, total, color, icon: Icon }) => (
                <div key={label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-2 text-slate-300"><Icon size={14} className="text-slate-400" />{label}</span>
                    <span className="font-semibold text-white">{value}/{total}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.min((value / total) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-white/10 bg-slate-900/70 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Sparkles size={18} className="text-blue-300" />
                {t('skillConstellation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              {topicProgress.length === 0 ? (
                <p className="text-sm text-slate-400">{t('noTopicsYet')}</p>
              ) : (
                <div className="relative grid grid-cols-2 gap-3 overflow-hidden rounded-2xl border border-white/5 bg-[#0b1222] p-4">
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[130%] -rotate-12 bg-blue-300/10" />
                  {topicProgress.slice(0, 6).map((topic) => {
                    const pct = topic.totalLessons > 0 ? Math.round((topic.completedLessons / topic.totalLessons) * 100) : 0;
                    return (
                      <button
                        key={topic.topicId}
                        type="button"
                        onClick={() => document.getElementById('topic-progress')?.scrollIntoView({ behavior: 'smooth' })}
                        className="group relative z-10 rounded-xl p-2 text-left transition hover:bg-white/5"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className={`relative flex h-7 w-7 items-center justify-center rounded-full border ${pct > 0 ? 'border-orange-300/60 bg-orange-300/15' : 'border-slate-600 bg-slate-800'}`}>
                            {pct > 0 ? <Star size={13} className="text-orange-300" /> : <LockKeyhole size={12} className="text-slate-500" />}
                          </span>
                          <span className="truncate text-[11px] font-semibold text-slate-300 group-hover:text-white">
                            <LocalizedOfficialText sourceType="topic" sourceId={topic.topicId} field="title" sourceText={topic.topicName} />
                          </span>
                        </div>
                        <div className="pl-9 text-[10px] text-slate-500">{pct}% {t('mastery')}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card id="topic-progress" className="mt-5 rounded-3xl border-white/10 bg-slate-900/70 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg text-white">{t('progressByTopic')}</CardTitle>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">{topicProgress.length} {t('topics')}</span>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            {topicProgress.length === 0 ? (
              <p className="text-sm text-slate-400">{t('noTopicsYet')}</p>
            ) : topicProgress.map((topic, index) => {
              const pct = topic.totalLessons > 0 ? (topic.completedLessons / topic.totalLessons) * 100 : 0;
              const colors = ['bg-orange-400', 'bg-blue-400', 'bg-purple-400', 'bg-emerald-400'];
              return (
                <div key={topic.topicId} className="rounded-2xl border border-white/5 bg-white/[0.025] p-3 sm:p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium text-white">
                      <LocalizedOfficialText sourceType="topic" sourceId={topic.topicId} field="title" sourceText={topic.topicName} />
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-slate-400">{topic.completedLessons}/{topic.totalLessons}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full rounded-full ${colors[index % colors.length]} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-3xl border-white/10 bg-slate-900/70 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-white"><Activity size={18} className="text-emerald-300" />{t('recentActivity')}</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              {totalCompleted === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-center">
                  <Rocket size={24} className="mx-auto mb-2 text-slate-500" />
                  <p className="text-sm text-slate-400">{t('noRecentActivity')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-full bg-emerald-400/15 p-2 text-emerald-300"><CircleCheck size={15} /></span>
                    <div><p className="text-sm font-medium text-white">{t('lessonsCompleted')}</p><p className="text-xs text-slate-500">{totalCompleted} {t('completed')}</p></div>
                  </div>
                  {focusTopic && (
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 rounded-full bg-orange-400/15 p-2 text-orange-300"><Target size={15} /></span>
                      <div><p className="text-sm font-medium text-white">{t('focusTopic')}</p><p className="truncate text-xs text-slate-500"><LocalizedOfficialText sourceType="topic" sourceId={focusTopic.topicId} field="title" sourceText={focusTopic.topicName} /></p></div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-yellow-300/10 bg-gradient-to-br from-yellow-500/[0.08] via-slate-900/80 to-slate-900/70 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-white"><Trophy size={18} className="text-yellow-300" />{t('achievements')}</CardTitle>
              <span className="text-xs text-yellow-200/70">{unlockedCount}/{achievements.length}</span>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 pb-6 sm:grid-cols-3">
              {achievements.map((achievement) => {
                const Icon = achievement.icon;
                return (
                  <div key={achievement.id} className={`rounded-2xl border p-3 ${achievement.unlocked ? 'border-yellow-300/25 bg-yellow-300/[0.08]' : 'border-white/5 bg-white/[0.02] opacity-55'}`}>
                    <div className="mb-3 flex items-center justify-between"><Icon size={20} className={achievement.unlocked ? 'text-yellow-300' : 'text-slate-500'} />{achievement.unlocked ? <Check size={14} className="text-emerald-300" /> : <LockKeyhole size={13} className="text-slate-600" />}</div>
                    <p className="line-clamp-2 text-xs font-semibold text-white">{achievement.title}</p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-500">{achievement.threshold > 0 ? `${achievement.threshold} ${t('lessonsCompleted')}` : t('overallProgress')}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProgressPage() {
  const { t } = useAppLanguage();
  const { hasInitialized, canUse } = usePremium();

  if (!hasInitialized) {
    return <div className="min-h-screen bg-[#070b16] pt-24 text-center text-sm text-white">{t('loadingProgress')}</div>;
  }

  if (!canUse('advanced_learning_analytics')) {
    return <PremiumRequiredScreen featureName={t('yourProgress')} />;
  }

  return <ProgressPageContent />;
}

export default ProgressPage;

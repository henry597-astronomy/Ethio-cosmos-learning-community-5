import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTopics, useSubtopics } from '@/hooks/use-cms-data';
import { useAuth } from '@/context/AuthContext';
import { useAppLanguage } from '@/context/AppLanguageContext';
import { usePremium } from '@/context/usePremium';
import { PremiumRequiredScreen } from '@/components/PremiumRequiredMessage';
import OfflineTopicSaveButton from '@/components/OfflineTopicSaveButton';
import { isTopicOfflineReady } from '@/lib/offline-cache';
import { ArrowRight, ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TopicDetailPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, t } = useAppLanguage();
  const topicsHook = useTopics();
  const { topics, loading: topicsLoading, error: topicsError } = topicsHook;
  const { loading: premiumLoading, canUseTopic } = usePremium();
  const { subtopics, loading: subtopicsLoading, error: subtopicsError } = useSubtopics(topicId ?? null);
  const [offlineTopicReady, setOfflineTopicReady] = useState<boolean | null>(null);

  const topic = topics.find((t) => t.id === topicId);
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  useEffect(() => {
    let active = true;
    if (!user || !topicId) {
      setOfflineTopicReady(false);
      return undefined;
    }
    void isTopicOfflineReady(user.id, language, topicId).then((ready) => {
      if (active) setOfflineTopicReady(ready);
    });
    return () => { active = false; };
  }, [language, topicId, user]);

  if (topicsLoading || subtopicsLoading || premiumLoading || (isOffline && offlineTopicReady === null)) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#0a0e1a] text-white">
        Loading topic details...
      </div>
    );
  }

  if ((topicsError || subtopicsError) && !(isOffline && offlineTopicReady === false)) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#0a0e1a] text-red-400">
        Error loading topic details: {topicsError || subtopicsError}
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Topic Not Found</h1>
          <Link to="/learning">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <ArrowLeft size={18} className="mr-2" />
              Back to Learning
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!canUseTopic(topic.id)) {
    return <PremiumRequiredScreen featureName={topic.title} onBack={() => navigate('/learning')} />;
  }

  if (isOffline && !offlineTopicReady) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#0a0e1a] px-4 text-white">
        <div className="max-w-md rounded-xl border border-orange-500/30 bg-slate-900 p-6 text-center">
          <Download className="mx-auto mb-3 text-orange-400" size={28} />
          <h1 className="text-xl font-bold">{t('offlineTopicDownloadHint')}</h1>
          <p className="mt-3 text-sm text-gray-400">{t('offlineMaterialDownloadHint')}</p>
          <Link to="/learning" className="mt-5 inline-flex">
            <Button className="bg-orange-500 text-white hover:bg-orange-600">
              <ArrowLeft size={18} className="mr-2" />
              {t('backToLearning')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      <section
        className="py-16 relative"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(5, 8, 16, 0.7), rgba(10, 14, 26, 0.9)), url(${topic.image_url || '/images/topic-fundamentals.jpg'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/learning" className="inline-flex items-center text-gray-400 hover:text-white mb-6">
            <ArrowLeft size={18} className="mr-2" />
            Back to Topics
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{topic.emoji}</span>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold text-white">{topic.title}</h1>
              </div>
            </div>
            <OfflineTopicSaveButton topicId={topic.id} />
          </div>
          <p className="text-xl text-gray-300 max-w-2xl">{topic.description}</p>
        </div>
      </section>

      <section className="py-16 bg-[#0a0e1a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-8">Lessons</h2>
          {subtopics.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No lessons available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subtopics.map((subtopic, index) => {
                const diff = (subtopic.difficulty || 'beginner').toLowerCase();
                const diffColor = diff === 'advanced'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : diff === 'intermediate'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

                return (
                  <Link
                    key={subtopic.id}
                    to={`/learning/${topic.id}/${subtopic.id}`}
                    className="relative flex items-center gap-4 p-4 pt-6 bg-slate-900/50 border border-white/10 rounded-lg hover:border-orange-500/50 hover:bg-slate-800/50 transition-all group"
                  >
                    <span className={`absolute -top-2.5 left-4 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border ${diffColor}`}>
                      {diff}
                    </span>
                    <span className="text-lg font-mono text-orange-500 w-12">{String(index + 1).padStart(2, '0')}</span>
                    <span className="text-2xl">{subtopic.emoji}</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white group-hover:text-orange-400 transition-colors">{subtopic.title}</h3>
                      <p className="text-sm text-gray-400">{subtopic.description}</p>
                    </div>
                    <ArrowRight size={18} className="text-gray-500 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

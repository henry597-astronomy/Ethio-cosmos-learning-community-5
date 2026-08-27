import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAllSubtopics, useTopics } from '@/hooks/use-cms-data';
import { FallbackImage } from '@/components/MediaFallback';
import { useAppLanguage } from '@/context/AppLanguageContext';
import { usePremium } from '@/context/usePremium';
import { PremiumRequiredScreen } from '@/components/PremiumRequiredMessage';
import LocalizedOfficialText from '@/components/LocalizedOfficialText';

function LearningPageContent() {
  const { t } = useAppLanguage();
  const topicsHook = useTopics();
  const { topics, loading, error } = topicsHook;
  const { subtopics, loading: lessonsLoading } = useAllSubtopics();
  const [searchQuery, setSearchQuery] = useState('');

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return { topics: [], lessons: [] };

    const matchingTopics = topics.filter((topic) =>
      `${topic.title} ${topic.description || ''} ${topic.emoji}`.toLowerCase().includes(normalizedQuery),
    );
    const matchingLessons = subtopics.filter((subtopic) =>
      `${subtopic.title} ${subtopic.description || ''} ${subtopic.difficulty || ''} ${subtopic.emoji}`
        .toLowerCase()
        .includes(normalizedQuery),
    );

    return { topics: matchingTopics, lessons: matchingLessons };
  }, [normalizedQuery, topics, subtopics]);

  const hasSearch = normalizedQuery.length > 0;
  const hasResults = searchResults.topics.length > 0 || searchResults.lessons.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{t('loadingTopics')}</p>
          <p className="text-gray-500 text-sm mt-2">{t('pleaseRefresh')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050810]">
      {/* Fixed search engine: it stays below the top task bar while users scroll. */}
      <div className="fixed left-0 right-0 top-[6.5rem] z-40 border-b border-white/10 bg-[#050810] px-2 py-2 sm:px-4">
        <div className="relative mx-auto max-w-3xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('searchTopics')}
            aria-label={t('searchTopics')}
            className="h-10 w-full rounded-lg border border-white/25 bg-slate-800/90 pl-9 pr-9 text-sm text-white caret-orange-300 outline-none transition-colors placeholder:text-gray-300 focus:border-orange-400/80 focus:ring-1 focus:ring-orange-500/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={t('clearSearch')}
              title={t('clearSearch')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          )}

          {hasSearch && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[60vh] overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-2 shadow-2xl shadow-black/60" style={{ isolation: 'isolate' }}>
              {lessonsLoading && (
                <p className="px-3 py-2 text-xs text-gray-500">{t('loadingLessonResults')}</p>
              )}

              {!lessonsLoading && !hasResults && (
                <p className="px-3 py-4 text-center text-sm text-gray-400">
                  {t('noResults')} “{searchQuery}”.
                </p>
              )}

              {searchResults.topics.length > 0 && (
                <div>
                  <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-orange-400">
                    {t('topics')}
                  </p>
                  {searchResults.topics.map((topic) => (
                    <Link
                      key={`search-topic-${topic.id}`}
                      to={`/learning/${topic.id}`}
                      className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-white/10"
                    >
                      <span className="text-lg">{topic.emoji}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-white">
                        <LocalizedOfficialText sourceType="topic" sourceId={topic.id} field="title" sourceText={topic.title} sourceUpdatedAt={topic.updated_at} />
                      </span>
                      <ArrowRight size={15} className="shrink-0 text-gray-500" />
                    </Link>
                  ))}
                </div>
              )}

              {searchResults.lessons.length > 0 && (
                <div className={searchResults.topics.length > 0 ? 'mt-2 border-t border-white/10 pt-2' : ''}>
                  <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-orange-400">
                    {t('lessons')}
                  </p>
                  {searchResults.lessons.map((lesson) => {
                    const parentTopic = topics.find((topic) => topic.id === lesson.topic_id);
                    const difficulty = (lesson.difficulty || 'beginner').toLowerCase();
                    const difficultyLabel = difficulty === 'advanced'
                      ? t('advanced')
                      : difficulty === 'intermediate'
                      ? t('intermediate')
                      : t('beginner');
                    const difficultyColor = difficulty === 'advanced'
                      ? 'text-purple-300'
                      : difficulty === 'intermediate'
                      ? 'text-amber-300'
                      : 'text-emerald-300';

                    return (
                      <Link
                        key={`search-lesson-${lesson.id}`}
                        to={parentTopic ? `/learning/${parentTopic.id}/${lesson.id}` : '/learning'}
                        className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-white/10"
                      >
                        <BookOpen size={16} className="shrink-0 text-gray-500" />
                        <span className="min-w-0 flex-1">
                                                      <span className="block truncate text-sm text-white">
                              <LocalizedOfficialText sourceType="subtopic" sourceId={lesson.id} field="title" sourceText={lesson.title} sourceUpdatedAt={lesson.updated_at} />
                            </span>

                          <span className="block truncate text-[11px] text-gray-500">
                            {parentTopic ? <LocalizedOfficialText sourceType="topic" sourceId={parentTopic.id} field="title" sourceText={parentTopic.title} sourceUpdatedAt={parentTopic.updated_at} /> : t('lesson')} · <span className={difficultyColor}>{difficultyLabel}</span>
                          </span>
                        </span>
                        <ArrowRight size={15} className="shrink-0 text-gray-500" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Hero Section */}
      <section
        className="relative py-10 sm:py-14 md:py-24"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(10, 14, 26, 0.8), rgba(5, 8, 16, 0.95)), url(/images/learning-hero.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <Badge className="mb-4 border-orange-500/30 bg-orange-500/20 text-orange-500">
            {t('learning')}
          </Badge>
          <h1 className="mb-3 text-3xl font-bold text-white sm:mb-4 sm:text-4xl md:text-5xl">
            {t('exploreCosmos')}
          </h1>
          <p className="mx-auto mb-5 max-w-2xl text-base leading-7 text-gray-300 sm:mb-6 sm:text-lg sm:leading-8 md:text-xl">
            From the basics of stargazing to the mysteries of black holes,
            discover the wonders of astronomy through our structured lessons.
          </p>
          <div className="flex items-center justify-center text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {topics.length} {t('topics')}
            </span>
          </div>
        </div>
      </section>

      {/* Topics Grid */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-6">
          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 py-16 text-center">
              <p className="mb-2 font-semibold text-red-400">{t('couldNotLoadTopics')}</p>
              <p className="mb-4 text-sm text-gray-400">{error}</p>
              <p className="text-xs text-gray-500">{t('pleaseRefresh')}</p>
            </div>
          ) : topics.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-400">{t('noTopics')}</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => {
                const diff = (topic.difficulty || 'beginner').toLowerCase();
                const diffColor = diff === 'advanced'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : diff === 'intermediate'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

                return (
                  <Link
                    key={topic.id}
                    to={`/learning/${topic.id}`}
                    className="group relative overflow-hidden rounded-lg border border-white/10 bg-slate-900 transition-all duration-300 hover:border-orange-500/50"
                  >
                    <div className="absolute top-3 left-3 z-10">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border shadow-md ${diffColor}`}>
                        {diff === 'advanced' ? t('advanced') : diff === 'intermediate' ? t('intermediate') : t('beginner')}
                      </span>
                    </div>
                    <div className="h-40 overflow-hidden">
                    <FallbackImage
                      src={topic.image_url || '/images/topic-fundamentals.jpg'}
                      alt={topic.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-2xl">{topic.emoji}</span>
                      <h3 className="text-xl font-bold text-white transition-colors group-hover:text-orange-500">
                        <LocalizedOfficialText sourceType="topic" sourceId={topic.id} field="title" sourceText={topic.title} sourceUpdatedAt={topic.updated_at} />
                      </h3>
                    </div>
                    <p className="mb-2 line-clamp-2 text-sm text-gray-400">
                      {topic.description ? (
                        <LocalizedOfficialText sourceType="topic" sourceId={topic.id} field="description" sourceText={topic.description} sourceUpdatedAt={topic.updated_at} />
                      ) : t('topicDescriptionFallback')}
                    </p>
                    <div className="flex items-center justify-end">
                      <ArrowRight className="h-5 w-5 translate-x-0 text-orange-500 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                    </div>
                  </div>
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

function LearningPage() {
  const { t } = useAppLanguage();
  const { loading, canUse } = usePremium();

  if (loading) {
    return <div className="min-h-screen bg-[#050810] flex items-center justify-center text-sm text-white">{t('loadingTopics')}</div>;
  }

  if (!canUse('premium_courses')) {
    return <PremiumRequiredScreen featureName={t('learning')} />;
  }

  return <LearningPageContent />;
}

export default LearningPage;

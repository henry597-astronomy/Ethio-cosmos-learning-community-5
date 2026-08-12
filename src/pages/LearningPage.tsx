import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAllSubtopics, useTopics } from '@/hooks/use-cms-data';
import { FallbackImage } from '@/components/MediaFallback';

export default function LearningPage() {
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
          <p className="text-gray-400">Loading topics...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we fetch the latest content.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050810]">
      {/* Sticky search engine: it remains available while users browse the Learning page. */}
      <div className="sticky top-16 z-40 border-b border-white/10 bg-[#050810]/95 px-2 py-2 backdrop-blur-md sm:px-4">
        <div className="relative mx-auto max-w-3xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search topics and lessons..."
            aria-label="Search topics and lessons"
            className="h-10 w-full rounded-lg border border-white/15 bg-slate-900/90 pl-9 pr-9 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-orange-500/70 focus:ring-1 focus:ring-orange-500/40"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              title="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          )}

          {hasSearch && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] max-h-[60vh] overflow-y-auto rounded-lg border border-white/10 bg-slate-950/98 p-2 shadow-2xl shadow-black/40">
              {lessonsLoading && (
                <p className="px-3 py-2 text-xs text-gray-500">Loading lesson search results...</p>
              )}

              {!lessonsLoading && !hasResults && (
                <p className="px-3 py-4 text-center text-sm text-gray-400">
                  No topics or lessons match “{searchQuery}”.
                </p>
              )}

              {searchResults.topics.length > 0 && (
                <div>
                  <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-orange-400">
                    Topics
                  </p>
                  {searchResults.topics.map((topic) => (
                    <Link
                      key={`search-topic-${topic.id}`}
                      to={`/learning/${topic.id}`}
                      className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-white/10"
                    >
                      <span className="text-lg">{topic.emoji}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-white">{topic.title}</span>
                      <ArrowRight size={15} className="shrink-0 text-gray-500" />
                    </Link>
                  ))}
                </div>
              )}

              {searchResults.lessons.length > 0 && (
                <div className={searchResults.topics.length > 0 ? 'mt-2 border-t border-white/10 pt-2' : ''}>
                  <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-orange-400">
                    Lessons
                  </p>
                  {searchResults.lessons.map((lesson) => {
                    const parentTopic = topics.find((topic) => topic.id === lesson.topic_id);
                    const difficulty = (lesson.difficulty || 'beginner').toLowerCase();
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
                          <span className="block truncate text-sm text-white">{lesson.title}</span>
                          <span className="block truncate text-[11px] text-gray-500">
                            {parentTopic?.title || 'Lesson'} · <span className={difficultyColor}>{difficulty}</span>
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
        className="relative py-24"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(10, 14, 26, 0.8), rgba(5, 8, 16, 0.95)), url(/images/learning-hero.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <Badge className="mb-4 border-orange-500/30 bg-orange-500/20 text-orange-500">
            Learning
          </Badge>
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Explore the Universe
          </h1>
          <p className="mx-auto mb-6 max-w-2xl text-xl text-gray-300">
            From the basics of stargazing to the mysteries of black holes,
            discover the wonders of astronomy through our structured lessons.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {topics.length} Topics
            </span>
            <span>•</span>
            <span>Expert Written</span>
          </div>
        </div>
      </section>

      {/* Topics Grid */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-6">
          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 py-16 text-center">
              <p className="mb-2 font-semibold text-red-400">Could not load topics</p>
              <p className="mb-4 text-sm text-gray-400">{error}</p>
              <p className="text-xs text-gray-500">Please try refreshing the page or contact support if the problem persists.</p>
            </div>
          ) : topics.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-400">No topics available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => (
                <Link
                  key={topic.id}
                  to={`/learning/${topic.id}`}
                  className="group relative overflow-hidden rounded-lg border border-white/10 bg-slate-900 transition-all duration-300 hover:border-orange-500/50"
                >
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
                        {topic.title}
                      </h3>
                    </div>
                    <p className="mb-2 line-clamp-2 text-sm text-gray-400">
                      {topic.description || `Learn about ${topic.title.toLowerCase()} and explore the wonders of the cosmos.`}
                    </p>
                    <div className="flex items-center justify-end">
                      <ArrowRight className="h-5 w-5 translate-x-0 text-orange-500 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

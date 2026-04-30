import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTopics } from '@/hooks/use-cms-data';
import { FallbackImage } from '@/components/MediaFallback';

export default function LearningPage() {
  const topicsHook = useTopics();
  const { topics, loading, error } = topicsHook;

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
      {/* Hero Section */}
      <section
        className="relative py-24"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(10, 14, 26, 0.8), rgba(5, 8, 16, 0.95)), url(/images/learning-hero.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30 mb-4">
            Learning
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Explore the Universe
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-6">
            From the basics of stargazing to the mysteries of black holes,
            discover the wonders of astronomy through our structured lessons.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              {topics.length} Topics
            </span>
            <span>•</span>
            <span>Expert Written</span>
          </div>
        </div>
      </section>

      {/* Topics Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {error ? (
            <div className="text-center py-16 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 font-semibold mb-2">Could not load topics</p>
              <p className="text-gray-400 text-sm mb-4">{error}</p>
              <p className="text-gray-500 text-xs">Please try refreshing the page or contact support if the problem persists.</p>
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400">No topics available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((topic) => (
                <Link
                  key={topic.id}
                  to={`/learning/${topic.id}`}
                  className="group relative overflow-hidden rounded-xl bg-slate-900 border border-white/10 hover:border-orange-500/50 transition-all duration-300"
                >
                  <div className="h-40 overflow-hidden">
                    <FallbackImage
                      src={topic.image_url || '/images/topic-fundamentals.jpg'}
                      alt={topic.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{topic.emoji}</span>
                      <h3 className="text-xl font-bold text-white group-hover:text-orange-500 transition-colors">
                        {topic.title}
                      </h3>
                    </div>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {topic.description || `Learn about ${topic.title.toLowerCase()} and explore the wonders of the cosmos.`}
                    </p>
                    <div className="flex items-center justify-end">
                      <ArrowRight className="w-5 h-5 text-orange-500 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all" />
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

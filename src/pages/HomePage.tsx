import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useHomepageHero, useHomepageFeatureCards, useHomepageFeaturedTopics } from '@/hooks/use-cms-data';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { user } = useAuth();
  const homepageHero = useHomepageHero();
  const homepageFeatureCards = useHomepageFeatureCards();
  const homepageFeaturedTopics = useHomepageFeaturedTopics();
  const navigate = useNavigate();

  const scrollToFeatures = () => {
    const element = document.getElementById('feature-cards');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBeginJourney = () => {
    if (user) {
      navigate('/learning');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="min-h-screen flex items-center relative"
        style={{
          backgroundImage: 'linear-gradient(to bottom, rgba(5, 8, 16, 0.7), rgba(10, 14, 26, 0.9)), url(/images/hero-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {homepageHero.hero?.heroTitle || 'Explore the Cosmos with Ethiopia'}
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              {homepageHero.hero?.heroSubtitle || 'Join the EthioCosmos Learning Community'}
            </p>
            <div className="flex flex-wrap gap-4">
              {!user && (
                <Button 
                  size="lg" 
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8"
                  onClick={handleBeginJourney}
                >
                  Begin Your Journey
                </Button>
              )}
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10 px-8"
                onClick={scrollToFeatures}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section id="feature-cards" className="py-16 bg-[#0a0e1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {homepageFeatureCards.loading ? (
            <div className="grid md:grid-cols-3 gap-6 -mt-32 relative z-10">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white/10 rounded-xl p-8 shadow-xl animate-pulse h-48"
                >
                  <div className="w-12 h-12 bg-white/20 rounded mb-4" />
                  <div className="h-6 bg-white/20 rounded mb-3 w-2/3" />
                  <div className="h-4 bg-white/10 rounded w-full" />
                  <div className="h-4 bg-white/10 rounded w-5/6 mt-2" />
                </div>
              ))}
            </div>
          ) : homepageFeatureCards.error ? (
            <div className="text-red-400 text-sm text-center py-4">
              {homepageFeatureCards.error}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 -mt-32 relative z-10">
              {homepageFeatureCards.featureCards.map((card, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-8 shadow-xl"
                >
                  <div className="text-4xl mb-4">{card.icon}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-gray-600">{card.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Learning Topics Section */}
      <section className="py-20 bg-[#050810]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Featured Learning Topics
            </h2>
            <p className="text-gray-400 text-lg">
              Essential Lessons & Guides
            </p>
          </div>

          {homepageFeaturedTopics.loading ? (
            <div className="grid md:grid-cols-3 gap-8">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-slate-900/50 rounded-xl overflow-hidden border border-white/10 animate-pulse"
                >
                  <div className="h-48 bg-white/10" />
                  <div className="p-6">
                    <div className="h-6 bg-white/10 rounded mb-3 w-2/3" />
                    <div className="h-4 bg-white/5 rounded w-full" />
                    <div className="h-4 bg-white/5 rounded w-5/6 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : homepageFeaturedTopics.error ? (
            <div className="text-red-400 text-sm text-center py-4">
              {homepageFeaturedTopics.error}
            </div>
          ) : homepageFeaturedTopics.featuredTopics.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No featured topics yet</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {homepageFeaturedTopics.featuredTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="bg-slate-900/50 rounded-xl overflow-hidden border border-white/10 hover:border-orange-500/50 transition-all group"
                >
                  <div className="h-48 overflow-hidden">
                    <img
                      src={topic.image_url || (topic as any).image || '/images/topic-fundamentals.jpg'}
                      alt={topic.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2">{topic.title}</h3>
                    <p className="text-gray-400">{topic.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

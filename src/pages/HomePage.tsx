import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useHomepageHero, useHomepageFeatureCards, useHomepageFeaturedTopics } from '@/hooks/use-cms-data';
import { Button } from '@/components/ui/button';
import { getVideoType, getEmbedUrl } from '@/lib/video-utils';
import { AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function HomePage() {
  const { user } = useAuth();
  const homepageHero = useHomepageHero();
  const homepageFeatureCards = useHomepageFeatureCards();
  const homepageFeaturedTopics = useHomepageFeaturedTopics();
  const navigate = useNavigate();

  // Video sequencing state
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>('');
  const [isSecondaryVideo, setIsSecondaryVideo] = useState(false);
  const youtubePlayerRef = useRef<any>(null);
  const googleDriveIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (homepageHero.hero) {
      const { videoUrl, secondaryVideoUrl, enableVideoSequence } = homepageHero.hero;
      
      // If sequence is enabled and we have both videos
      if (enableVideoSequence && videoUrl && secondaryVideoUrl) {
        // Check if user has already finished the first video in this session
        const hasFinishedIntro = sessionStorage.getItem('homepage-intro-finished');
        if (hasFinishedIntro) {
          setCurrentVideoUrl(secondaryVideoUrl);
          setIsSecondaryVideo(true);
        } else {
          setCurrentVideoUrl(videoUrl);
          setIsSecondaryVideo(false);
        }
      } else {
        // Normal single video mode
        setCurrentVideoUrl(videoUrl || '');
        setIsSecondaryVideo(false);
      }
    }
  }, [homepageHero.hero]);

  // Setup YouTube API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      
      window.onYouTubeIframeAPIReady = () => {
        initializeYouTubePlayer();
      };
    } else {
      initializeYouTubePlayer();
    }
  }, [currentVideoUrl, isSecondaryVideo]);

  const initializeYouTubePlayer = () => {
    const iframes = document.querySelectorAll('iframe[src*="youtube"]');
    iframes.forEach((iframe) => {
      if (window.YT && window.YT.Player) {
        try {
          const player = new window.YT.Player(iframe as HTMLIFrameElement, {
            events: {
              onStateChange: (event: any) => {
                // YT.PlayerState.ENDED = 0
                if (event.data === 0) {
                  handleVideoEnd();
                }
              }
            }
          });
          youtubePlayerRef.current = player;
        } catch (e) {
          // Player might already be initialized
        }
      }
    });
  };

  const handleVideoEnd = () => {
    if (homepageHero.hero?.enableVideoSequence && !isSecondaryVideo && homepageHero.hero.secondaryVideoUrl) {
      setCurrentVideoUrl(homepageHero.hero.secondaryVideoUrl);
      setIsSecondaryVideo(true);
      sessionStorage.setItem('homepage-intro-finished', 'true');
    }
  };

  const handleVideoTouch = () => {
    if (homepageHero.hero?.enableVideoSequence && !isSecondaryVideo && homepageHero.hero.secondaryVideoUrl) {
      setCurrentVideoUrl(homepageHero.hero.secondaryVideoUrl);
      setIsSecondaryVideo(true);
      sessionStorage.setItem('homepage-intro-finished', 'true');
    }
  };

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
        className="min-h-screen flex items-center relative overflow-hidden"
        style={{
          backgroundImage: 'url(/images/hero-bg-new.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
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
            
            {/* Video Section */}
            {homepageHero.hero?.videoVisible && currentVideoUrl && (
              <div 
                className="rounded-xl overflow-hidden border-2 border-orange-500/50 shadow-2xl cursor-pointer"
                onClick={handleVideoTouch}
              >
                {getVideoType(currentVideoUrl) === 'youtube' ? (
                  // YouTube Embedded Video
                  <div className="relative w-full aspect-video bg-black">
                    <iframe
                      key={currentVideoUrl}
                      width="100%"
                      height="100%"
                      src={`${getEmbedUrl(currentVideoUrl)}?autoplay=1&enablejsapi=1`}
                      title="Hero Video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0"
                    />
                  </div>
                ) : getVideoType(currentVideoUrl) === 'google-drive' ? (
                  // Google Drive Embedded Video
                  <div className="relative w-full aspect-video bg-black">
                    <iframe
                      key={currentVideoUrl}
                      ref={googleDriveIframeRef}
                      width="100%"
                      height="100%"
                      src={getEmbedUrl(currentVideoUrl) || ''}
                      title="Hero Video"
                      frameBorder="0"
                      allow="autoplay"
                      allowFullScreen
                      className="absolute inset-0"
                    />
                  </div>
                ) : getVideoType(currentVideoUrl) === 'direct' ? (
                  // Direct Video File
                  <video
                    key={currentVideoUrl}
                    controls
                    autoPlay
                    onEnded={handleVideoEnd}
                    className="w-full h-auto aspect-video bg-black"
                    poster="/images/hero-bg-new.jpg"
                  >
                    <source src={currentVideoUrl} />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  // Invalid Video URL
                  <div className="w-full aspect-video bg-black flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Invalid video URL</p>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                  <div className="w-12 h-12 bg-white/10 rounded-lg mb-4" />
                  <div className="w-24 h-4 bg-white/10 rounded mb-2" />
                  <div className="w-full h-12 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 -mt-32 relative z-10">
              {homepageFeatureCards.featureCards.map((card, i) => (
                <div 
                  key={i}
                  className="bg-white rounded-xl p-8 shadow-xl border border-white/5 hover:border-orange-500/30 transition-all duration-300 group"
                >
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {card.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-black leading-relaxed">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Topics Section */}
      <section className="py-24 bg-[#0a0e1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Featured Topics</h2>
            <div className="w-24 h-1 bg-orange-500 mx-auto rounded-full" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {homepageFeaturedTopics.loading ? (
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl overflow-hidden bg-white/5 animate-pulse h-64" />
              ))
            ) : (
              homepageFeaturedTopics.featuredTopics.map((topic) => (
                <div 
                  key={topic.id}
                  className="group rounded-xl overflow-hidden cursor-pointer bg-[#151c2c] border border-white/10 hover:border-orange-500/30 transition-all duration-300 flex flex-col h-full"
                  onClick={() => navigate('/learning')}
                >
                  <img 
                    src={topic.image_url} 
                    alt={topic.title}
                    className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-3">{topic.title}</h3>
                    <p className="text-sm text-gray-300 leading-relaxed flex-1">
                      {topic.description}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="text-center mt-12">
            <Button 
              onClick={() => navigate('/learning')}
              className="bg-transparent border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white px-8"
            >
              View All Topics
            </Button>
          </div>
        </div>
      </section>


    </div>
  );
}

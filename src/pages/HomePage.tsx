import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAppLanguage } from '@/context/AppLanguageContext';
import LocalizedOfficialText from '@/components/LocalizedOfficialText';
import { useHomepageHero, useHomepageFeatureCards, useHomepageFeaturedTopics } from '@/hooks/use-cms-data';
import { Button } from '@/components/ui/button';
import { getVideoType, getEmbedUrl } from '@/lib/video-utils';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { getPublishedSpaceNews } from '@/services/space-news';
import type { SpaceNews } from '@/types';

const getUtcDateKey = () => new Date().toISOString().slice(0, 10);
const HOME_BACKGROUND_VIDEO_URL = 'https://github.com/henry597-astronomy/Ethio-cosmos-learning-community-5/releases/download/home-background-v1/Tiktok_1786697850931.mp4';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useAppLanguage();
  const homepageHero = useHomepageHero();
  const homepageFeatureCards = useHomepageFeatureCards();
  const homepageFeaturedTopics = useHomepageFeaturedTopics();
  const navigate = useNavigate();
  const [dailyNews, setDailyNews] = useState<SpaceNews | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    let active = true;
    const loadNews = async () => {
      const items = await getPublishedSpaceNews(1, getUtcDateKey());
      if (active) {
        setDailyNews(items[0] ?? null);
      }
    };

    loadNews();
    const refreshTimer = window.setInterval(loadNews, 15 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

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

  // Setup YouTube API - Lazy load only when video is visible
  useEffect(() => {
    if (!currentVideoUrl || getVideoType(currentVideoUrl) !== 'youtube') return;
    
    // Use requestIdleCallback to defer YouTube API loading
    const loadYouTubeAPI = () => {
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
        
        window.onYouTubeIframeAPIReady = () => {
          initializeYouTubePlayer();
        };
      } else {
        initializeYouTubePlayer();
      }
    };
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadYouTubeAPI);
    } else {
      setTimeout(loadYouTubeAPI, 1000);
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
      <section className="min-h-screen flex items-center relative overflow-hidden bg-[#0a0e1a]">
        {!prefersReducedMotion && (
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-35"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/images/hero-bg-new.jpg"
            aria-hidden="true"
          >
            <source src={HOME_BACKGROUND_VIDEO_URL} type="video/mp4" />
          </video>
        )}

        {/* Absolute Logo Emblem background container stretched edge-to-edge across the screen area */}
        <div className="absolute inset-0 pointer-events-none opacity-25">
          <img 
            src="/images/hero-bg-new.png" 
                        alt={t('logoEmblem')}
            className="w-full h-full object-fill"
          />
        </div>

        {/* Soft uniform dark overlay to tone down brightness across all corners without hiding the background */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-24 relative z-10 w-full">
          {dailyNews && (
            <article className="mb-6 max-w-5xl mx-auto overflow-hidden rounded-xl border border-orange-300/30 bg-[#0b1222]/90 shadow-2xl backdrop-blur-sm">
              <div className="grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="h-[180px] md:h-[240px] bg-black/30">
                  {dailyNews.image_url ? (
                    <img
                      src={dailyNews.image_url}
                      alt={dailyNews.title}
                      className="h-full w-full object-cover"
                      loading="eager"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-950 to-orange-900 p-8 text-center text-5xl">🌌</div>
                  )}
                </div>
                <div className="flex flex-col justify-center p-3 sm:p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-300">
                    <span>{new Date(dailyNews.published_date).toISOString().slice(0, 10) === getUtcDateKey() ? 'Today\'s Space News' : 'Latest Space News'}</span>
                    <span className="text-white/40">•</span>
                    <span>{dailyNews.category}</span>
                  </div>
                  <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl">{dailyNews.title}</h2>
                  <p className="mt-2 text-base leading-relaxed text-gray-200">{dailyNews.summary}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      asChild
                      className="bg-orange-500 text-white hover:bg-orange-600"
                    >
                      <a href={dailyNews.source_url} target="_blank" rel="noreferrer">
                        Read more <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                    <span className="text-sm text-gray-400 flex items-center gap-2">
                      {dailyNews.source_name} · {new Date(dailyNews.published_date).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                      {new Date(dailyNews.published_date).toISOString().slice(0, 10) === getUtcDateKey() ? (
                        <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Today</span>
                      ) : (
                        <span className="bg-white/10 text-gray-300 border border-white/10 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Latest available</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          )}

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                {homepageHero.hero?.heroTitle ? (
                  <LocalizedOfficialText sourceType="homepage" sourceId="hero" field="title" sourceText={homepageHero.hero.heroTitle} />
                ) : t('exploreCosmos')}
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                {homepageHero.hero?.heroSubtitle ? (
                  <LocalizedOfficialText sourceType="homepage" sourceId="hero" field="subtitle" sourceText={homepageHero.hero.heroSubtitle} />
                ) : t('joinCommunity')}
              </p>
              <div className="flex flex-wrap gap-4">
                {!user && (
                  <Button 
                    size="lg" 
                    className="bg-orange-500 hover:bg-orange-600 text-white px-8"
                    onClick={handleBeginJourney}
                  >
                    {t('beginJourney')}
                  </Button>
                )}
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white/30 text-white hover:bg-white/10 px-8"
                  onClick={scrollToFeatures}
                >
                  {t('learnMore')}
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
                      title={t('heroVideo')}
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
                      title={t('heroVideo')}
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
                    {t('videoUnsupported')}
                  </video>
                ) : (
                  // Invalid Video URL
                  <div className="w-full aspect-video bg-black flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t('invalidVideoUrl')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section id="feature-cards" className="py-8 bg-[#0a0e1a]">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          {homepageFeatureCards.loading ? (
            <div className="grid md:grid-cols-3 gap-2 sm:gap-3 -mt-32 relative z-10">
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
            <div className="grid md:grid-cols-3 gap-2 sm:gap-3 -mt-32 relative z-10">
              {homepageFeatureCards.featureCards.map((card, i) => (
                <div 
                  key={i}
                  className="bg-[#151c2c] rounded-lg p-3 shadow-xl border border-white/5 hover:border-orange-500/30 transition-all duration-300 group"
                >
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">
                    {card.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    <LocalizedOfficialText sourceType="homepage" sourceId={`feature-card-${i}`} field="title" sourceText={card.title} />
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    <LocalizedOfficialText sourceType="homepage" sourceId={`feature-card-${i}`} field="description" sourceText={card.description} />
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Topics Section */}
      <section className="py-8 bg-[#0a0e1a]">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">{t('featuredTopics')}</h2>
            <div className="w-24 h-1 bg-orange-500 mx-auto rounded-full" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {homepageFeaturedTopics.loading ? (
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl overflow-hidden bg-white/5 animate-pulse h-64" />
              ))
            ) : (
              homepageFeaturedTopics.featuredTopics.map((topic) => (
                <div 
                  key={topic.id}
                  className="group rounded-lg overflow-hidden cursor-pointer bg-[#151c2c] border border-white/10 hover:border-orange-500/30 transition-all duration-300 flex flex-col h-full"
                  onClick={() => navigate('/learning')}
                >
                  <img 
                    src={topic.image_url} 
                    alt={topic.title}
                    loading="lazy"
                    className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-2">
                      <LocalizedOfficialText sourceType="homepage" sourceId={`featured-topic-${topic.id}`} field="title" sourceText={topic.title} />
                    </h3>
                    <p className="text-sm text-gray-300 leading-relaxed flex-1">
                      <LocalizedOfficialText sourceType="homepage" sourceId={`featured-topic-${topic.id}`} field="description" sourceText={topic.description} />
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="text-center mt-6">
            <Button 
              onClick={() => navigate('/learning')}
              className="bg-transparent border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white px-8"
            >
              {t('viewAllTopics')}
            </Button>
          </div>
        </div>
      </section>


    </div>
  );
}

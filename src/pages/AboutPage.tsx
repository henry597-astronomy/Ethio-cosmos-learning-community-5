import { FallbackImage } from '@/components/MediaFallback';
import { useAboutContent } from '@/hooks/use-cms-data';
import type { AboutContent } from '@/types';

const ABOUT_FALLBACK: AboutContent = {
  missionText: '',
  whoWeAreText1: '',
  whoWeAreText2: '',
  missionImage: '',
  whoWeAreImage1: '',
  whoWeAreImage2: '',
};

export function AboutPage() {
  const aboutContent = useAboutContent();
  const about: AboutContent = aboutContent.aboutContent ?? ABOUT_FALLBACK;

  return (
    <div className="min-h-screen bg-[#050810]">
      {/* Hero Section */}
      <section
        className="relative py-24"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(10, 14, 26, 0.7), rgba(5, 8, 16, 0.95)), url(/images/about-hero.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            About Ethio-Cosmos
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Building Ethiopia's astronomy community, one star at a time
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                Our Mission
              </h2>
              <div className="w-16 h-1 bg-orange-500 mb-6" />
              <p className="text-gray-300 text-lg leading-relaxed">
                {about.missionText ||
                  'Our mission is to make astronomy education accessible to everyone in Ethiopia and beyond. We believe that understanding the cosmos inspires curiosity, critical thinking, and a deeper appreciation for our place in the universe.'}
              </p>
            </div>
            <div className="rounded-xl overflow-hidden">
              <FallbackImage
                src={about.missionImage || '/images/mission.jpg'}
                alt="Our Mission"
                className="w-full h-80 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Who We Are Section */}
      <section className="py-16 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Who We Are
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="rounded-xl overflow-hidden">
              <FallbackImage
                src={about.whoWeAreImage1 || '/images/who-we-are-1.jpg'}
                alt="Team"
                className="w-full h-64 object-cover"
              />
            </div>
            <div className="rounded-xl overflow-hidden">
              <FallbackImage
                src={about.whoWeAreImage2 || '/images/who-we-are-2.jpg'}
                alt="Community"
                className="w-full h-64 object-cover"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <p className="text-gray-300 leading-relaxed">
              {about.whoWeAreText1 ||
                'Ethio-Cosmos is a community-driven platform created by passionate astronomers, educators, and developers who want to share their love for the stars with the world.'}
            </p>
            <p className="text-gray-300 leading-relaxed">
              {about.whoWeAreText2 ||
                'We combine modern educational techniques with Ethiopia\'s rich astronomical heritage to create a unique learning experience that honors both science and culture.'}
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Our Values
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Education First
              </h3>
              <p className="text-gray-400">
                We believe in making quality astronomy education accessible to everyone, regardless of background.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Community Driven
              </h3>
              <p className="text-gray-400">
                Our platform thrives on the contributions and engagement of our passionate community.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Cultural Heritage
              </h3>
              <p className="text-gray-400">
                We celebrate Ethiopia's rich astronomical history and integrate it into modern learning.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            Meet the Team
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Henok Girma', role: 'Founder & Lead Developer', emoji: '👨‍💻' },
              { name: 'Astronomy Expert', role: 'Content Director', emoji: '🔭' },
              { name: 'Community Manager', role: 'Engagement Lead', emoji: '👥' },
            ].map((member, index) => (
              <div
                key={index}
                className="text-center p-6 bg-slate-900 rounded-xl border border-white/10"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center text-4xl">
                  {member.emoji}
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {member.name}
                </h3>
                <p className="text-orange-500 text-sm">
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;

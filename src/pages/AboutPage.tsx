import { useAboutContent } from '@/hooks/use-cms-data';

export default function AboutPage() {
  const { aboutContent, loading, error } = useAboutContent();

  const about = aboutContent || {
    missionText: '',
    whoWeAreText1: '',
    whoWeAreText2: '',
    missionImage: '/images/mission.jpg',
    whoWeAreImage1: '/images/who-we-are-1.jpg',
    whoWeAreImage2: '/images/who-we-are-2.jpg',
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#0a0e1a] text-white">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#0a0e1a] text-red-400">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Hero Section */}
      <section 
        className="py-24 relative overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(to bottom, rgba(5, 8, 16, 0.8), rgba(10, 14, 26, 0.95)), url(/images/about-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">About Ethio-Cosmos</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Inspiring the next generation of Ethiopian astronomers and space enthusiasts.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-[#050810]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Our Mission</h2>
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                {about.missionText || 
                  'Our mission is to democratize astronomy education in Ethiopia, making the wonders of the universe accessible to everyone through innovative digital learning and community engagement.'}
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2">
                  <span className="text-orange-500 font-bold">1000+</span>
                  <span className="text-gray-400 ml-2 text-sm">Active Learners</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2">
                  <span className="text-orange-500 font-bold">50+</span>
                  <span className="text-gray-400 ml-2 text-sm">Expert Lessons</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-2xl overflow-hidden border border-white/10">
                <img 
                  src={about.missionImage || '/images/mission.jpg'} 
                  alt="Our Mission" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Who We Are Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Who We Are</h2>
            <div className="w-20 h-1 bg-orange-500 mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div className="order-2 md:order-1">
              <div className="grid grid-cols-2 gap-4">
                <img 
                  src={about.whoWeAreImage1 || '/images/who-we-are-1.jpg'} 
                  alt="Team collaboration" 
                  className="rounded-xl border border-white/10 shadow-2xl"
                />
                <img 
                  src={about.whoWeAreImage2 || '/images/who-we-are-2.jpg'} 
                  alt="Astronomical observation" 
                  className="rounded-xl border border-white/10 shadow-2xl mt-8"
                />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                {about.whoWeAreText1 ||
                  'Ethio-Cosmos is a community-driven platform created by passionate astronomers, educators, and developers who want to share their love for the stars with the world.'}
              </p>
              <p className="text-gray-300 leading-relaxed">
                {about.whoWeAreText2 ||
                  'We combine modern educational techniques with Ethiopia\'s rich astronomical heritage to create a unique learning experience that honors both science and culture.'}
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
              { name: 'Dr. Solomon Belay', role: 'Scientific Advisor', bio: 'Pioneer in Ethiopian astronomy and space science.' },
              { name: 'Abebe Kebede', role: 'Education Lead', bio: 'Expert in astronomical curriculum development.' },
              { name: 'Tigist G/Mariam', role: 'Community Manager', bio: 'Passionate about connecting space enthusiasts across Ethiopia.' }
            ].map((member, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center hover:border-orange-500/50 transition-colors">
                <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl">👤</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                <p className="text-orange-500 text-sm mb-4">{member.role}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

import { useAboutContent } from '@/hooks/use-cms-data';
import type { AboutContent, TeamMember } from '@/types';

export default function AboutPage() {
  const { aboutContent, loading, error } = useAboutContent();

  const about: AboutContent = aboutContent || {
    missionText: '',
    whoWeAreText1: '',
    whoWeAreText2: '',
    missionImage: '/images/mission.jpg',
    whoWeAreImage1: '/images/who-we-are-1.jpg',
    whoWeAreImage2: '/images/who-we-are-2.jpg',
    team: {
      platformCreators: [],
      educationalAdvisors: [],
      communityMembers: [],
    },
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
      <section className="py-24 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-white mb-4">Meet the Team</h2>
            <div className="w-24 h-1 bg-orange-500 mx-auto"></div>
          </div>

          {[
            { id: 'platformCreators', title: 'Platform Creators', members: about.team?.platformCreators },
            { id: 'educationalAdvisors', title: 'Educational Advisors', members: about.team?.educationalAdvisors },
            { id: 'communityMembers', title: 'Community Members', members: about.team?.communityMembers }
          ].map((section) => (
            <div key={section.id} className="mb-20 last:mb-0">
              <h3 className="text-2xl font-bold text-white mb-10 pl-4 border-l-4 border-orange-500">
                {section.title}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {section.members && section.members.length > 0 ? (
                  section.members.map((member: TeamMember) => (
                    <div 
                      key={member.id} 
                      className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="aspect-square overflow-hidden relative">
                        {member.image_url ? (
                          <img 
                            src={member.image_url} 
                            alt={member.name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                            <span className="text-4xl">👤</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <div className="p-6 text-center">
                        <h4 className="text-lg font-bold text-white mb-1 group-hover:text-orange-500 transition-colors">
                          {member.name}
                        </h4>
                        <p className="text-orange-500 text-sm font-medium">
                          {member.work}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <p className="text-gray-500 italic">No members added to this section yet.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

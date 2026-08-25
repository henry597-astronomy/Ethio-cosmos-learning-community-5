import { useAboutContent } from '@/hooks/use-cms-data';
import type { AboutContent, TeamMember } from '@/types';
import { useAppLanguage } from '@/context/AppLanguageContext';
import LocalizedOfficialText from '@/components/LocalizedOfficialText';

export default function AboutPage() {
  const { t } = useAppLanguage();
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
      <div className="min-h-screen pt-20 flex items-center justify-center bg-[#0a0e1a] text-white">
        {t('loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-[#0a0e1a] text-red-400">
        {t('error')}: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Hero Section */}
      <section 
        className="py-12 relative overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(to bottom, rgba(5, 8, 16, 0.8), rgba(10, 14, 26, 0.95)), url(/images/about-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{t('about')}</h1>
          <p className="text-base text-gray-300 max-w-2xl mx-auto">{t('aboutSubtitle')}</p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-8 bg-[#050810]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">{t('ourMission')}</h2>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4">
                {about.missionText ? (
                  <LocalizedOfficialText sourceType="about" sourceId="about_content" field="missionText" sourceText={about.missionText} />
                ) : t('missionFallback')}
              </p>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
                <img 
                  src={about.missionImage || '/images/mission.jpg'} 
                  alt={t('missionAlt')}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Who We Are Section */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">{t('whoWeAre')}</h2>
            <div className="w-16 h-1 bg-orange-500 mx-auto"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-center mb-10">
            <div className="order-2 md:order-1">
              <div className="grid grid-cols-2 gap-3">
                <img 
                  src={about.whoWeAreImage1 || '/images/who-we-are-1.jpg'} 
                  alt={t('teamCollaborationAlt')}
                  className="rounded-lg border border-white/10 shadow-lg"
                />
                <img 
                  src={about.whoWeAreImage2 || '/images/who-we-are-2.jpg'} 
                  alt={t('astronomicalObservationAlt')}
                  className="rounded-lg border border-white/10 shadow-lg mt-6"
                />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4">
                {about.whoWeAreText1 ? (
                  <LocalizedOfficialText sourceType="about" sourceId="about_content" field="whoWeAreText1" sourceText={about.whoWeAreText1} />
                ) : t('whoWeAreFallback1')}
              </p>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                {about.whoWeAreText2 ? (
                  <LocalizedOfficialText sourceType="about" sourceId="about_content" field="whoWeAreText2" sourceText={about.whoWeAreText2} />
                ) : t('whoWeAreFallback2')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-10 bg-slate-900/50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">{t('meetTeam')}</h2>
            <div className="w-20 h-1 bg-orange-500 mx-auto"></div>
          </div>

          {[
            { id: 'platformCreators', title: t('platformCreators'), members: about.team?.platformCreators },
            { id: 'educationalAdvisors', title: t('educationalAdvisors'), members: about.team?.educationalAdvisors },
            { id: 'communityMembers', title: t('communityMembers'), members: about.team?.communityMembers }
          ].map((section) => {
            const members = section.members || [];
            const hasMembers = members.length > 0;

            return (
              <div key={section.id} className="mb-10 last:mb-0">
                <h3 className="text-xl font-bold text-white mb-4 pl-3 border-l-4 border-orange-500">
                  {section.title}
                </h3>

                {hasMembers ? (
                  <div className="team-marquee" aria-label={`${section.title} carousel`}>
                    <div className="team-marquee-track">
                      {members.map((member: TeamMember) => (
                        <article
                          key={member.id}
                          className="team-member-card group"
                        >
                          {member.image_url ? (
                            <img
                              src={member.image_url}
                              alt={member.name}
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                              <span className="text-4xl" aria-hidden="true">👤</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 p-3 text-left">
                            <h4 className="truncate text-sm font-bold text-white group-hover:text-orange-300 transition-colors">
                              {member.name}
                            </h4>
                            <p className="truncate text-xs font-medium text-orange-400">
                              {member.work}
                            </p>
                          </div>
                        </article>
                      ))}
                      {members.length > 0 && members.map((member: TeamMember) => (
                        <article
                          key={`${member.id}-loop`}
                          className="team-member-card group"
                          aria-hidden="true"
                        >
                          {member.image_url ? (
                            <img
                              src={member.image_url}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                              <span className="text-4xl" aria-hidden="true">👤</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 p-3 text-left">
                            <h4 className="truncate text-sm font-bold text-white">{member.name}</h4>
                            <p className="truncate text-xs font-medium text-orange-400">{member.work}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                    <p className="text-gray-500 italic text-sm">{t('noMembersAdded')}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

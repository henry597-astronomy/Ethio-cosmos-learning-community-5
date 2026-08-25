import { useMemo, useState } from 'react';
import { Download, ExternalLink, Play, X, FolderOpen, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMaterialsGroups } from '@/hooks/use-cms-data';
import { FallbackImage } from '@/components/MediaFallback';
import { getEmbedUrl, getVideoType } from '@/lib/video-utils';
import { useAppLanguage } from '@/context/AppLanguageContext';
import LocalizedOfficialText from '@/components/LocalizedOfficialText';
import type { MaterialType } from '@/types';

type ViewTab = 'all' | MaterialType;

interface GroupedSection {
  id: string;
  name: string;
  description?: string;
  link?: string;
  preview_image?: string;
  type: MaterialType;
  galleryItems: { id: string; url: string; title: string }[];
  videos: { id: string; url: string; thumbnail: string; title: string }[];
  pdfs: { id: string; url: string; title: string; label: string }[];
}

export default function MaterialsPage() {
  const { t } = useAppLanguage();
  const { grouped, loading } = useMaterialsGroups();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>('all');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Build group sections. Items without a group fall into "Uncategorized",
  // preserving everything the admin previously uploaded as a flat list.
  const sections = useMemo<GroupedSection[]>(() => {
    const orderedGroups = [...(grouped.groups ?? [])].sort(
      (a, b) => a.order_index - b.order_index
    );
    const sectionMap = new Map<string, GroupedSection>();
    const uncategorized: GroupedSection = {
      id: 'uncategorized',
      name: t('materialsLibrary'),
      type: 'gallery',
      galleryItems: [],
      videos: [],
      pdfs: [],
    };

    for (const g of orderedGroups) {
      sectionMap.set(g.id, {
        id: g.id,
        name: g.name,
        description: g.description,
        link: g.link,
        preview_image: g.preview_image,
        type: g.type,
        galleryItems: [],
        videos: [],
        pdfs: [],
      });
    }

    for (const img of grouped.gallery ?? []) {
      const section = img.group_id ? sectionMap.get(img.group_id) : undefined;
      if (section) {
        section.galleryItems.push(img);
      } else {
        uncategorized.galleryItems.push(img);
      }
    }
    for (const v of grouped.videos ?? []) {
      const section = v.group_id ? sectionMap.get(v.group_id) : undefined;
      if (section) {
        section.videos.push(v);
      } else {
        uncategorized.videos.push(v);
      }
    }
    for (const p of grouped.pdfs ?? []) {
      const section = p.group_id ? sectionMap.get(p.group_id) : undefined;
      if (section) {
        section.pdfs.push(p);
      } else {
        uncategorized.pdfs.push(p);
      }
    }

    const ordered: GroupedSection[] = [];
    for (const g of orderedGroups) {
      const s = sectionMap.get(g.id);
      if (s && (s.galleryItems.length || s.videos.length || s.pdfs.length)) {
        ordered.push(s);
      }
    }
    if (uncategorized.galleryItems.length || uncategorized.videos.length || uncategorized.pdfs.length) {
      ordered.push(uncategorized);
    }
    return ordered;
  }, [grouped, t]);

  // Which sections to render based on the active category, optional group, and search query.
  const visibleSections = useMemo(() => {
    let result = sections;
    if (activeGroup) {
      result = sections.filter((s) => s.id === activeGroup);
    }
    if (viewTab === 'gallery') {
      result = result.filter((s) => s.galleryItems.length > 0);
    } else if (viewTab === 'video') {
      result = result.filter((s) => s.videos.length > 0);
    } else if (viewTab === 'pdf') {
      result = result.filter((s) => s.pdfs.length > 0);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
      );
    }
    return result;
  }, [sections, viewTab, activeGroup, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#050810] text-gray-400">
        {t('loading')}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050810]">
      {/* Hero Section */}
      <section
        className="relative py-24"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(10, 14, 26, 0.7), rgba(5, 8, 16, 0.95)), url(/images/materials-hero.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t('materialsLibrary')}
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {t('exploreCollection')}
          </p>

            {/* Category filter tabs & Search */}
            <div className="flex flex-col items-center gap-4 mt-8">
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant={viewTab === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setViewTab('all'); setActiveGroup(null); }}
                  className={viewTab === 'all' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'border-white/20 text-white hover:bg-white/10'}
                >
                  <FolderOpen className="w-4 h-4 mr-2" /> {t('all')}
                </Button>
                <Button
                  variant={viewTab === 'gallery' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setViewTab('gallery'); setActiveGroup(null); }}
                  className={viewTab === 'gallery' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'border-white/20 text-white hover:bg-white/10'}
                >
                  {t('photoGallery')}
                </Button>
                <Button
                  variant={viewTab === 'video' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setViewTab('video'); setActiveGroup(null); }}
                  className={viewTab === 'video' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'border-white/20 text-white hover:bg-white/10'}
                >
                  {t('videos')}
                </Button>
                <Button
                  variant={viewTab === 'pdf' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setViewTab('pdf'); setActiveGroup(null); }}
                  className={viewTab === 'pdf' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'border-white/20 text-white hover:bg-white/10'}
                >
                  {t('downloads')}
                </Button>
              </div>

              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t('searchMaterialCategories')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 bg-slate-900/80 border-white/20 text-white placeholder:text-gray-400 rounded-full"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
        </div>
      </section>

      {/* Category collection view (shown when no category is selected) */}
      {!activeGroup && (
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
            <h2 className="text-xl font-bold text-white mb-6">
              {viewTab === 'all' ? t('browseByCategory') : `${t('categories')} (${viewTab === 'gallery' ? t('photos') : viewTab === 'video' ? t('videos') : t('downloads')})`}
            </h2>
            {visibleSections.length === 0 ? (
              <p className="text-gray-400 text-sm">
                {t('noCategories')}
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {visibleSections.map((section) => {
                  const total = section.galleryItems.length + section.videos.length + section.pdfs.length;
                  const preview = section.preview_image || section.galleryItems[0]?.url || section.videos[0]?.thumbnail;
                  const typeLabel =
                    section.type === 'gallery' ? t('photos') :
                    section.type === 'video' ? t('videos') : t('downloads');
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveGroup(section.id)}
                      className="group relative rounded-xl overflow-hidden bg-slate-900 border border-white/10 hover:border-orange-500/50 transition-all text-left"
                    >
                      <div className="relative aspect-[4/3]">
                        {preview ? (
                          <FallbackImage src={preview} alt={section.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                            <FolderOpen className="w-10 h-10 text-gray-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-white font-semibold group-hover:text-orange-500 transition-colors">
                            {section.id === 'uncategorized' ? section.name : (
                              <LocalizedOfficialText sourceType="material" sourceId={section.id} field="name" sourceText={section.name} />
                            )}
                          </h3>
                          <p className="text-gray-300 text-xs mt-1">
                            {section.id === 'uncategorized' ? `${t('materialsLibrary')} • ${total} ${total === 1 ? t('item') : t('items')}` : `${typeLabel} • ${total} ${total === 1 ? t('item') : t('items')}`}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Group detail view (shown when a category is selected) */}
      {activeGroup && (
        <section className="py-6">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
            <button
              onClick={() => setActiveGroup(null)}
              className="text-orange-500 hover:text-orange-400 text-sm mb-4 inline-flex items-center"
            >
              ← {t('backToCategories')}
            </button>
            {visibleSections.map((section) => (
              <div key={section.id} className="mb-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">
                      {section.id === 'uncategorized' ? section.name : (
                        <LocalizedOfficialText sourceType="material" sourceId={section.id} field="name" sourceText={section.name} />
                      )}
                    </h2>
                    {section.description && (
                      <p className="text-gray-400">
                        <LocalizedOfficialText sourceType="material" sourceId={section.id} field="description" sourceText={section.description} />
                      </p>
                    )}
                  </div>
                  {section.link && (
                    <Button
                      asChild
                      variant="outline"
                      className="border-orange-500/50 text-orange-500 hover:bg-orange-500 hover:text-white"
                    >
                      <a href={section.link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" /> {t('visitSource')}
                      </a>
                    </Button>
                  )}
                </div>
                <GroupContent
                  section={section}
                  viewTab={viewTab}
                  onOpenImage={(url) => setSelectedImage(url)}
                  onOpenVideo={(url, title) => setSelectedVideo({ url, title })}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 text-white hover:text-orange-500 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={selectedImage}
            alt={t('galleryImage')}
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Video Lightbox */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <button
            onClick={() => setSelectedVideo(null)}
            className="absolute top-4 right-4 p-2 text-white hover:text-orange-500 transition-colors z-[60]"
          >
            <X className="w-8 h-8" />
          </button>
          <div 
            className="w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const embedUrl = getEmbedUrl(selectedVideo.url);
              const type = getVideoType(selectedVideo.url);
              
              if (embedUrl) {
                return (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    title={selectedVideo.title}
                  />
                );
              } else if (type === 'direct') {
                return (
                  <video
                    src={selectedVideo.url}
                    controls
                    autoPlay
                    className="w-full h-full"
                  />
                );
              } else {
                return (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white p-8 text-center">
                    <p className="mb-4">{t('directVideoFormat')}</p>
                    <Button
                      onClick={() => window.open(selectedVideo.url, '_blank')}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t('openNewTab')}
                    </Button>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// Renders the contents of a single category section (gallery grid, videos,
// downloads). Reused for category detail view.
function GroupContent({
  section,
  viewTab,
  onOpenImage,
  onOpenVideo,
}: {
  section: GroupedSection;
  viewTab: ViewTab;
  onOpenImage: (url: string) => void;
  onOpenVideo: (url: string, title: string) => void;
}) {
  const { t } = useAppLanguage();

  return (
    <div className="space-y-8">
      {/* Photo Gallery */}
      {(viewTab === 'all' || viewTab === 'gallery') && section.galleryItems.length > 0 && (
        <section className="py-2">
          <h3 className="text-xl font-bold text-white mb-4">{t('photoGallery')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {section.galleryItems.map((image) => (
              <button
                key={image.id}
                onClick={() => onOpenImage(image.url)}
                className="relative aspect-square rounded-xl overflow-hidden group"
              >
                <FallbackImage
                  src={image.url}
                  alt={image.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <span className="text-white text-sm">
                    <LocalizedOfficialText sourceType="material" sourceId={image.id} field="title" sourceText={image.title} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Videos Section */}
      {(viewTab === 'all' || viewTab === 'video') && section.videos.length > 0 && (
        <section className="py-4 bg-slate-900/50 rounded-xl p-4 sm:p-6">
          <h3 className="text-xl font-bold text-white mb-4">{t('videos')}</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {section.videos.map((video) => (
              <button
                key={video.id}
                onClick={() => onOpenVideo(video.url, video.title)}
                className="group relative rounded-xl overflow-hidden bg-slate-900 border border-white/10 hover:border-orange-500/50 transition-all text-left"
              >
                <div className="relative aspect-video">
                  <FallbackImage
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-orange-500/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="text-white font-semibold group-hover:text-orange-500 transition-colors">
                    <LocalizedOfficialText sourceType="material" sourceId={video.id} field="title" sourceText={video.title} />
                  </h4>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* PDF Downloads */}
      {(viewTab === 'all' || viewTab === 'pdf') && section.pdfs.length > 0 && (
        <section className="py-2">
          <h3 className="text-xl font-bold text-white mb-4">{t('downloads')}</h3>
          <div className="space-y-2 sm:space-y-3">
            {section.pdfs.map((pdf) => (
              <div
                key={pdf.id}
                className="flex items-center justify-between p-4 bg-slate-900 border border-white/10 rounded-xl hover:border-orange-500/30 transition-all"
              >
                <div>
                  <span className="inline-block px-2 py-1 bg-orange-500/20 text-orange-500 text-xs rounded mb-2">
                    {pdf.label}
                  </span>
                  <h4 className="text-white font-semibold">
                    <LocalizedOfficialText sourceType="material" sourceId={pdf.id} field="title" sourceText={pdf.title} />
                  </h4>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(pdf.url, '_blank')}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t('open')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = pdf.url;
                      link.download = pdf.title;
                      link.click();
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t('download')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

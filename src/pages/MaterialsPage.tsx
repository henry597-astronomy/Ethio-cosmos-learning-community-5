import { useMemo, useState } from 'react';
import { Download, ExternalLink, Play, X, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMaterialsGroups } from '@/hooks/use-cms-data';
import { FallbackImage } from '@/components/MediaFallback';
import type { MaterialType } from '@/types';

type ViewTab = 'all' | MaterialType;

interface GroupedSection {
  id: string;
  name: string;
  description?: string;
  type: MaterialType;
  galleryItems: { id: string; url: string; title: string }[];
  videos: { id: string; url: string; thumbnail: string; title: string }[];
  pdfs: { id: string; url: string; title: string; label: string }[];
}

export default function MaterialsPage() {
  const { grouped, loading } = useMaterialsGroups();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>('all');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // Build group sections. Items without a group fall into "Uncategorized",
  // preserving everything the admin previously uploaded as a flat list.
  const sections = useMemo<GroupedSection[]>(() => {
    const orderedGroups = [...(grouped.groups ?? [])].sort(
      (a, b) => a.order_index - b.order_index
    );
    const sectionMap = new Map<string, GroupedSection>();
    const uncategorized: GroupedSection = {
      id: 'uncategorized',
      name: 'All Materials',
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
  }, [grouped]);

  // Which sections to render based on the active category and optional group.
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
    return result;
  }, [sections, viewTab, activeGroup]);

  const groupedSections = visibleSections.filter((s) => s.id !== 'uncategorized');

  const isGroupedView = grouped.groups && grouped.groups.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-[#050810] text-gray-400">
        Loading materials...
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
            Learning Materials
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Explore our collection of photos, videos, and downloadable resources
          </p>

          {/* Category filter tabs */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            <Button
              variant={viewTab === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setViewTab('all'); setActiveGroup(null); }}
              className={viewTab === 'all' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'border-white/20 text-white hover:bg-white/10'}
            >
              <FolderOpen className="w-4 h-4 mr-2" /> All
            </Button>
            <Button
              variant={viewTab === 'gallery' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setViewTab('gallery'); setActiveGroup(null); }}
              className={viewTab === 'gallery' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'border-white/20 text-white hover:bg-white/10'}
            >
              Photo Gallery
            </Button>
            <Button
              variant={viewTab === 'video' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setViewTab('video'); setActiveGroup(null); }}
              className={viewTab === 'video' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'border-white/20 text-white hover:bg-white/10'}
            >
              Videos
            </Button>
            <Button
              variant={viewTab === 'pdf' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setViewTab('pdf'); setActiveGroup(null); }}
              className={viewTab === 'pdf' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'border-white/20 text-white hover:bg-white/10'}
            >
              Downloads
            </Button>
          </div>
        </div>
      </section>

      {/* Category collection (browse by group, like the galleries collection) */}
      {!activeGroup && isGroupedView && (viewTab === 'all') && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-white mb-8">Browse by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {groupedSections.map((section) => {
                const total = section.galleryItems.length + section.videos.length + section.pdfs.length;
                const preview = section.galleryItems[0]?.url || section.videos[0]?.thumbnail;
                const typeLabel =
                  section.type === 'gallery' ? 'Photos' :
                  section.type === 'video' ? 'Videos' : 'Downloads';
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
                          {section.name}
                        </h3>
                        <p className="text-gray-300 text-xs mt-1">
                          {typeLabel} • {total} {total === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Group detail view */}
      {activeGroup && (
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setActiveGroup(null)}
              className="text-orange-500 hover:text-orange-400 text-sm mb-6 inline-flex items-center"
            >
              ← Back to categories
            </button>
            {visibleSections.map((section) => (
              <div key={section.id} className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-2">{section.name}</h2>
                {section.description && (
                  <p className="text-gray-400 mb-6">{section.description}</p>
                )}
                <GroupContent
                  section={section}
                  viewTab={viewTab}
                  onOpenImage={(url) => setSelectedImage(url)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Flat sections (either no groups exist yet, or materials without a group).
          Each section renders its own header, preserving the familiar per-type
          layout until the admin organizes content into categories. */}
      {!activeGroup && (
        <>
          {viewTab === 'all' && !isGroupedView && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-16">
              <h2 className="text-2xl font-bold text-white mb-4">
                Explore Photos, Videos & Downloads
              </h2>
              {sections.length === 0 && (
                <p className="text-gray-400 text-sm">
                  The admin has not added materials yet. Photos, videos and
                  downloads will appear here once they are uploaded.
                </p>
              )}
            </div>
          )}
          {visibleSections.map((section) => (
            <GroupContent
              key={section.id}
              section={section}
              viewTab={viewTab}
              onOpenImage={(url) => setSelectedImage(url)}
            />
          ))}
        </>
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
            alt="Gallery image"
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// Renders the contents of a single category section (gallery grid, videos,
// downloads). Reused for both the category collection and flat fallback views.
function GroupContent({
  section,
  viewTab,
  onOpenImage,
}: {
  section: GroupedSection;
  viewTab: ViewTab;
  onOpenImage: (url: string) => void;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      {/* Photo Gallery */}
      {(viewTab === 'all' || viewTab === 'gallery') && section.galleryItems.length > 0 && (
        <section className="py-8">
          <h3 className="text-2xl font-bold text-white mb-6">
            {section.galleryItems.length > 0 ? section.name : 'Photo Gallery'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <span className="text-white text-sm">{image.title}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Videos Section */}
      {(viewTab === 'all' || viewTab === 'video') && section.videos.length > 0 && (
        <section className="py-8 bg-slate-900/50">
          <h3 className="text-2xl font-bold text-white mb-6">Videos</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {section.videos.map((video) => (
              <a
                key={video.id}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative rounded-xl overflow-hidden bg-slate-900 border border-white/10 hover:border-orange-500/50 transition-all"
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
                    {video.title}
                  </h4>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* PDF Downloads */}
      {(viewTab === 'all' || viewTab === 'pdf') && section.pdfs.length > 0 && (
        <section className="py-8">
          <h3 className="text-2xl font-bold text-white mb-6">Downloads</h3>
          <div className="space-y-4">
            {section.pdfs.map((pdf) => (
              <div
                key={pdf.id}
                className="flex items-center justify-between p-4 bg-slate-900 border border-white/10 rounded-xl hover:border-orange-500/30 transition-all"
              >
                <div>
                  <span className="inline-block px-2 py-1 bg-orange-500/20 text-orange-500 text-xs rounded mb-2">
                    {pdf.label}
                  </span>
                  <h4 className="text-white font-semibold">{pdf.title}</h4>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(pdf.url, '_blank')}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open
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
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {section.galleryItems.length === 0 &&
        section.videos.length === 0 &&
        section.pdfs.length === 0 && (
          <p className="text-gray-400 text-center py-8">
            No materials in this category yet.
          </p>
        )}
    </div>
  );
}

import { useState } from 'react';
import { Download, ExternalLink, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMaterialsGalleryImages, useMaterialsVideos, useMaterialsPdfs } from '@/hooks/use-cms-data';
import { FallbackImage } from '@/components/MediaFallback';

export default function MaterialsPage() {
  const materialsGalleryImages = useMaterialsGalleryImages();
  const materialsVideos = useMaterialsVideos();
  const materialsPdfs = useMaterialsPdfs();
  const galleryImages = materialsGalleryImages.galleryImages;
  const videos = materialsVideos.videos;
  const pdfs = materialsPdfs.pdfs;
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
        </div>
      </section>

      {/* Photo Gallery */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-8">
            Photo Gallery
          </h2>

          {galleryImages.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No gallery images available yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {galleryImages.map((image) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(image.url)}
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
          )}
        </div>
      </section>

      {/* Videos Section */}
      <section className="py-16 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-8">
            Videos
          </h2>

          {videos.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No videos available yet.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
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
                    <h3 className="text-white font-semibold group-hover:text-orange-500 transition-colors">
                      {video.title}
                    </h3>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* PDF Downloads */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-8">
            Downloadable Resources
          </h2>

          {pdfs.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No downloads available yet.
            </p>
          ) : (
            <div className="space-y-4">
              {pdfs.map((pdf) => (
                <div
                  key={pdf.id}
                  className="flex items-center justify-between p-4 bg-slate-900 border border-white/10 rounded-xl hover:border-orange-500/30 transition-all"
                >
                  <div>
                    <span className="inline-block px-2 py-1 bg-orange-500/20 text-orange-500 text-xs rounded mb-2">
                      {pdf.label}
                    </span>
                    <h3 className="text-white font-semibold">
                      {pdf.title}
                    </h3>
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
          )}
        </div>
      </section>

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



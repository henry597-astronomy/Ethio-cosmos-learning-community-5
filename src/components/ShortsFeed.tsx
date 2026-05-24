import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/supabase';
import type { Short } from '@/types';
import { X, Loader, Heart, MessageCircle, Share2, Upload, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface ShortsFeedProps {
  onClose: () => void;
}

export default function ShortsFeed({ onClose }: ShortsFeedProps) {
  const { user } = useAuth();
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchShorts();
  }, []);

  // Update video mute state when isMuted changes
  useEffect(() => {
    if (videoRefs.current[currentVideoIndex]) {
      videoRefs.current[currentVideoIndex]!.muted = isMuted;
    }
  }, [isMuted, currentVideoIndex]);

  // Handle scroll to track current video and cleanup previous ones
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Debounce scroll handling
      scrollTimeoutRef.current = setTimeout(() => {
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        
        // Calculate which video is in view
        const newIndex = Math.round(scrollTop / containerHeight);
        
        if (newIndex !== currentVideoIndex && newIndex >= 0 && newIndex < shorts.length) {
          // Stop and cleanup all videos
          Object.keys(videoRefs.current).forEach((key) => {
            const video = videoRefs.current[key];
            if (video) {
              video.pause();
              video.currentTime = 0;
              video.src = '';
              video.load();
            }
          });

          // Update current index
          setCurrentVideoIndex(newIndex);

          // Play the new video
          setTimeout(() => {
            const newVideo = videoRefs.current[newIndex];
            if (newVideo) {
              newVideo.currentTime = 0;
              newVideo.play().catch((err) => {
                console.warn('Autoplay prevented:', err);
              });
            }
          }, 100);
        }
      }, 150);
    };

    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [currentVideoIndex, shorts.length]);

  const fetchShorts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shorts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedShorts = (data || []).map((s: any) => ({
        ...s,
        user_name: 'User',
        user_avatar: undefined,
      }));

      setShorts(formattedShorts);
      setCurrentVideoIndex(0);
    } catch (error) {
      console.error('Error fetching shorts:', error);
      toast.error('Failed to load shorts');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('shorts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      if (!uploadData) {
        throw new Error('Upload returned no data');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('shorts')
        .getPublicUrl(filePath);

      if (!publicUrl) {
        throw new Error('Failed to get public URL');
      }

      // Insert record into database
      const { data: insertData, error: dbError } = await supabase
        .from('shorts')
        .insert({
          user_id: user.id,
          video_url: publicUrl,
          caption: 'New short',
          is_active: true,
        })
        .select();

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

      if (!insertData || insertData.length === 0) {
        throw new Error('Failed to create short record');
      }

      toast.success('Short uploaded successfully!');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh shorts list
      fetchShorts();
    } catch (error) {
      console.error('Error uploading short:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload short';
      toast.error(errorMessage);
      
      // Reset file input on error
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent">
        <h2 className="text-white text-xl font-bold">Shorts</h2>
        <div className="flex items-center gap-2">
          {user && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                accept="video/*"
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                variant="ghost"
                className="text-white hover:bg-white/20 transition-all duration-300"
                title="Upload a new short video"
              >
                {uploading ? (
                  <>
                    <Loader className="animate-spin" size={24} />
                    <span className="hidden sm:inline ml-2 text-sm">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={24} />
                    <span className="hidden sm:inline ml-2 text-sm">Upload</span>
                  </>
                )}
              </Button>
            </>
          )}
          <button onClick={onClose} className="text-white p-2 hover:bg-white/10 rounded-lg transition-all duration-300">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Feed */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader className="text-white animate-spin" size={48} />
          </div>
        ) : shorts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <p>No shorts yet</p>
            {user && <p className="text-sm">Be the first to upload!</p>}
          </div>
        ) : (
          shorts.map((short, index) => (
            <div key={short.id} className="h-full w-full snap-start relative flex items-center justify-center bg-black">
              <video
                ref={(el) => {
                  if (el) videoRefs.current[index] = el;
                }}
                src={short.video_url}
                className="max-h-full max-w-full object-contain"
                loop
                autoPlay={index === 0}
                muted={isMuted}
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => {
                  if (index === currentVideoIndex) {
                    (e.target as HTMLVideoElement).play().catch((err) => {
                      console.warn('Autoplay prevented:', err);
                    });
                  }
                }}
              />
              
              {/* Volume Toggle Button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="absolute top-20 right-6 z-20 bg-white/20 hover:bg-white/30 p-3 rounded-full backdrop-blur-md transition-all duration-200 text-white"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
              
              {/* Overlay UI */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent flex justify-between items-end">
                <div className="text-white flex-1 mr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-white/20">
                      {short.user_avatar ? (
                        <img src={short.user_avatar} alt={short.user_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                          {short.user_name?.[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="font-bold">@{short.user_name}</span>
                  </div>
                  <p className="text-sm line-clamp-2">{short.caption}</p>
                </div>

                <div className="flex flex-col gap-6 items-center text-white">
                  <button className="flex flex-col items-center gap-1 hover:scale-110 transition-transform duration-200">
                    <div className="bg-white/10 p-3 rounded-full backdrop-blur-md hover:bg-red-500/30">
                      <Heart size={24} />
                    </div>
                    <span className="text-xs">{short.likes_count}</span>
                  </button>
                  <button className="flex flex-col items-center gap-1 hover:scale-110 transition-transform duration-200">
                    <div className="bg-white/10 p-3 rounded-full backdrop-blur-md hover:bg-blue-500/30">
                      <MessageCircle size={24} />
                    </div>
                    <span className="text-xs">0</span>
                  </button>
                  <button className="flex flex-col items-center gap-1 hover:scale-110 transition-transform duration-200">
                    <div className="bg-white/10 p-3 rounded-full backdrop-blur-md hover:bg-green-500/30">
                      <Share2 size={24} />
                    </div>
                    <span className="text-xs">Share</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

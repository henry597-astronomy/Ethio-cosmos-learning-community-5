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

interface ShortVideoProps {
  short: Short;
  isMuted: boolean;
  onMuteToggle: () => void;
}

function ShortVideo({ short, isMuted, onMuteToggle }: ShortVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.6, // Trigger when 60% of the video is visible
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch((err) => {
            console.warn('Autoplay prevented:', err);
          });
          setIsPlaying(true);
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      });
    }, options);

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, []);

  return (
    <div className="h-full w-full snap-start relative flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={short.video_url}
        className="max-h-full max-w-full object-contain"
        loop
        muted={isMuted}
        playsInline
        preload="auto"
      />
      
      {/* Volume Toggle Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMuteToggle();
        }}
        className="absolute top-20 right-6 z-20 bg-white/20 hover:bg-white/30 p-3 rounded-full backdrop-blur-md transition-all duration-200 text-white"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>
      
      {/* Play/Pause Overlay Indicator (optional, briefly shows when toggled) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/20 p-6 rounded-full backdrop-blur-sm">
            <Loader className="text-white animate-spin" size={48} />
          </div>
        </div>
      )}

      {/* Overlay UI */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent flex justify-between items-end">
        <div className="text-white flex-1 mr-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-white/20">
              {short.user_avatar ? (
                <img src={short.user_avatar} alt={short.user_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                  {short.user_name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <span className="font-bold">@{short.user_name || 'User'}</span>
          </div>
          <p className="text-sm line-clamp-2">{short.caption}</p>
        </div>

        <div className="flex flex-col gap-6 items-center text-white">
          <button className="flex flex-col items-center gap-1 hover:scale-110 transition-transform duration-200">
            <div className="bg-white/10 p-3 rounded-full backdrop-blur-md hover:bg-red-500/30">
              <Heart size={24} />
            </div>
            <span className="text-xs">{short.likes_count || 0}</span>
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
  );
}

export default function ShortsFeed({ onClose }: ShortsFeedProps) {
  const { user } = useAuth();
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchShorts();
  }, []);

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
        user_name: s.user_name || 'User',
        user_avatar: s.user_avatar || undefined,
      }));

      setShorts(formattedShorts);
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
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('shorts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      if (!uploadData) throw new Error('Upload returned no data');

      const { data: { publicUrl } } = supabase.storage
        .from('shorts')
        .getPublicUrl(filePath);

      if (!publicUrl) throw new Error('Failed to get public URL');

      const { error: dbError } = await supabase
        .from('shorts')
        .insert({
          user_id: user.id,
          video_url: publicUrl,
          caption: 'New short',
          is_active: true,
        });

      if (dbError) throw new Error(`Database insert failed: ${dbError.message}`);

      toast.success('Short uploaded successfully!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchShorts();
    } catch (error) {
      console.error('Error uploading short:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload short';
      toast.error(errorMessage);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
              >
                {uploading ? <Loader className="animate-spin" size={24} /> : <Upload size={24} />}
              </Button>
            </>
          )}
          <button onClick={onClose} className="text-white p-2 hover:bg-white/10 rounded-lg transition-all duration-300">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader className="text-white animate-spin" size={48} />
          </div>
        ) : shorts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <p>No shorts yet</p>
          </div>
        ) : (
          shorts.map((short) => (
            <ShortVideo 
              key={short.id} 
              short={short} 
              isMuted={isMuted} 
              onMuteToggle={() => setIsMuted(!isMuted)} 
            />
          ))
        )}
      </div>
    </div>
  );
}

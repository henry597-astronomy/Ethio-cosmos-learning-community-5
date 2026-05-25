import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/supabase';
import type { Short } from '@/types';
import { X, Loader, Heart, MessageCircle, Share2, Upload, Volume2, VolumeX, Trash2, MoreVertical } from 'lucide-react';
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
  isAdmin: boolean;
  onDelete: (id: string) => void;
}

function ShortVideo({ short, isMuted, onMuteToggle, isAdmin, onDelete }: ShortVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleDelete = async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to delete this short video? This action cannot be undone and will permanently remove the video from the system.'
    );
    
    if (!confirmed) {
      setShowMenu(false);
      return;
    }

    setIsDeleting(true);
    setShowMenu(false);
    
    try {
      // Extract the file path from the video URL
      const urlParts = short.video_url.split('/storage/v1/object/public/shorts/');
      if (urlParts.length !== 2) {
        throw new Error('Invalid video URL format');
      }
      const filePath = decodeURIComponent(urlParts[1]);

      // Step 1: Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('shorts')
        .remove([filePath]);

      // Log storage error but continue (file might already be deleted)
      if (storageError) {
        console.warn('Storage deletion warning:', storageError.message);
      }

      // Step 2: Delete from database
      const { error: dbError } = await supabase
        .from('shorts')
        .delete()
        .eq('id', short.id);

      if (dbError) {
        throw new Error(`Database deletion failed: ${dbError.message}`);
      }

      // Step 3: Verify deletion by attempting to fetch the record
      const { data: verifyData, error: verifyError } = await supabase
        .from('shorts')
        .select('id')
        .eq('id', short.id)
        .single();

      if (!verifyError && verifyData) {
        throw new Error('Deletion verification failed: Record still exists in database');
      }

      toast.success('Short video permanently deleted!');
      onDelete(short.id);
    } catch (error) {
      console.error('Error deleting short:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete short';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="h-full w-full snap-start snap-always relative flex items-center justify-center bg-black"
      style={{ scrollSnapStop: 'always' }}
    >
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
      
      {/* Play/Pause Overlay Indicator */}
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
          
          {/* Admin Menu Button */}
          {isAdmin && (
            <div ref={menuRef} className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                disabled={isDeleting}
                className="flex flex-col items-center gap-1 hover:scale-110 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="More options"
              >
                <div className="bg-white/10 p-3 rounded-full backdrop-blur-md hover:bg-gray-500/30">
                  {isDeleting ? (
                    <Loader size={24} className="animate-spin text-white" />
                  ) : (
                    <MoreVertical size={24} className="text-white" />
                  )}
                </div>
              </button>
              
              {/* Dropdown Menu */}
              {showMenu && !isDeleting && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur-md rounded-lg shadow-xl border border-white/10 overflow-hidden z-30 min-w-max">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    disabled={isDeleting}
                    className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/20 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={18} />
                    <span className="text-sm font-medium">Delete Video</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShortsFeed({ onClose }: ShortsFeedProps) {
  const { user, isAdmin } = useAuth();
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
    
    // Security check: only admins can upload
    if (!isAdmin || !user) {
      toast.error('Only administrators can upload shorts.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // File validation
    if (!file) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // File size validation (e.g., max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast.error('Video file is too large. Maximum size is 100MB.');
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
          {/* Only show upload button to admins */}
          {isAdmin && user && (
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
                title="Admin: Upload a new short video"
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
        className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{
          scrollBehavior: 'smooth',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader className="text-white animate-spin" size={48} />
          </div>
        ) : shorts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <p>No shorts yet</p>
            {isAdmin && <p className="text-sm">Admin: Be the first to upload!</p>}
          </div>
        ) : (
          shorts.map((short) => (
            <ShortVideo 
              key={short.id} 
              short={short} 
              isMuted={isMuted} 
              onMuteToggle={() => setIsMuted(!isMuted)}
              isAdmin={isAdmin}
              onDelete={(id) => setShorts(shorts.filter(s => s.id !== id))}
            />
          ))
        )}
      </div>
    </div>
  );
}

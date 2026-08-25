import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/supabase';
import type { Short } from '@/types';
import { getEmbedUrl, getVideoType, resolveVideoUrl } from '@/lib/video-utils';
import { X, Loader, Heart, MessageCircle, Share2, Upload, Volume2, VolumeX, Trash2, MoreVertical, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface ShortsFeedProps {
  onClose: () => void;
}

// Shuffle only when the feed is fetched so the order stays stable while users
// swipe through the current session and changes on the next open/refresh.
function shuffleShorts<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

interface ShortVideoProps {
  short: Short;
  isMuted: boolean;
  onMuteToggle: () => void;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}

interface ShortComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile?: {
    username?: string | null;
    avatar_url?: string | null;
  } | null;
}

function ShortVideo({ short, isMuted, onMuteToggle, isAdmin, onDelete }: ShortVideoProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(short.likes_count || 0);
  const [isLikeSaving, setIsLikeSaving] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ShortComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentsCount, setCommentsCount] = useState(0);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playbackUrl, setPlaybackUrl] = useState(short.video_url);
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const [embedLoadError, setEmbedLoadError] = useState(false);
  const videoType = getVideoType(playbackUrl);
  const embedUrl = getEmbedUrl(playbackUrl);
  const isExternalVideo = videoType === 'youtube' || videoType === 'tiktok' || videoType === 'google-drive';

  useEffect(() => {
    let cancelled = false;
    const sourceUrl = short.video_url.trim();
    setPlaybackUrl(sourceUrl);
    setEmbedLoadError(false);

    if (getVideoType(sourceUrl) === 'tiktok' && !getEmbedUrl(sourceUrl)) {
      setIsResolvingUrl(true);
      resolveVideoUrl(sourceUrl)
        .then((resolvedUrl) => {
          if (!cancelled) setPlaybackUrl(resolvedUrl);
        })
        .catch((error) => {
          console.warn('Could not resolve TikTok share URL:', error);
        })
        .finally(() => {
          if (!cancelled) setIsResolvingUrl(false);
        });
    } else {
      setIsResolvingUrl(false);
    }

    return () => {
      cancelled = true;
    };
  }, [short.video_url]);

  useEffect(() => {
    setLikeCount(short.likes_count || 0);
  }, [short.likes_count]);

  useEffect(() => {
    let cancelled = false;

    const loadInteractionState = async () => {
      const [{ count }, likedResult] = await Promise.all([
        supabase
          .from('short_comments')
          .select('id', { count: 'exact', head: true })
          .eq('short_id', short.id),
        user
          ? supabase
              .from('short_likes')
              .select('short_id')
              .eq('short_id', short.id)
              .eq('user_id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (cancelled) return;
      setCommentsCount(count || 0);
      setIsLiked(Boolean(likedResult.data));
    };

    loadInteractionState().catch((error) => {
      console.warn('Could not load Shorts interaction state:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [short.id, user?.id]);

  useEffect(() => {
    if (isExternalVideo) {
      setIsPlaying(Boolean(embedUrl));
      return;
    }

    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.6,
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
  }, [embedUrl, isExternalVideo]);

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

  const handleLike = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (!user) {
      toast.info('Sign in to like Shorts.');
      return;
    }

    if (isLikeSaving) return;

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikeCount((current) => Math.max(0, current + (nextLiked ? 1 : -1)));
    setIsLikeSaving(true);

    try {
      const result = nextLiked
        ? await supabase.from('short_likes').insert({ short_id: short.id, user_id: user.id })
        : await supabase
            .from('short_likes')
            .delete()
            .eq('short_id', short.id)
            .eq('user_id', user.id);

      if (result.error) throw result.error;
    } catch (error) {
      setIsLiked(!nextLiked);
      setLikeCount((current) => Math.max(0, current + (nextLiked ? -1 : 1)));
      console.error('Error saving Short like:', error);
      toast.error('Could not save your like. Please try again.');
    } finally {
      setIsLikeSaving(false);
    }
  };

  const loadComments = async () => {
    setIsLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('short_comments')
        .select('id, content, created_at, user_id')
        .eq('short_id', short.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data || []) as ShortComment[]);
      setCommentsCount(data?.length || 0);
    } catch (error) {
      console.error('Error loading Short comments:', error);
      toast.error('Could not load comments.');
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleComments = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const nextOpen = !showComments;
    setShowComments(nextOpen);
    if (nextOpen) await loadComments();
  };

  const handleSubmitComment = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!user) {
      toast.info('Sign in to comment on Shorts.');
      return;
    }

    const content = commentText.trim();
    if (!content) return;
    if (content.length > 500) {
      toast.error('Comments must be 500 characters or fewer.');
      return;
    }

    setIsSubmittingComment(true);
    try {
      const { error } = await supabase.from('short_comments').insert({
        short_id: short.id,
        user_id: user.id,
        content,
      });

      if (error) throw error;
      setCommentText('');
      await loadComments();
      toast.success('Comment added.');
    } catch (error) {
      console.error('Error adding Short comment:', error);
      toast.error('Could not add your comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const shareUrl = short.video_url || window.location.href;
    const shareData = {
      title: short.caption || 'EthioCosmos Short',
      text: short.caption || 'Watch this Short on EthioCosmos',
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Short link copied.');
      } else {
        window.prompt('Copy this Short link:', shareUrl);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Error sharing Short:', error);
      toast.error('Could not share this Short.');
    }
  };

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
      // Uploaded files need storage cleanup; embedded social links only need DB cleanup.
      const storageMarker = '/storage/v1/object/public/shorts/';
      const storageIndex = short.video_url.indexOf(storageMarker);
      if (storageIndex >= 0) {
        const filePath = decodeURIComponent(short.video_url.slice(storageIndex + storageMarker.length));
        const { error: storageError } = await supabase.storage
          .from('shorts')
          .remove([filePath]);

        if (storageError) {
          console.warn('Storage deletion warning:', storageError.message);
        }
      }

      // Delete the database record
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
      className="h-full w-full relative flex items-center justify-center bg-black"
      style={{ 
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        flexShrink: 0,
      }}
    >
      {isExternalVideo && embedUrl && !embedLoadError ? (
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          title={short.caption || 'Embedded video'}
          onLoad={() => {
            setEmbedLoadError(false);
            setIsPlaying(true);
          }}
          onError={() => {
            setEmbedLoadError(true);
            setIsPlaying(false);
          }}
        />
      ) : isExternalVideo ? (
        <div className="flex max-w-sm flex-col items-center gap-4 px-8 text-center text-white">
          {isResolvingUrl ? (
            <Loader className="animate-spin" size={44} />
          ) : (
            <>
              <p className="text-sm text-white/80">
                This video link could not be embedded on this device.
              </p>
              <Button
                type="button"
                variant="outline"
                className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                onClick={(event) => {
                  event.stopPropagation();
                  window.open(short.video_url, '_blank', 'noopener,noreferrer');
                }}
              >
                Open original video
              </Button>
            </>
          )}
        </div>
      ) : (
        <div 
          className="relative w-full h-full flex items-center justify-center cursor-pointer"
          onClick={() => {
            if (videoRef.current) {
              if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
              } else {
                videoRef.current.play().catch(() => {});
                setIsPlaying(true);
              }
            }
          }}
        >
          <video
            ref={videoRef}
            src={playbackUrl}
            className="max-h-full max-w-full object-contain"
            loop
            muted={isMuted}
            playsInline
            preload="auto"
          />

          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all">
              <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white shadow-lg">
                <svg className="w-8 h-8 fill-current ml-1" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
          
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
        </div>
      )}
      
      {/* Play/Pause Overlay Indicator */}
      {!isPlaying && !isExternalVideo && (
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

        <div className="flex translate-x-2 flex-col items-center gap-6 text-white">
          <button
            onClick={handleLike}
            disabled={isLikeSaving}
            className="flex flex-col items-center gap-1 hover:scale-110 transition-transform duration-200 disabled:opacity-60"
            aria-label={isLiked ? 'Unlike Short' : 'Like Short'}
          >
            <div className={`p-3 rounded-full backdrop-blur-md transition-colors ${isLiked ? 'bg-red-500/80' : 'bg-white/10 hover:bg-red-500/30'}`}>
              <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
            </div>
            <span className="text-xs">{likeCount}</span>
          </button>
          <button
            onClick={handleComments}
            className="flex flex-col items-center gap-1 hover:scale-110 transition-transform duration-200"
            aria-label="Open comments"
          >
            <div className="bg-white/10 p-3 rounded-full backdrop-blur-md hover:bg-blue-500/30">
              <MessageCircle size={24} />
            </div>
            <span className="text-xs">{commentsCount}</span>
          </button>
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 hover:scale-110 transition-transform duration-200"
            aria-label="Share Short"
          >
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

      {showComments && (
        <div
          className="absolute inset-x-0 bottom-0 z-40 max-h-[65%] min-h-[260px] rounded-t-2xl border-t border-white/10 bg-black/95 p-4 text-white shadow-2xl backdrop-blur-md"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Comments ({commentsCount})</h3>
            <button
              onClick={() => setShowComments(false)}
              className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Close comments"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-3 max-h-[calc(65vh-150px)] min-h-[90px] space-y-3 overflow-y-auto pr-1">
            {isLoadingComments ? (
              <div className="flex items-center justify-center py-8 text-white/70">
                <Loader className="mr-2 animate-spin" size={18} /> Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/60">No comments yet. Start the conversation.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="rounded-xl bg-white/10 px-3 py-2">
                  <div className="mb-1 text-xs font-semibold text-orange-300">
                    {comment.user_id === user?.id ? 'You' : 'Community member'}
                  </div>
                  <p className="break-words text-sm text-white/90">{comment.content}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSubmitComment} className="flex items-center gap-2">
            <input
              value={commentText}
              onChange={(event) => setCommentText(event.target.value.slice(0, 500))}
              placeholder={user ? 'Write a comment...' : 'Sign in to comment'}
              disabled={!user || isSubmittingComment}
              className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/50 focus:border-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              maxLength={500}
              aria-label="Write a comment"
            />
            <Button
              type="submit"
              disabled={!user || !commentText.trim() || isSubmittingComment}
              className="rounded-full bg-orange-500 px-4 text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {isSubmittingComment ? <Loader size={17} className="animate-spin" /> : 'Send'}
            </Button>
          </form>
        </div>
      )}
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
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [videoLink, setVideoLink] = useState('');

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

      setShorts(shuffleShorts(formattedShorts));
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

  const handleAddLink = async () => {
    if (!isAdmin || !user) {
      toast.error('Only administrators can add shorts.');
      return;
    }

    if (!videoLink.trim()) {
      toast.error('Please enter a video link');
      return;
    }

    const sourceType = getVideoType(videoLink.trim());
    if (!['youtube', 'tiktok', 'google-drive'].includes(sourceType)) {
      toast.error('Unsupported video link. Please use YouTube, TikTok, or Google Drive.');
      return;
    }

    try {
      setUploading(true);
      const normalizedVideoLink = await resolveVideoUrl(videoLink.trim());
      if (!getEmbedUrl(normalizedVideoLink)) {
        throw new Error('This link could not be converted to a playable embed.');
      }

      const { error: dbError } = await supabase
        .from('shorts')
        .insert({
          user_id: user.id,
          video_url: normalizedVideoLink,
          caption: 'New short',
          is_active: true,
        });

      if (dbError) throw new Error(`Database insert failed: ${dbError.message}`);

      toast.success('Short added successfully!');
      setVideoLink('');
      setShowLinkInput(false);
      fetchShorts();
    } catch (error) {
      console.error('Error adding short link:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add short link';
      toast.error(errorMessage);
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
                  <Loader className="animate-spin" size={24} />
                ) : (
                  <Upload size={24} />
                )}
                <span className="hidden sm:inline ml-2 text-sm">Upload</span>
              </Button>

              <Button
                onClick={() => setShowLinkInput(!showLinkInput)}
                disabled={uploading}
                variant="ghost"
                className="text-white hover:bg-white/20 transition-all duration-300"
                title="Admin: Add a video link (YouTube/TikTok)"
              >
                <Link size={24} />
                <span className="hidden sm:inline ml-2 text-sm">Link</span>
              </Button>
            </>
          )}
          <button onClick={onClose} className="text-white p-2 hover:bg-white/10 rounded-lg transition-all duration-300">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Link Input Overlay */}
      {showLinkInput && (
        <div className="absolute top-20 left-4 right-4 z-30 bg-gray-900/90 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-2xl animate-in slide-in-from-top-4">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Link size={18} /> Add Video Link
          </h3>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              placeholder="Paste YouTube or TikTok link here..."
              className="bg-slate-800 border border-white/20 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                onClick={handleAddLink}
                disabled={uploading || !videoLink.trim()}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                {uploading ? <Loader className="animate-spin" size={18} /> : 'Add Short'}
              </Button>
              <Button
                onClick={() => setShowLinkInput(false)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
            <p className="text-[10px] text-gray-400">
              Supports YouTube, YouTube Shorts, and TikTok video links.
            </p>
          </div>
        </div>
      )}

      {/* Feed */}
      <div 
        className="flex-1 overflow-y-scroll scrollbar-hide"
        style={{
          scrollBehavior: 'smooth',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'y mandatory',
          scrollPaddingTop: '0px',
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

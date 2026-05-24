import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/supabase';
import { Short } from '@/types';
import { X, Loader, Heart, MessageCircle, Share2, Upload } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchShorts();
  }, []);

  const fetchShorts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shorts')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedShorts = (data || []).map((s: any) => ({
        ...s,
        user_name: s.profiles?.username || 'User',
        user_avatar: s.profiles?.avatar_url,
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
    if (!file || !user) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file');
      return;
    }

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('shorts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('shorts')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('shorts')
        .insert({
          user_id: user.id,
          video_url: publicUrl,
          caption: 'New short',
        });

      if (dbError) throw dbError;

      toast.success('Short uploaded successfully!');
      fetchShorts();
    } catch (error) {
      console.error('Error uploading short:', error);
      toast.error('Failed to upload short');
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
                className="text-white hover:bg-white/20"
              >
                {uploading ? <Loader className="animate-spin" /> : <Upload size={24} />}
              </Button>
            </>
          )}
          <button onClick={onClose} className="text-white p-2">
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
            {user && <p className="text-sm">Be the first to upload!</p>}
          </div>
        ) : (
          shorts.map((short) => (
            <div key={short.id} className="h-full w-full snap-start relative flex items-center justify-center bg-black">
              <video
                src={short.video_url}
                className="max-h-full max-w-full object-contain"
                loop
                autoPlay
                muted
                playsInline
              />
              
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
                  <button className="flex flex-col items-center gap-1">
                    <div className="bg-white/10 p-3 rounded-full backdrop-blur-md">
                      <Heart size={24} />
                    </div>
                    <span className="text-xs">{short.likes_count}</span>
                  </button>
                  <button className="flex flex-col items-center gap-1">
                    <div className="bg-white/10 p-3 rounded-full backdrop-blur-md">
                      <MessageCircle size={24} />
                    </div>
                    <span className="text-xs">0</span>
                  </button>
                  <button className="flex flex-col items-center gap-1">
                    <div className="bg-white/10 p-3 rounded-full backdrop-blur-md">
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

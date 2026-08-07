import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { supabase } from '@/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Send, Trash2, MessageCircle, X, Smile } from 'lucide-react';
import type { ChannelPost, ChannelReaction, ChannelComment, CommentReaction } from '@/types';

interface PostRow {
  id: string;
  message_text: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles?: { username?: string | null; email?: string | null; avatar_url?: string | null; role?: string | null } | null;
}

interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { username?: string | null; email?: string | null; avatar_url?: string | null; role?: string | null } | null;
}

const AVAILABLE_EMOJIS = ['👍', '❤️', '🔥', '🚀', '⭐', '🌌'];

const nameColors = [
  '#FFD700', '#87CEEB', '#FF69B4', '#98FB98', '#DDA0DD',
  '#F0E68C', '#FFB6C1', '#20B2AA', '#FF8C00', '#9370DB',
];

function getNameColor(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return nameColors[hash % nameColors.length];
}

export default function ChatPage() {
  const { user, isAdmin } = useAuth();
  const { resetUnreadCount } = useNotifications();
  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Telegram style comment drawer / modal state
  const [activePostForComments, setActivePostForComments] = useState<ChannelPost | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Comment reaction picker popup state
  const [activeCommentEmojiPicker, setActiveCommentEmojiPicker] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const postsEndRef = useRef<HTMLDivElement>(null);

  const fetchChannelData = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('channel_posts')
        .select(`id, message_text, image_url, created_at, user_id, profiles ( username, email, avatar_url, role )`)
        .order('created_at', { ascending: true });

      if (postsError) {
        console.error('Error fetching channel posts:', postsError);
        setError('Channel tables not initialized yet. Please run migration `supabase/telegram_channel_setup.sql`.');
        return;
      }

      const { data: reactionsData } = await supabase
        .from('channel_reactions')
        .select('*');

      const { data: commentsData } = await supabase
        .from('channel_comments')
        .select(`id, post_id, user_id, content, created_at, profiles ( username, email, avatar_url, role )`)
        .order('created_at', { ascending: true });

      const { data: commentReactionsData } = await supabase
        .from('comment_reactions')
        .select('*');

      const mappedReactions: ChannelReaction[] = reactionsData || [];
      const mappedCommentReactions: CommentReaction[] = commentReactionsData || [];

      const mappedComments: ChannelComment[] = (commentsData as unknown as CommentRow[] || []).map(c => {
        const p = c.profiles;
        const sender_name = p?.username || (p?.email ? p.email.split('@')[0] : 'Unknown');
        const cReactions = mappedCommentReactions.filter(cr => cr.comment_id === c.id);
        return {
          id: c.id,
          post_id: c.post_id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at,
          sender_name,
          sender_avatar: p?.avatar_url ?? undefined,
          sender_role: p?.role ?? 'user',
          sender_email: p?.email ?? undefined,
          reactions: cReactions,
        };
      });

      const mappedPosts: ChannelPost[] = (postsData as unknown as PostRow[] || []).map(row => {
        const profile = row.profiles;
        const sender_name =
          profile?.username ||
          (profile?.email ? profile.email.split('@')[0] : undefined) ||
          'Admin';
        
        const postReactions = mappedReactions.filter(r => r.post_id === row.id);
        const postComments = mappedComments.filter(c => c.post_id === row.id);

        return {
          id: row.id,
          user_id: row.user_id,
          message_text: row.message_text,
          image_url: row.image_url,
          created_at: row.created_at,
          sender_name,
          sender_email: profile?.email ?? undefined,
          sender_avatar: profile?.avatar_url ?? undefined,
          sender_role: profile?.role ?? 'admin',
          reactions: postReactions,
          comments: postComments,
        };
      });

      setPosts(mappedPosts);

      // Keep active comment modal in sync instantly
      setActivePostForComments(prev => {
        if (!prev) return null;
        const updated = mappedPosts.find(p => p.id === prev.id);
        return updated || null;
      });
    } catch (err) {
      console.error('Error loading channel data:', err);
      setError('Failed to load channel data.');
    }
  };

  useEffect(() => {
    if (!user) return;
    resetUnreadCount();
    fetchChannelData();

    // Use multiple independent broadcast channels to guarantee instantaneous real-time events without lag
    const postsChannel = supabase
      .channel('public:channel_posts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channel_posts' },
        () => { fetchChannelData(); }
      )
      .subscribe();

    const reactionsChannel = supabase
      .channel('public:channel_reactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channel_reactions' },
        () => { fetchChannelData(); }
      )
      .subscribe();

    const commentsChannel = supabase
      .channel('public:channel_comments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channel_comments' },
        () => { fetchChannelData(); }
      )
      .subscribe();

    const commentReactionsChannel = supabase
      .channel('public:comment_reactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comment_reactions' },
        () => { fetchChannelData(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(commentReactionsChannel);
    };
  }, [user]);

  const handleCreatePost = async (imagePublicUrl?: string) => {
    if (!isAdmin || (!newPostText.trim() && !imagePublicUrl)) return;
    const text = newPostText.trim();

    try {
      const { error: insertError } = await supabase
        .from('channel_posts')
        .insert({
          user_id: user?.id,
          message_text: text || null,
          image_url: imagePublicUrl || null,
        });

      if (insertError) throw insertError;
      setNewPostText('');
      setError(null);
      fetchChannelData();
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to publish post. Ensure channel tables exist.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin || !user) return;
    setUploading(true);
    setError(null);

    try {
      const filePath = `channel/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('uploads').getPublicUrl(filePath);

      await handleCreatePost(publicUrl);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deletePost = async (postId: string) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from('channel_posts')
        .delete()
        .eq('id', postId);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
      if (activePostForComments?.id === postId) {
        setActivePostForComments(null);
      }
      fetchChannelData();
    } catch (err) {
      console.error('Error deleting post:', err);
      setError('Failed to delete post.');
    }
  };

  const togglePostReaction = async (postId: string, emoji: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const existingReaction = post.reactions.find(
      r => r.post_id === postId && r.user_id === user.id && r.emoji === emoji
    );

    try {
      if (existingReaction) {
        await supabase.from('channel_reactions').delete().eq('id', existingReaction.id);
      } else {
        await supabase.from('channel_reactions').insert({
          post_id: postId,
          user_id: user.id,
          emoji,
        });
      }
      fetchChannelData();
    } catch (err) {
      console.error('Error toggling post reaction:', err);
    }
  };

  const toggleCommentReaction = async (commentId: string, emoji: string) => {
    if (!user) return;
    setActiveCommentEmojiPicker(null);

    const comment = activePostForComments?.comments.find(c => c.id === commentId);
    if (!comment) return;

    const existingReaction = comment.reactions?.find(r => r.user_id === user.id);

    try {
      if (existingReaction) {
        if (existingReaction.emoji === emoji) {
          await supabase.from('comment_reactions').delete().eq('id', existingReaction.id);
        } else {
          await supabase.from('comment_reactions').update({ emoji }).eq('id', existingReaction.id);
        }
      } else {
        await supabase.from('comment_reactions').insert({
          comment_id: commentId,
          user_id: user.id,
          emoji,
        });
      }
      fetchChannelData();
    } catch (err) {
      console.error('Error toggling comment reaction:', err);
    }
  };

  const addComment = async () => {
    if (!user || !activePostForComments || !commentInput.trim()) return;
    const content = commentInput.trim();

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('channel_comments')
        .insert({
          post_id: activePostForComments.id,
          user_id: user.id,
          content,
        });
      if (error) throw error;
      setCommentInput('');
      fetchChannelData();
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('channel_comments').delete().eq('id', commentId);
      if (error) throw error;
      fetchChannelData();
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  if (!user) return null;

  return (
    <div 
      className="fixed inset-0 top-28 flex flex-col bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/images/chat-bg-new.jpg)',
        bottom: 'calc(5rem + max(0px, env(safe-area-inset-bottom)))',
      }}
    >
      <div className="absolute inset-0 bg-black/75"></div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Clean Channel Header */}
        <div className="bg-slate-900/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex-shrink-0 shadow-lg">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                🌌
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Ethio-Cosmos Channel</h1>
                <p className="text-xs text-gray-400">Community Announcements</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border-b border-red-500/50 px-4 py-2 text-red-400 text-xs text-center flex-shrink-0">
            {error}
          </div>
        )}

        {/* Admin Composer */}
        {isAdmin && (
          <div className="bg-slate-900/95 border-b border-white/10 p-4 flex-shrink-0">
            <div className="max-w-3xl mx-auto space-y-3">
              <textarea
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="Write a channel post..."
                rows={3}
                className="w-full bg-slate-800/80 border border-white/10 rounded-xl p-3 text-white placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center justify-between">
                <div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg text-xs font-medium transition-all border border-white/10"
                  >
                    <Paperclip className="w-4 h-4" />
                    {uploading ? 'Uploading...' : 'Attach Image'}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                <Button
                  onClick={() => handleCreatePost()}
                  disabled={!newPostText.trim() || uploading}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Post
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Feed Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6 pb-12">
            {posts.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-white/10 backdrop-blur-sm p-8">
                <span className="text-4xl mb-3 block">📭</span>
                <h3 className="text-white font-semibold text-base mb-1">No channel posts yet</h3>
                <p className="text-gray-400 text-xs max-w-md mx-auto">
                  {isAdmin 
                    ? 'Use the box above to publish your first post!' 
                    : 'Administrators have not posted any updates yet.'}
                </p>
              </div>
            ) : (
              posts.map((post) => {
                const isAdminPost = post.sender_role === 'admin';
                const isActualOwner = post.sender_email === 'henokgirma648@gmail.com';

                return (
                  <div 
                    key={post.id}
                    className="bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden"
                  >
                    {/* Post Header */}
                    <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
                      <div className="flex items-center gap-3">
                        {post.sender_avatar ? (
                          <img 
                            src={post.sender_avatar} 
                            alt={post.sender_name} 
                            className="w-10 h-10 rounded-full border border-white/20 object-cover"
                          />
                        ) : (
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                            style={{ backgroundColor: getNameColor(post.user_id) }}
                          >
                            {post.sender_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {post.sender_name}
                            </span>
                            {isAdminPost && (
                              <span className="text-[10px] bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 uppercase tracking-wider font-bold">
                                {isActualOwner ? 'Owner' : 'Admin'}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400">
                            {formatTime(post.created_at)}
                          </span>
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => deletePost(post.id)}
                          className="text-gray-400 hover:text-red-400 p-2 rounded-lg hover:bg-white/5 transition-colors"
                          title="Delete post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Post Content */}
                    <div className="px-5 py-4 space-y-3">
                      {post.message_text && (
                        <p className="text-sm sm:text-base text-gray-100 whitespace-pre-wrap break-words leading-relaxed">
                          {post.message_text}
                        </p>
                      )}

                      {post.image_url && (
                        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40">
                          <img 
                            src={post.image_url} 
                            alt="Attachment" 
                            className="w-full max-h-96 object-contain mx-auto"
                          />
                        </div>
                      )}
                    </div>

                    {/* Reactions & Telegram Comment Button Footer */}
                    <div className="px-5 py-3 bg-slate-950/40 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                      {/* Post Reactions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {AVAILABLE_EMOJIS.map((emoji) => {
                          const reactionsForEmoji = post.reactions.filter(r => r.emoji === emoji);
                          const count = reactionsForEmoji.length;
                          const hasReacted = reactionsForEmoji.some(r => r.user_id === user.id);

                          return (
                            <button
                              key={emoji}
                              onClick={() => togglePostReaction(post.id, emoji)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                hasReacted 
                                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-sm' 
                                  : 'bg-slate-800/80 text-gray-300 border border-white/10 hover:bg-slate-700'
                              }`}
                            >
                              <span>{emoji}</span>
                              {count > 0 && <span className="font-bold">{count}</span>}
                            </button>
                          );
                        })}
                      </div>

                      {/* Telegram-style Comment Button */}
                      <button
                        onClick={() => setActivePostForComments(post)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-full text-xs font-semibold transition-all shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Comments {post.comments.length > 0 && `(${post.comments.length})`}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={postsEndRef} />
          </div>
        </div>

        {/* Telegram-Style Comment Thread Modal / Drawer */}
        {activePostForComments && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-xl h-[85vh] sm:h-[75vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="px-5 py-4 bg-slate-950/80 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                  <h3 className="text-white font-bold text-sm">
                    Comments ({activePostForComments.comments.length})
                  </h3>
                </div>
                <button
                  onClick={() => { setActivePostForComments(null); setActiveCommentEmojiPicker(null); }}
                  className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Original Post Preview Snippet */}
              <div className="px-5 py-3 bg-slate-800/50 border-b border-white/10 flex-shrink-0 text-xs text-gray-300 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {activePostForComments.sender_name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate flex-1">
                  <span className="font-bold text-white mr-1.5">{activePostForComments.sender_name}:</span>
                  <span className="text-gray-300">{activePostForComments.message_text || 'Photo attachment'}</span>
                </div>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activePostForComments.comments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs italic">
                    No comments yet. Start the conversation!
                  </div>
                ) : (
                  activePostForComments.comments.map((comment) => {
                    const isCommentAuthor = comment.user_id === user.id;
                    const isCommentAdmin = comment.sender_role === 'admin';
                    const userCommentReaction = comment.reactions?.find(r => r.user_id === user.id);

                    return (
                      <div key={comment.id} className="bg-slate-800/60 border border-white/5 rounded-xl p-3.5 space-y-2 group">
                        <div className="flex items-start gap-3">
                          {comment.sender_avatar ? (
                            <img 
                              src={comment.sender_avatar} 
                              alt={comment.sender_name} 
                              className="w-8 h-8 rounded-full border border-white/10 object-cover flex-shrink-0"
                            />
                          ) : (
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                              style={{ backgroundColor: getNameColor(comment.user_id) }}
                            >
                              {(comment.sender_name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-xs text-gray-200" style={{ color: getNameColor(comment.user_id) }}>
                                {comment.sender_name}
                              </span>
                              {isCommentAdmin && (
                                <span className="text-[9px] bg-purple-500/30 text-purple-300 px-1.5 py-0.2 rounded border border-purple-500/30 uppercase tracking-wider font-bold">
                                  Admin
                                </span>
                              )}
                              <span className="text-[10px] text-gray-500 ml-auto">
                                {formatTime(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-gray-200 text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {comment.content}
                            </p>
                          </div>

                          {(isCommentAuthor || isAdmin) && (
                            <button
                              onClick={() => deleteComment(comment.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 p-1"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Comment Reactions */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 pl-11 relative">
                          {AVAILABLE_EMOJIS.map((emoji) => {
                            const matchingReactions = comment.reactions?.filter(r => r.emoji === emoji) || [];
                            if (matchingReactions.length === 0) return null;
                            const hasMyReaction = matchingReactions.some(r => r.user_id === user.id);

                            return (
                              <button
                                key={emoji}
                                onClick={() => toggleCommentReaction(comment.id, emoji)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                                  hasMyReaction
                                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                                    : 'bg-slate-900/80 text-gray-300 border border-white/10 hover:bg-slate-700'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span>{matchingReactions.length}</span>
                              </button>
                            );
                          })}

                          <div className="relative">
                            <button
                              onClick={() => setActiveCommentEmojiPicker(activeCommentEmojiPicker === comment.id ? null : comment.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-900/60 hover:bg-slate-800 text-gray-400 hover:text-white rounded-full text-[11px] border border-white/10 transition-colors"
                              title="React to comment"
                            >
                              <Smile className="w-3 h-3" />
                              {userCommentReaction && <span>{userCommentReaction.emoji}</span>}
                            </button>

                            {activeCommentEmojiPicker === comment.id && (
                              <div className="absolute left-0 bottom-full mb-2 bg-slate-900 border border-white/20 rounded-full shadow-2xl p-1.5 flex items-center gap-1.5 z-20 animate-in fade-in zoom-in duration-150">
                                {AVAILABLE_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => toggleCommentReaction(comment.id, emoji)}
                                    className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center text-sm transition-transform hover:scale-125"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Comment Footer */}
              <div className="p-4 bg-slate-950/90 border-t border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Input
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && addComment()}
                    placeholder="Write a comment..."
                    className="bg-slate-900 border-white/10 text-white placeholder:text-gray-500 h-10 rounded-xl text-xs sm:text-sm px-4 focus:ring-blue-500/50"
                  />
                  <Button
                    onClick={addComment}
                    disabled={!commentInput.trim() || submittingComment}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-5 text-xs sm:text-sm font-bold flex-shrink-0 shadow-md shadow-blue-600/30"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

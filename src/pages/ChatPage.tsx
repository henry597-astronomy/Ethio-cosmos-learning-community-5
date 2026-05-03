import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Send, Trash2 } from 'lucide-react';
import type { ChatMessage } from '@/types';

interface ChatMessageRow {
  id: string;
  message_text: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles?: { username?: string | null; email?: string | null; avatar_url?: string | null; role?: string | null } | null;
}

function rowToMessage(row: ChatMessageRow): ChatMessage {
  const profile = row.profiles ?? null;
  const sender_name =
    profile?.username ||
    (profile?.email ? profile.email.split('@')[0] : undefined) ||
    'Unknown User';
  return {
    id: row.id,
    user_id: row.user_id,
    message_text: row.message_text,
    image_url: row.image_url,
    created_at: row.created_at,
    sender_name,
    sender_email: profile?.email ?? undefined,
    sender_avatar: profile?.avatar_url ?? undefined,
    sender_role: profile?.role ?? 'user',
  };
}

// Color palette for user names
const nameColors = [
  '#FFD700', // Gold
  '#87CEEB', // Sky Blue
  '#FF69B4', // Hot Pink
  '#98FB98', // Pale Green
  '#DDA0DD', // Plum
  '#F0E68C', // Khaki
  '#FFB6C1', // Light Pink
  '#20B2AA', // Light Sea Green
  '#FF8C00', // Dark Orange
  '#9370DB', // Medium Purple
];

function getNameColor(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return nameColors[hash % nameColors.length];
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages and setup real-time subscription
  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('chat_messages')
          .select(
            `id, message_text, image_url, created_at, user_id, profiles ( username, email, avatar_url, role )`
          )
          .order('created_at', { ascending: true });

        if (fetchError) {
          console.error('Error loading messages:', fetchError);
          setError('Failed to load messages. Please refresh.');
          return;
        }

        if (data) {
          setMessages((data as unknown as ChatMessageRow[]).map(rowToMessage));
        }
      } catch (err) {
        console.error('Unexpected error loading messages:', err);
        setError('An unexpected error occurred.');
      }
    };

    fetchMessages();

    // Setup real-time subscription
    const channel = supabase
      .channel('chat-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const m = payload.new as {
            id: string;
            user_id: string;
            message_text: string | null;
            image_url: string | null;
            created_at: string;
          };

          // If it's our own message, we might have already added it optimistically
          // But we need the real ID and timestamp from the server
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, email, avatar_url, role')
            .eq('id', m.user_id)
            .maybeSingle();

          const newMsg = rowToMessage({ ...m, profiles: profileData ?? null });
          setMessages((prev) => {
            // Remove any optimistic message with the same content/temp state if needed
            // For simplicity, we just check by ID
            if (prev.some((msg) => msg.id === newMsg.id)) return prev;
            
            // If we have an optimistic message (temp ID), we should replace it
            // But here we'll just filter out any message that looks like a duplicate
            const filtered = prev.filter(msg => !(msg.user_id === newMsg.user_id && msg.message_text === newMsg.message_text && msg.id.startsWith('temp-')));
            return [...filtered, newMsg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const deletedId = payload.old.id;
          setMessages((prev) => prev.filter((msg) => msg.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;
    const text = newMessage.trim();
    if (text.length > 1000) {
      setError('Message is too long. Maximum 1000 characters.');
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      user_id: user.id,
      message_text: text,
      created_at: new Date().toISOString(),
      sender_name: user.email?.split('@')[0] || 'Me',
      sender_role: 'user',
    };

    // Optimistic update
    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage('');
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          message_text: text,
        });

      if (insertError) {
        console.error('Error sending message:', insertError);
        setError('Failed to send message. Please try again.');
        // Rollback optimistic update
        setMessages((prev) => prev.filter(m => m.id !== tempId));
      }
    } catch (err) {
      console.error('Unexpected error sending message:', err);
      setError('An unexpected error occurred.');
      setMessages((prev) => prev.filter(m => m.id !== tempId));
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return;

    // Optimistic delete
    const originalMessages = [...messages];
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    setDeletingMessageId(messageId);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting message:', deleteError);
        setError('Failed to delete message. Please try again.');
        // Rollback optimistic delete
        setMessages(originalMessages);
      }
    } catch (err) {
      console.error('Unexpected error deleting message:', err);
      setError('An unexpected error occurred.');
      setMessages(originalMessages);
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setError(null);
    try {
      const filePath = `chat-images/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('uploads').getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
        });

      if (insertError) throw insertError;
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  if (!user) return null;

  return (
    <div 
      className="fixed inset-0 top-28 flex flex-col bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/images/chat-bg.jpg)',
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="bg-slate-900/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Community Chat</h1>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live Community
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 mx-4 mt-2 rounded-lg flex-shrink-0">
            {error}
          </div>
        )}

        {/* Messages Container */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4"
        >
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-300">No messages yet. Be the first to say hello! 🌌</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.user_id === user.id;
                const nameColor = getNameColor(msg.user_id);
                const isAdmin = msg.sender_role === 'admin';

                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} max-w-[85%]`}>
                      {/* Avatar */}
                      <div className="flex-shrink-0 mt-auto">
                        {msg.sender_avatar ? (
                          <img 
                            src={msg.sender_avatar} 
                            alt={msg.sender_name} 
                            className="w-10 h-10 rounded-full border-2 border-white/10 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-sm border-2 border-white/10">
                            {msg.sender_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div className="relative group/bubble">
                        <div
                          className={`rounded-2xl px-4 py-2 backdrop-blur-md shadow-lg ${
                            isOwn
                              ? 'bg-[#2b5278]/90 text-white rounded-br-none'
                              : 'bg-[#182533]/90 text-gray-100 rounded-bl-none'
                          }`}
                        >
                          {/* Sender Name & Role */}
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span 
                              className="text-xs font-bold"
                              style={{ color: isOwn ? '#87CEEB' : nameColor }}
                            >
                              {msg.sender_name}
                            </span>
                            {isAdmin && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                Owner
                              </span>
                            )}
                          </div>

                          {/* Message Content */}
                          {msg.image_url ? (
                            <div className="mt-1">
                              <img
                                src={msg.image_url}
                                alt="Shared"
                                className="max-w-sm rounded-lg border border-white/10"
                              />
                            </div>
                          ) : (
                            <p className="text-[15px] leading-relaxed font-normal italic">
                              {msg.message_text}
                            </p>
                          )}

                          {/* Timestamp */}
                          <div className="flex justify-end mt-1">
                            <span className="text-[10px] text-gray-400/80 font-medium">
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Delete Button - Only for own messages */}
                        {isOwn && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            disabled={deletingMessageId === msg.id}
                            className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-red-400 disabled:opacity-50 bg-black/20 rounded-full backdrop-blur-sm"
                            title="Delete message"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Fixed at Bottom */}
        <div className="bg-slate-900/80 backdrop-blur-md border-t border-white/10 p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="icon"
              className="border-white/20 text-gray-300 hover:text-white hover:bg-white/10 flex-shrink-0 rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Paperclip size={20} />
            </Button>
            <Input
              type="text"
              placeholder={uploading ? 'Uploading image...' : 'Type a message...'}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 bg-slate-800/80 border-white/20 text-white placeholder:text-gray-400 rounded-full px-6"
              disabled={uploading}
            />
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white flex-shrink-0 rounded-full w-10 h-10 p-0"
              onClick={sendMessage}
              disabled={!newMessage.trim() || uploading}
            >
              <Send size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

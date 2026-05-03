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
  profiles?: { username?: string | null; email?: string | null; avatar_url?: string | null } | null;
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
            `id, message_text, image_url, created_at, user_id, profiles ( username, email, avatar_url )`
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

    // Setup real-time subscription for INSERT events
    const insertChannel = supabase
      .channel('messages-insert')
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

          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, email, avatar_url')
            .eq('id', m.user_id)
            .maybeSingle();

          const newMsg = rowToMessage({ ...m, profiles: profileData ?? null });
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((msg) => msg.id === newMsg.id)) {
              return prev;
            }
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    // Setup real-time subscription for DELETE events
    const deleteChannel = supabase
      .channel('messages-delete')
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
      insertChannel.unsubscribe();
      deleteChannel.unsubscribe();
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

    // Optimistic UI update
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: user.id,
      message_text: text,
      image_url: null,
      created_at: new Date().toISOString(),
      sender_name: 'You',
      sender_email: user.email,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          message_text: text,
        })
        .select();

      if (insertError) {
        console.error('Error sending message:', insertError);
        setError('Failed to send message. Please try again.');
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
        return;
      }

      // Replace optimistic message with real one from server
      if (data && data[0]) {
        const realMessage = rowToMessage({
          ...data[0],
          profiles: { username: user.user_metadata?.name, email: user.email },
        } as ChatMessageRow);
        setMessages((prev) =>
          prev.map((msg) => (msg.id === optimisticMessage.id ? realMessage : msg))
        );
      }
    } catch (err) {
      console.error('Unexpected error sending message:', err);
      setError('An unexpected error occurred.');
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return;

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
        setDeletingMessageId(null);
        return;
      }

      // Remove message from UI immediately
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (err) {
      console.error('Unexpected error deleting message:', err);
      setError('An unexpected error occurred.');
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

      // Optimistic UI update for image
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        message_text: null,
        image_url: publicUrl,
        created_at: new Date().toISOString(),
        sender_name: 'You',
        sender_email: user.email,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      const { data, error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
        })
        .select();

      if (insertError) throw insertError;

      // Replace optimistic message with real one
      if (data && data[0]) {
        const realMessage = rowToMessage({
          ...data[0],
          profiles: { username: user.user_metadata?.name, email: user.email },
        } as ChatMessageRow);
        setMessages((prev) =>
          prev.map((msg) => (msg.id === optimisticMessage.id ? realMessage : msg))
        );
      }
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
          <div className="max-w-4xl mx-auto space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-300">No messages yet. Be the first to say hello! 🌌</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.user_id === user.id;
                const isTemp = msg.id.startsWith('temp-');
                const nameColor = getNameColor(msg.user_id);

                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} max-w-[85%]`}>
                      {/* Avatar */}
                      {!isOwn && (
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm border-2 border-white/20">
                            {msg.sender_name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div className="relative group/bubble">
                        <div
                          className={`rounded-lg px-4 py-2 backdrop-blur-sm ${
                            isOwn
                              ? 'bg-orange-500/90 text-white rounded-br-none'
                              : 'bg-slate-700/90 text-gray-100 rounded-bl-none'
                          } ${isTemp ? 'opacity-70' : ''}`}
                        >
                          {/* Sender Name - Only for others */}
                          {!isOwn && (
                            <p
                              className="text-xs font-bold mb-1"
                              style={{ color: nameColor }}
                            >
                              {msg.sender_name}
                            </p>
                          )}

                          {/* Message Content */}
                          {msg.image_url ? (
                            <img
                              src={msg.image_url}
                              alt="Shared"
                              className="max-w-sm rounded-lg"
                            />
                          ) : (
                            <p className="text-sm leading-relaxed">{msg.message_text}</p>
                          )}

                          {/* Timestamp */}
                          <p
                            className={`text-xs mt-1 ${
                              isOwn ? 'text-orange-100' : 'text-gray-400'
                            }`}
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        </div>

                        {/* Delete Button - Only for own messages */}
                        {isOwn && !isTemp && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            disabled={deletingMessageId === msg.id}
                            className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 text-gray-300 hover:text-red-400 disabled:opacity-50"
                            title="Delete message"
                          >
                            <Trash2 size={16} />
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
              className="border-white/20 text-gray-300 hover:text-white hover:bg-white/10 flex-shrink-0"
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
              className="flex-1 bg-slate-800/80 border-white/20 text-white placeholder:text-gray-400"
              disabled={uploading}
            />
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white flex-shrink-0"
              onClick={sendMessage}
              disabled={!newMessage.trim() || uploading}
            >
              <Send size={20} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

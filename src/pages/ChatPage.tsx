import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
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
  const { user, profile, displayName } = useAuth();
  const { resetUnreadCount } = useNotifications();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [liveUserCount, setLiveUserCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages and setup real-time subscription
  useEffect(() => {
    if (!user) return;
    
    // Reset unread count when entering chat
    resetUnreadCount();

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
          const mappedMessages = (data as unknown as ChatMessageRow[]).map(rowToMessage);
          setMessages(mappedMessages);
          // Count unique users
          const uniqueUsers = new Set(mappedMessages.map(msg => msg.user_id)).size;
          setLiveUserCount(uniqueUsers);
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
            // Check if message already exists by ID
            if (prev.some((msg) => msg.id === newMsg.id)) return prev;
            
            // Handle optimistic updates:
            // If we find a message from the same user with the same text/image that has a temp ID, replace it
            const optimisticIndex = prev.findIndex(msg => 
              msg.id.startsWith('temp-') && 
              msg.user_id === newMsg.user_id && 
              (newMsg.message_text ? msg.message_text === newMsg.message_text : msg.image_url === newMsg.image_url)
            );

            let updated;
            if (optimisticIndex !== -1) {
              updated = [...prev];
              updated[optimisticIndex] = newMsg;
            } else {
              updated = [...prev, newMsg];
            }

            updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            
            // Update live user count
            const uniqueUsers = new Set(updated.map(msg => msg.user_id)).size;
            setLiveUserCount(uniqueUsers);
            return updated;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const deletedId = payload.old.id;
          setMessages((prev) => {
            const updated = prev.filter((msg) => msg.id !== deletedId);
            // Update live user count
            const uniqueUsers = new Set(updated.map(msg => msg.user_id)).size;
            setLiveUserCount(uniqueUsers);
            return updated;
          });
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
      sender_name: displayName,
      sender_email: user.email || undefined,
      sender_avatar: profile?.avatar_url || undefined,
      sender_role: profile?.role || 'user',
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

    // If it's a temporary message, just remove it from state
    if (messageId.startsWith('temp-')) {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      return;
    }

    // Optimistic delete for server messages
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

    const tempId = `temp-img-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      user_id: user.id,
      message_text: null,
      image_url: URL.createObjectURL(file),
      created_at: new Date().toISOString(),
      sender_name: displayName,
      sender_email: user.email || undefined,
      sender_avatar: profile?.avatar_url || undefined,
      sender_role: profile?.role || 'user',
    };

    // Optimistic update for image
    setMessages((prev) => [...prev, optimisticMsg]);

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
      // Rollback optimistic update
      setMessages((prev) => prev.filter(m => m.id !== tempId));
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
      className="fixed inset-0 top-28 bottom-12 flex flex-col bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/images/chat-bg-new.jpg)',
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
              Live Community ({liveUserCount})
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border-b border-red-500/50 px-4 py-2 text-red-400 text-sm text-center flex-shrink-0">
            {error}
          </div>
        )}

        {/* Messages area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
        >
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg, index) => {
              const isMe = msg.user_id === user.id;
              const showAvatar = index === 0 || messages[index - 1].user_id !== msg.user_id;
              const isAdmin = msg.sender_role === 'admin';
              const isActualOwner = msg.sender_email === 'henokgirma648@gmail.com';
              
              return (
                <div 
                  key={msg.id} 
                  className={`flex items-end gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 mb-1">
                    {showAvatar ? (
                      msg.sender_avatar ? (
                        <img 
                          src={msg.sender_avatar} 
                          alt={msg.sender_name} 
                          className="w-10 h-10 rounded-full border-2 border-white/10 object-cover"
                        />
                      ) : (
                        <div 
                          className="w-10 h-10 rounded-full border-2 border-white/10 flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: getNameColor(msg.user_id) }}
                        >
                          {msg.sender_name.charAt(0).toUpperCase()}
                        </div>
                      )
                    ) : (
                      <div className="w-10" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`max-w-[80%] sm:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {showAvatar && (
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span 
                          className="text-xs font-semibold"
                          style={{ color: isMe ? '#fff' : getNameColor(msg.user_id) }}
                        >
                          {msg.sender_name}
                        </span>
                        {isAdmin && (
                          <span className="text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 uppercase tracking-wider font-bold">
                            {isActualOwner ? 'Owner' : 'Admin'}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div 
                      className={`relative group rounded-2xl px-4 py-2.5 shadow-lg ${
                        isMe 
                          ? 'bg-blue-600/80 text-white rounded-br-none' 
                          : 'bg-slate-800/80 text-gray-100 rounded-bl-none'
                      } backdrop-blur-sm border border-white/5`}
                    >
                      {msg.image_url && (
                        <div className="mb-2 -mx-1 -mt-1">
                          <img 
                            src={msg.image_url} 
                            alt="Shared image" 
                            className="rounded-lg max-w-full h-auto border border-white/10"
                            onLoad={() => {
                              if (messagesEndRef.current) {
                                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                          />
                        </div>
                      )}
                      
                      {msg.message_text && (
                        <p className="text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed">
                          {msg.message_text}
                        </p>
                      )}

                      <div className={`flex items-center gap-2 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] opacity-50 font-medium">
                          {formatTime(msg.created_at)}
                        </span>
                        
                        {isMe && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            disabled={deletingMessageId === msg.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 p-1"
                            title="Delete message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="bg-slate-900/90 backdrop-blur-xl border-t border-white/10 p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all disabled:opacity-50"
                title="Attach image"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              
              <div className="flex-1 relative">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  className="bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 h-11 rounded-full px-5 focus:ring-blue-500/50 focus:border-blue-500/50"
                />
              </div>

              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || uploading}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-11 h-11 p-0 flex items-center justify-center shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

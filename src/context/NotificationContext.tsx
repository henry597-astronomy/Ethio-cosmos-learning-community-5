
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface NotificationContextType {
  unreadCount: number;
  resetUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';

  // Reset unread count when entering chat page
  useEffect(() => {
    if (isChatPage) {
      setUnreadCount(0);
    }
  }, [isChatPage]);

  const showNotification = useCallback((senderName: string, messageText: string | null) => {
    // 1. Browser Notification
    if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      new Notification(`New message from ${senderName}`, {
        body: messageText || 'Sent an image',
        icon: '/manifest.json', // Use app icon
      });
    }

    // 2. In-app Toast (if not on chat page)
    if (!isChatPage) {
      toast(`New message from ${senderName}`, {
        description: messageText || 'Sent an image',
        action: {
          label: 'View',
          onClick: () => window.location.href = '/chat',
        },
      });
    }
  }, [isChatPage]);

  useEffect(() => {
    if (!user) return;

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const newMessage = payload.new as { user_id: string; message_text: string | null; image_url: string | null };
          
          // Don't notify for own messages
          if (newMessage.user_id === user.id) return;

          if (!isChatPage) {
            setUnreadCount((prev) => prev + 1);
          }

          // Fetch sender name
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, email')
            .eq('id', newMessage.user_id)
            .maybeSingle();

          const senderName = profileData?.username || profileData?.email?.split('@')[0] || 'Someone';
          showNotification(senderName, newMessage.message_text);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isChatPage, showNotification]);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, resetUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

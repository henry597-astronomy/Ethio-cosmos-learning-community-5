import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface NotificationContextType {
  unreadCount: number;
  resetUnreadCount: () => void;
  setUnreadCount: (count: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';

  // Update app badge when unread count changes
  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        (navigator as any).setAppBadge(unreadCount);
      } else {
        (navigator as any).clearAppBadge();
      }
    }
  }, [unreadCount]);

  // Reset unread count when entering channel page
  useEffect(() => {
    if (isChatPage) {
      setUnreadCount(0);
    }
  }, [isChatPage]);

  const showNotification = useCallback((senderName: string, messageText: string | null) => {
    // 1. Browser Notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      new Notification(`New announcement from ${senderName}`, {
        body: messageText || 'New channel broadcast',
        icon: '/images/icon-192.png',
        badge: '/images/icon-192.png',
        tag: 'channel-notification',
      });
    }

    // 2. In-app Toast (if not on chat page)
    if (!isChatPage) {
      toast(`New announcement from ${senderName}`, {
        description: messageText || 'New channel broadcast',
        action: {
          label: 'View',
          onClick: () => window.location.href = '/chat',
        },
      });
    }
  }, [isChatPage]);

  // Load initial unread count when user logs in
  useEffect(() => {
    if (!user) return;

    const loadUnreadCount = async () => {
      try {
        const { data: posts, error } = await supabase
          .from('channel_posts')
          .select('user_id')
          .neq('user_id', user.id);

        if (!error && posts) {
          setUnreadCount(posts.length);
        }
      } catch (err) {
        console.error('Error loading channel unread count:', err);
      }
    };

    loadUnreadCount();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Request notification permission
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel('channel-notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'channel_posts' },
        async (payload) => {
          const newPost = payload.new as { user_id: string; message_text: string | null; image_url: string | null };
          
          // Don't notify for own posts
          if (newPost.user_id === user.id) return;

          if (!isChatPage) {
            setUnreadCount((prev) => prev + 1);
          }

          // Fetch sender name
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, email')
            .eq('id', newPost.user_id)
            .maybeSingle();

          const senderName = profileData?.username || profileData?.email?.split('@')[0] || 'Admin';
          showNotification(senderName, newPost.message_text);
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

  const updateUnreadCount = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, resetUnreadCount, setUnreadCount: updateUnreadCount }}>
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

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/supabase';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import {
  addNotificationActionListener,
  checkNativeNotificationPermission,
  requestNativeNotificationPermission,
} from '@/lib/local-notifications';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type AppNotification,
  type NotificationPreferences,
} from '@/types/notifications';

interface NotificationContextType {
  notifications: AppNotification[];
  notificationsLoading: boolean;
  preferences: NotificationPreferences | null;
  nativePermission: 'granted' | 'denied' | 'prompt' | 'unsupported';
  browserPermission: NotificationPermission | 'unsupported';
  unreadCount: number;
  resetUnreadCount: () => void;
  setUnreadCount: (count: number) => void;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (notificationId: string) => Promise<void>;
  markChannelPostNotificationsAsRead: () => Promise<void>;
  savePreferences: (changes: Partial<Omit<NotificationPreferences, 'user_id' | 'updated_at'>>) => Promise<void>;
  requestBrowserNotificationPermission: () => Promise<boolean>;
  requestNativeNotificationPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function getBrowserPermission(): NotificationPermission | 'unsupported' {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

function isNotificationEnabledForType(
  type: AppNotification['notification_type'],
  preferences: NotificationPreferences,
): boolean {
  if (type === 'admin_announcement') return preferences.admin_announcements_enabled;
  if (type === 'channel_post') return preferences.channel_posts_enabled;
  if (type === 'classroom_reminder' || type === 'classroom_live') return preferences.classroom_reminders_enabled;
  return true;
}

function getDefaultPreferences(userId: string): NotificationPreferences {
  return { user_id: userId, ...DEFAULT_NOTIFICATION_PREFERENCES };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [nativePermission, setNativePermission] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('unsupported');
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>(getBrowserPermission());
  const { user } = useAuth();

  const unreadNotificationCount = useMemo(
    () => notifications.reduce((count, notification) => count + (notification.read_at ? 0 : 1), 0),
    [notifications],
  );
  // The global bell counts only durable app notifications. Channel posts have
  // their own unread indicator and must not point to an empty app-notification list.
  const unreadCount = unreadNotificationCount;

  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        (navigator as Navigator & { setAppBadge?: (count: number) => Promise<void> }).setAppBadge?.(unreadCount);
      } else {
        (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.();
      }
    }
  }, [unreadCount]);

  const showBrowserNotification = useCallback((title: string, body: string, tag: string) => {
    if (
      preferences?.browser_notifications_enabled &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      document.visibilityState !== 'visible'
    ) {
      new Notification(title, {
        body,
        icon: '/images/icon-192.png',
        badge: '/images/icon-192.png',
        tag,
      });
    }
  }, [preferences?.browser_notifications_enabled]);

  const showToast = useCallback((title: string, body: string, actionPath?: string | null) => {
    toast(title, {
      description: body,
      action: actionPath
        ? {
            label: 'View',
            onClick: () => {
              window.location.hash = actionPath.startsWith('/') ? `#${actionPath}` : `#/${actionPath}`;
            },
          }
        : undefined,
    });
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    setNotificationsLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_notifications')
        .select('id, user_id, notification_type, title, body, action_path, metadata, dedupe_key, created_at, read_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setNotifications((data || []) as AppNotification[]);
    } catch (error) {
      console.warn('Could not load app notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  }, [user?.id]);

  const refreshPreferences = useCallback(async () => {
    if (!user?.id) {
      setPreferences(null);
      setNativePermission('unsupported');
      return;
    }

    const { data, error } = await supabase
        .from('notification_preferences')
      .select('user_id, classroom_reminders_enabled, admin_announcements_enabled, channel_posts_enabled, browser_notifications_enabled, native_notifications_enabled, reminder_minutes, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      console.warn('Could not load notification preferences:', error.message);
    }
    setPreferences((data as NotificationPreferences | null) || getDefaultPreferences(user.id));
    setBrowserPermission(getBrowserPermission());
    try {
      setNativePermission(await checkNativeNotificationPermission());
    } catch {
      setNativePermission('unsupported');
    }
  }, [user?.id]);

  useEffect(() => {
    void refreshNotifications();
    void refreshPreferences();
  }, [refreshNotifications, refreshPreferences]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`app-notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'app_notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotification = payload.new as AppNotification;
          setNotifications((current) => [newNotification, ...current.filter((item) => item.id !== newNotification.id)].slice(0, 100));
          if (preferences && isNotificationEnabledForType(newNotification.notification_type, preferences)) {
            showBrowserNotification(newNotification.title, newNotification.body, `app-notification-${newNotification.id}`);
            showToast(newNotification.title, newNotification.body, newNotification.action_path);
          }
        },
      )

      .subscribe();

    const actionListener = addNotificationActionListener((actionPath) => {
      if (actionPath) window.location.hash = actionPath.startsWith('/') ? `#${actionPath}` : `#/${actionPath}`;
    });

    return () => {
      supabase.removeChannel(channel);
      void actionListener?.then((listener) => listener.remove());
    };
  }, [user?.id, preferences, showBrowserNotification, showToast]);

  // Kept as no-op compatibility methods for older ChannelPage consumers.
  // Channel-post read state now lives in app_notifications.
  const resetUnreadCount = useCallback(() => undefined, []);
  const updateChannelUnreadCount = useCallback((_count: number) => undefined, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return;
    const readAt = new Date().toISOString();
    const previous = notifications;
    setNotifications((current) => current.map((notification) => (
      notification.id === notificationId ? { ...notification, read_at: readAt } : notification
    )));
    const { error } = await supabase
      .from('app_notifications')
      .update({ read_at: readAt })
      .eq('id', notificationId)
      .eq('user_id', user.id);
    if (error) {
      setNotifications(previous);
      throw error;
    }
  }, [notifications, user?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id || unreadNotificationCount === 0) return;
    const readAt = new Date().toISOString();
    const previous = notifications;
    setNotifications((current) => current.map((notification) => (
      notification.read_at ? notification : { ...notification, read_at: readAt }
    )));
    const { error } = await supabase
      .from('app_notifications')
      .update({ read_at: readAt })
      .eq('user_id', user.id)
      .is('read_at', null);
    if (error) {
      setNotifications(previous);
      throw error;
    }
  }, [notifications, unreadNotificationCount, user?.id]);

  const removeNotification = useCallback(async (notificationId: string) => {
    if (!user?.id) return;
    const previous = notifications;
    const target = previous.find((notification) => notification.id === notificationId);
    if (!target) return;

    setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
    const { error } = await supabase
      .from('app_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id);
    if (error) {
      await refreshNotifications();
      throw error;
    }
  }, [notifications, refreshNotifications, user?.id]);

  const markChannelPostNotificationsAsRead = useCallback(async () => {
    if (!user?.id) return;
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((notification) => (
      notification.notification_type === 'channel_post' && !notification.read_at
        ? { ...notification, read_at: readAt }
        : notification
    )));
    const { error } = await supabase
      .from('app_notifications')
      .update({ read_at: readAt })
      .eq('user_id', user.id)
      .eq('notification_type', 'channel_post')
      .is('read_at', null);
    if (error) {
      await refreshNotifications();
      throw error;
    }
  }, [refreshNotifications, user?.id]);

  const savePreferences = useCallback(async (
    changes: Partial<Omit<NotificationPreferences, 'user_id' | 'updated_at'>>,
  ) => {
    if (!user?.id) return;
    const previous = preferences || getDefaultPreferences(user.id);
    const next = { ...previous, ...changes, user_id: user.id };
    setPreferences(next);
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(next, { onConflict: 'user_id' })
      .select('user_id, classroom_reminders_enabled, admin_announcements_enabled, channel_posts_enabled, browser_notifications_enabled, native_notifications_enabled, reminder_minutes, updated_at')
      .single();
    if (error) {
      setPreferences(previous);
      throw error;
    }
    setPreferences(data as NotificationPreferences);
  }, [preferences, user?.id]);

  const requestBrowserNotificationPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      setBrowserPermission('unsupported');
      return false;
    }
    const result = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
    setBrowserPermission(result);
    if (result === 'granted') {
      await savePreferences({ browser_notifications_enabled: true });
      return true;
    }
    await savePreferences({ browser_notifications_enabled: false });
    return false;
  }, [savePreferences]);

  const requestNativePermission = useCallback(async () => {
    const granted = await requestNativeNotificationPermission();
    setNativePermission(granted ? 'granted' : 'denied');
    await savePreferences({ native_notifications_enabled: granted });
    return granted;
  }, [savePreferences]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        notificationsLoading,
        preferences,
        nativePermission,
        browserPermission,
        unreadCount,
        resetUnreadCount,
        setUnreadCount: updateChannelUnreadCount,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        removeNotification,
        markChannelPostNotificationsAsRead,
        savePreferences,
        requestBrowserNotificationPermission,
        requestNativeNotificationPermission: requestNativePermission,
      }}
    >
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

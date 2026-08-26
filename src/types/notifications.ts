export type AppNotificationType =
  | 'admin_announcement'
  | 'classroom_reminder'
  | 'classroom_live'
  | 'channel_post'
  | 'system';

export interface AppNotification {
  id: string;
  user_id: string;
  notification_type: AppNotificationType;
  title: string;
  body: string;
  action_path?: string | null;
  metadata: Record<string, unknown>;
  dedupe_key?: string | null;
  created_at: string;
  read_at?: string | null;
}

export interface NotificationPreferences {
  user_id: string;
  classroom_reminders_enabled: boolean;
  admin_announcements_enabled: boolean;
  channel_posts_enabled: boolean;
  browser_notifications_enabled: boolean;
  native_notifications_enabled: boolean;
  reminder_minutes: number;
  updated_at?: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'user_id'> = {
  classroom_reminders_enabled: true,
  admin_announcements_enabled: true,
  channel_posts_enabled: true,
  browser_notifications_enabled: false,
  native_notifications_enabled: true,
  reminder_minutes: 15,
};

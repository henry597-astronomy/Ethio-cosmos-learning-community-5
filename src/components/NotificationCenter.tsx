import { useMemo, useState } from 'react';
import { Bell, Check, CheckCheck, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { useNotifications } from '@/context/NotificationContext';
import { useAppLanguage } from '@/context/AppLanguageContext';
import type { AppNotification, AppNotificationType } from '@/types/notifications';
import type { AppCopyKey } from '@/i18n/app-copy';

function notificationLabel(type: AppNotificationType, t: (key: AppCopyKey) => string): string {
  if (type === 'admin_announcement') return t('notificationAdminAnnouncement');
  if (type === 'classroom_reminder') return t('notificationClassroomReminder');
  if (type === 'classroom_live') return t('notificationClassroomLive');
  if (type === 'channel_post') return t('notificationChannelPost');
  return t('notificationSystem');
}

export default function NotificationCenter() {
  const {
    notifications,
    notificationsLoading,
    preferences,
    nativePermission,
    browserPermission,
    unreadCount,
    markAsRead,
    markAllAsRead,
    savePreferences,
    requestBrowserNotificationPermission,
    requestNativeNotificationPermission,
  } = useNotifications();
  const { language, t } = useAppLanguage();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications],
  );

  const goToNotification = async (notification: AppNotification) => {
    try {
      if (!notification.read_at) await markAsRead(notification.id);
    } catch (error) {
      console.warn('Could not mark notification as read:', error);
    }
    if (notification.action_path) {
      setOpen(false);
      window.location.hash = notification.action_path.startsWith('/')
        ? `#${notification.action_path}`
        : `#/${notification.action_path}`;
    }
  };

  const updatePreference = async (changes: Parameters<typeof savePreferences>[0]) => {
    try {
      await savePreferences(changes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('notificationSettingsError'));
    }
  };

  const toggleBrowserNotifications = async (enabled: boolean) => {
    if (!enabled) {
      await updatePreference({ browser_notifications_enabled: false });
      return;
    }
    try {
      const granted = await requestBrowserNotificationPermission();
      if (!granted) toast.error(t('notificationPermissionDenied'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('notificationPermissionDenied'));
    }
  };

  const toggleNativeNotifications = async (enabled: boolean) => {
    if (!enabled) {
      await updatePreference({ native_notifications_enabled: false });
      return;
    }
    try {
      const granted = await requestNativeNotificationPermission();
      if (!granted) toast.error(t('notificationPermissionDenied'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('notificationPermissionDenied'));
    }
  };

  const formatNotificationDate = (date: string) => new Intl.DateTimeFormat(
    language === 'am' ? 'am-ET' : 'en-US',
    { dateStyle: 'medium', timeStyle: 'short' },
  ).format(new Date(date));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('notifications')}
        onClick={() => setOpen(true)}
        className="relative h-10 w-10 rounded-xl border border-white/10 bg-slate-900/50 text-orange-300 hover:bg-white/10 hover:text-orange-200"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full border border-slate-950 bg-orange-500 px-1 text-center text-[10px] font-bold leading-5 text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      <SheetContent side="right" className="w-[92%] sm:max-w-md border-l border-white/10 bg-slate-950 p-0 text-white">
        <SheetHeader className="border-b border-white/10 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between gap-3 pr-7">
            <SheetTitle className="flex items-center gap-2 text-xl font-bold text-white">
              <Bell size={20} className="text-orange-400" />
              {t('notifications')}
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={unreadNotifications === 0}
                onClick={async () => {
                  try {
                    await markAllAsRead();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : t('notificationSettingsError'));
                  }
                }}
                aria-label={t('markAllRead')}
                title={t('markAllRead')}
                className="h-8 shrink-0 px-2 text-xs text-orange-300 hover:bg-orange-500/10 hover:text-orange-200"
              >
                <CheckCheck size={14} className="mr-1" />
                <span className="hidden sm:inline">{t('markAllRead')}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('notificationSettings')}
                onClick={() => setSettingsOpen((value) => !value)}
                className="h-8 w-8 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <Settings2 size={16} />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4" style={{ maxHeight: 'calc(100vh - 92px)' }}>
          {settingsOpen && preferences && (
            <section className="mb-4 space-y-3 rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <div>
                <h2 className="text-sm font-bold text-white">{t('notificationSettings')}</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{t('notificationPermissionHelp')}</p>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                <span className="text-sm text-slate-200">{t('classroomReminders')}</span>
                <Switch
                  checked={preferences.classroom_reminders_enabled}
                  onCheckedChange={(checked) => void updatePreference({ classroom_reminders_enabled: checked })}
                  aria-label={t('classroomReminders')}
                />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                <span className="text-sm text-slate-200">{t('adminAnnouncements')}</span>
                <Switch
                  checked={preferences.admin_announcements_enabled}
                  onCheckedChange={(checked) => void updatePreference({ admin_announcements_enabled: checked })}
                  aria-label={t('adminAnnouncements')}
                />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                <span className="text-sm text-slate-200">{t('channelPosts')}</span>
                <Switch
                  checked={preferences.channel_posts_enabled}
                  onCheckedChange={(checked) => void updatePreference({ channel_posts_enabled: checked })}
                  aria-label={t('channelPosts')}
                />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                <span className="text-sm text-slate-200">{t('browserNotifications')}</span>
                <Switch
                  checked={preferences.browser_notifications_enabled}
                  onCheckedChange={(checked) => void toggleBrowserNotifications(checked)}
                  disabled={browserPermission === 'unsupported'}
                  aria-label={t('browserNotifications')}
                />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                <span className="text-sm text-slate-200">{t('nativeNotifications')}</span>
                <Switch
                  checked={preferences.native_notifications_enabled && nativePermission !== 'denied' && nativePermission !== 'prompt'}
                  onCheckedChange={(checked) => void toggleNativeNotifications(checked)}
                  disabled={nativePermission === 'unsupported'}
                  aria-label={t('nativeNotifications')}
                />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                <span className="text-sm text-slate-200">{t('reminderLeadTime')}</span>
                <select
                  value={preferences.reminder_minutes}
                  onChange={(event) => void updatePreference({ reminder_minutes: Number(event.target.value) })}
                  className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                  aria-label={t('reminderLeadTime')}
                >
                  {[5, 10, 15, 30, 60].map((minutes) => (
                    <option key={minutes} value={minutes}>{minutes} {t('minutes')}</option>
                  ))}
                </select>
              </label>
              <p className="text-[11px] leading-relaxed text-slate-500">
                {browserPermission === 'granted' || nativePermission === 'granted' ? t('notificationPermissionGranted') : t('notificationPermissionStatus')}
              </p>
            </section>
          )}

          {notificationsLoading ? (
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6 text-center text-sm text-slate-400">{t('loading')}</div>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6 text-center">
              <Bell size={24} className="mx-auto mb-2 text-slate-500" />
              <p className="text-sm text-slate-300">{t('noNotifications')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`rounded-xl border p-3 transition-colors ${notification.read_at ? 'border-white/5 bg-slate-900/50' : 'border-orange-500/25 bg-orange-500/[0.08]'}`}
                >
                  <button
                    type="button"
                    onClick={() => void goToNotification(notification)}
                    className="w-full text-left"
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300">
                        {notificationLabel(notification.notification_type, t)}
                      </span>
                      {!notification.read_at && <span className="h-2 w-2 rounded-full bg-orange-400" aria-label={t('unread')} />}
                    </div>
                    <h3 className="text-sm font-semibold text-white">{notification.title}</h3>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{notification.body}</p>
                    <p className="mt-2 text-[10px] text-slate-500">{formatNotificationDate(notification.created_at)}</p>
                  </button>
                  {!notification.read_at && (
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center text-[11px] text-slate-400 hover:text-white"
                      onClick={async () => {
                        try {
                          await markAsRead(notification.id);
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : t('notificationSettingsError'));
                        }
                      }}
                    >
                      <Check size={13} className="mr-1" />
                      {t('markRead')}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

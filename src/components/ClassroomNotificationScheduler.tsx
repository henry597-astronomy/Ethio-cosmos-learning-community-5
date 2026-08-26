import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { getLiveClassrooms } from '@/services/cms';
import {
  clearAllClassroomReminders,
  rescheduleClassroomReminders,
} from '@/lib/local-notifications';

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export default function ClassroomNotificationScheduler() {
  const { user } = useAuth();
  const { preferences } = useNotifications();

  useEffect(() => {
    let disposed = false;

    const sync = async () => {
      if (!user?.id || !preferences) return;
      try {
        if (!preferences.classroom_reminders_enabled || !preferences.native_notifications_enabled) {
          await clearAllClassroomReminders();
          return;
        }
        const classrooms = await getLiveClassrooms(false);
        if (!disposed) await rescheduleClassroomReminders(classrooms, preferences.reminder_minutes);
      } catch (error) {
        // Local reminders are optional; a scheduling failure must never block app content.
        console.warn('Could not synchronize classroom reminders:', error);
      }
    };

    void sync();
    const interval = window.setInterval(() => void sync(), SYNC_INTERVAL_MS);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [preferences, user?.id]);

  return null;
}

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { LiveClassroom } from '@/types';

const CLASSROOM_CHANNEL_ID = 'classroom-reminders';
const CLASSROOM_NOTIFICATION_OFFSET = 410000000;

function notificationId(roomName: string): number {
  let hash = 2166136261;
  for (let index = 0; index < roomName.length; index += 1) {
    hash ^= roomName.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return CLASSROOM_NOTIFICATION_OFFSET + Math.abs(hash % 50000000);
}

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export async function checkNativeNotificationPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (!isNative()) return 'unsupported';
  const result = await LocalNotifications.checkPermissions();
  return result.display === 'granted' || result.display === 'denied'
    ? result.display
    : 'prompt';
}

export async function requestNativeNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false;
  const result = await LocalNotifications.requestPermissions();
  return result.display === 'granted';
}

async function ensureClassroomChannel(): Promise<void> {
  if (!isNative()) return;
  await LocalNotifications.createChannel({
    id: CLASSROOM_CHANNEL_ID,
    name: 'Classroom reminders',
    description: 'Reminders for scheduled EthioCosmos classrooms.',
    importance: 3,
    visibility: 1,
    lights: true,
    lightColor: '#f97316',
    vibration: true,
  });
}

export async function rescheduleClassroomReminders(
  classrooms: LiveClassroom[],
  reminderMinutes: number,
): Promise<void> {
  if (!isNative()) return;
  const permission = await checkNativeNotificationPermission();
  if (permission !== 'granted') return;

  await ensureClassroomChannel();

  const ids = classrooms.map((classroom) => ({ id: notificationId(classroom.room_name) }));
  if (ids.length > 0) {
    await LocalNotifications.cancel({ notifications: ids });
  }

  const now = Date.now();
  const notifications = classrooms.flatMap((classroom) => {
    const startAt = new Date(classroom.scheduled_start_at);
    const reminderAt = new Date(startAt.getTime() - reminderMinutes * 60 * 1000);
    if (!Number.isFinite(startAt.getTime()) || reminderAt.getTime() <= now || startAt.getTime() <= now) {
      return [];
    }

    return [{
      id: notificationId(classroom.room_name),
      title: `Classroom starts in ${reminderMinutes} minutes`,
      body: classroom.title,
      schedule: { at: reminderAt, allowWhileIdle: true },
      channelId: CLASSROOM_CHANNEL_ID,
      extra: { actionPath: '/', roomName: classroom.room_name },
      autoCancel: true,
    }];
  });

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}

export async function clearClassroomReminders(classrooms: LiveClassroom[]): Promise<void> {
  if (!isNative() || classrooms.length === 0) return;
  await LocalNotifications.cancel({
    notifications: classrooms.map((classroom) => ({ id: notificationId(classroom.room_name) })),
  });
}

export async function clearAllClassroomReminders(): Promise<void> {
  if (!isNative()) return;
  const pending = await LocalNotifications.getPending();
  const classroomNotifications = pending.notifications
    .filter(({ id }) => id >= CLASSROOM_NOTIFICATION_OFFSET && id < CLASSROOM_NOTIFICATION_OFFSET + 50000000)
    .map(({ id }) => ({ id }));
  if (classroomNotifications.length > 0) {
    await LocalNotifications.cancel({ notifications: classroomNotifications });
  }
}

export function addNotificationActionListener(
  onOpen: (actionPath: string | null) => void,
): Promise<{ remove: () => Promise<void> }> | null {
  if (!isNative()) return null;
  return LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    const actionPath = typeof event.notification.extra?.actionPath === 'string'
      ? event.notification.extra.actionPath
      : null;
    onOpen(actionPath);
  });
}

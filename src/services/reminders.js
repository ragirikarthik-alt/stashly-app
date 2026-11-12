/**
 * Opt-in daily saving reminder, scheduled entirely on-device.
 *
 * - Uses an inexact, doze-friendly alarm (no exact-alarm permission needed).
 * - Copy is gentle and never guilt-based; it never implies money was saved.
 * - Tapping it opens the Savings Dial (data.action = "save").
 */
import { Platform } from 'react-native';
import notifee, {
  AlarmType,
  AndroidImportance,
  AuthorizationStatus,
  EventType,
  RepeatFrequency,
  TriggerType,
} from 'react-native-notify-kit';

const CHANNEL_ID = 'saving-reminders';
const REMINDER_ID = 'stashly-daily-reminder';

const COPY = [
  { title: 'A moment for future you', body: 'Set a little aside for {goal}? Every bit moves the ring.' },
  { title: 'Stash o’clock', body: 'Even a small amount today brings {goal} closer.' },
  { title: 'Quick check-in', body: 'Put anything aside today? Log it in a swipe.' },
  { title: 'Your goals are waiting', body: '{goal} is {pct}% there. Want to nudge it forward?' },
];

export function formatReminderTime(hour, minute) {
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

async function ensureChannel() {
  return notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Saving reminders',
    description: 'A gentle daily nudge to set money aside',
    importance: AndroidImportance.DEFAULT,
    vibration: true,
  });
}

/** Asks the OS for notification permission (Android 13+/iOS). Returns true when allowed. */
export async function requestReminderPermission() {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

export async function hasReminderPermission() {
  const settings = await notifee.getNotificationSettings();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

/** Next local occurrence of hour:minute (today if still ahead, else tomorrow). */
export function nextOccurrence(hour, minute, now = new Date()) {
  const t = new Date(now);
  t.setHours(hour, minute, 0, 0);
  if (t.getTime() <= now.getTime() + 30 * 1000) {
    t.setDate(t.getDate() + 1);
  }
  return t;
}

function pickCopy(goals, stats) {
  const active = goals.filter(g => g.status === 'ACTIVE');
  const goal = active.length ? active[Math.floor(Math.random() * active.length)] : null;
  const usable = COPY.filter(c => goal || !c.body.includes('{goal}'));
  const c = usable[Math.floor(Math.random() * usable.length)];
  const pct = goal && stats?.get(goal.id) ? stats.get(goal.id).percent : 0;
  const fill = text => text.replace('{goal}', goal ? goal.name : 'your goal').replace('{pct}', String(pct));
  return { title: fill(c.title), body: fill(c.body) };
}

/**
 * (Re)schedules the repeating reminder. Safe to call often: it replaces the
 * existing trigger, which also refreshes the message with current goals.
 */
export async function scheduleDailyReminder({ hour, minute, goals = [], stats }) {
  await ensureChannel();
  await notifee.cancelTriggerNotification(REMINDER_ID);
  const { title, body } = pickCopy(goals, stats);
  const when = nextOccurrence(hour, minute);
  await notifee.createTriggerNotification(
    {
      id: REMINDER_ID,
      title,
      body,
      data: { action: 'save' },
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_notification',
        color: '#167A58',
        pressAction: { id: 'default', launchActivity: 'default' },
      },
      ios: { sound: 'default' },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: when.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
      alarmManager: Platform.OS === 'android' ? { type: AlarmType.SET_AND_ALLOW_WHILE_IDLE } : undefined,
    },
  );
  return when;
}

export async function cancelDailyReminder() {
  try {
    await notifee.cancelTriggerNotification(REMINDER_ID);
  } catch {
    // nothing scheduled
  }
}

export async function cancelAllReminders() {
  try {
    await notifee.cancelAllNotifications();
  } catch {
    // ignore
  }
}

/** Returns "save" when the app was opened by tapping the reminder. */
export async function getLaunchAction() {
  try {
    const initial = await notifee.getInitialNotification();
    return initial?.notification?.data?.action || null;
  } catch {
    return null;
  }
}

export function onReminderPress(handler) {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS && detail?.notification?.data?.action) {
      handler(detail.notification.data.action);
    }
  });
}

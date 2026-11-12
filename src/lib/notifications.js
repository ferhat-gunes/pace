/**
 * PACE Notifications & Friend Nudge Manager
 * Native Web Notifications, Service Worker integration, App Badging API, and Friend Nudge system.
 */

import { playPop, isSoundEnabled } from './soundFx.js';

const REMINDER_KEY = 'pace_reminder_time';
const NOTIFICATIONS_ENABLED_KEY = 'pace_notifications_enabled';
const LAST_REMINDER_DATE_KEY = 'pace_last_reminder_date';
const NUDGES_STORAGE_KEY = 'pace_nudges';

/**
 * Check if the browser supports native Web Notifications
 */
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Check current notification permission: 'default' | 'granted' | 'denied' | 'unsupported'
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'true');
    } else {
      localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'false');
    }
    return permission;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return 'denied';
  }
}

/**
 * Read notification preferences from localStorage
 */
export function getNotificationSettings() {
  if (typeof window === 'undefined') {
    return { enabled: false, reminderTime: '20:00', permission: 'unsupported' };
  }
  const permission = getNotificationPermission();
  const enabledStr = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  const enabled = enabledStr !== null ? enabledStr === 'true' : permission === 'granted';
  const reminderTime = localStorage.getItem(REMINDER_KEY) || '20:00';

  return {
    enabled,
    reminderTime,
    permission,
  };
}

/**
 * Save notification preferences
 */
export function saveNotificationSettings({ enabled, reminderTime }) {
  if (typeof window === 'undefined') return;
  if (enabled !== undefined) {
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
  }
  if (reminderTime) {
    localStorage.setItem(REMINDER_KEY, reminderTime);
  }
}

/**
 * Send a local native notification via Service Worker or Notification API
 */
export async function sendLocalNotification(title, options = {}) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const defaultOptions = {
    icon: '/assets/icons/pace-192.png',
    badge: '/assets/icons/pace-192.png',
    vibrate: [120, 60, 120],
    data: { url: '/' },
    ...options,
  };

  try {
    // Prefer Service Worker registration if active
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, defaultOptions);
        if (isSoundEnabled()) playPop();
        return true;
      }
    }

    // Fallback to standard Notification API
    const notification = new Notification(title, defaultOptions);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    if (isSoundEnabled()) playPop();
    return true;
  } catch (err) {
    console.warn('Error showing notification:', err);
    return false;
  }
}

/**
 * Update PWA App Badge with uncompleted habit count
 */
export function updateAppBadge(count) {
  if (typeof navigator === 'undefined') return;
  try {
    if ('setAppBadge' in navigator && 'clearAppBadge' in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count).catch(() => null);
      } else {
        navigator.clearAppBadge().catch(() => null);
      }
    }
  } catch {}
}

/**
 * Evaluates whether a daily reminder should be triggered right now
 */
export function shouldTriggerDailyReminder({
  enabled,
  reminderTime = '20:00',
  lastReminderDate = null,
  now = new Date(),
  remainingHabitsCount = 0,
}) {
  if (!enabled || remainingHabitsCount <= 0) return false;

  const todayStr = now.toISOString().split('T')[0];
  if (lastReminderDate === todayStr) {
    // Already reminded today
    return false;
  }

  const [reminderHour, reminderMinute] = reminderTime.split(':').map(Number);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Trigger if current time is equal or past the reminder time today
  const isTimeOrLater =
    currentHour > reminderHour ||
    (currentHour === reminderHour && currentMinute >= reminderMinute);

  return isTimeOrLater;
}

/**
 * Check and trigger daily reminder if due
 */
export async function checkAndTriggerDailyReminder(todayHabits = [], checkins = []) {
  if (typeof window === 'undefined') return false;

  const settings = getNotificationSettings();
  if (!settings.enabled || settings.permission !== 'granted') return false;

  const todayStr = new Date().toISOString().split('T')[0];
  const lastReminderDate = localStorage.getItem(LAST_REMINDER_DATE_KEY);

  // Count uncompleted habits for today
  const remainingHabits = todayHabits.filter((h) => {
    const isCompleted = checkins.some(
      (c) => !c.deleted && c.habit_id === h.id && c.habit_date === todayStr && Number(c.value) > 0
    );
    return !isCompleted;
  });

  const shouldTrigger = shouldTriggerDailyReminder({
    enabled: settings.enabled,
    reminderTime: settings.reminderTime,
    lastReminderDate,
    now: new Date(),
    remainingHabitsCount: remainingHabits.length,
  });

  if (shouldTrigger) {
    const count = remainingHabits.length;
    const title = `🎯 PACE: Bugün ${count} hedefin seni bekliyor!`;
    const body =
      count === 1
        ? `"${remainingHabits[0].name}" hedefin henüz tamamlanmadı. Serin bozulmasın!`
        : `Bugün tamamlaman gereken ${count} alışkanlığın var. Ritim bozulmasın!`;

    const sent = await sendLocalNotification(title, {
      body,
      tag: 'pace-daily-reminder',
      data: { url: '/?view=today' },
    });

    if (sent) {
      localStorage.setItem(LAST_REMINDER_DATE_KEY, todayStr);
      return true;
    }
  }

  return false;
}

// -------------------------------------------------------------
// FRIEND NUDGE (DÜRTME) SYSTEM
// -------------------------------------------------------------

export const NUDGE_PRESETS = [
  { emoji: '👉', text: 'Hedefini tamamlamayı unutma!', label: 'Hatırlat' },
  { emoji: '⚡', text: 'Ritim bozulmasın, serin yanmasın!', label: 'Seri Koru' },
  { emoji: '☕', text: 'Mola bitti! Haydi gün bitmeden yapalım!', label: 'Mola Bitti' },
  { emoji: '🔥', text: 'Grup rekoru için sana ihtiyacımız var!', label: 'Grup Rekoru' },
  { emoji: '🎯', text: 'Küçük bir adım bile fark yaratır, haydi!', label: 'Motivasyon' },
];

/**
 * Read all nudges from local storage
 */
export function getAllNudges() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NUDGES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Send a nudge from the current user to a friend
 */
export async function sendNudge({
  targetMember,
  senderUser,
  message,
  emoji = '👉',
  groupId = 'default',
}) {
  const nudges = getAllNudges();
  const senderName =
    senderUser?.email ? senderUser.email.split('@')[0] : 'Arkadaşın';

  const newNudge = {
    id: `nudge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    targetUserId: targetMember.user_id,
    targetDisplayName: targetMember.display_name || 'Arkadaşın',
    senderUserId: senderUser?.id || 'me',
    senderDisplayName: senderName,
    message,
    emoji,
    groupId,
    createdAt: new Date().toISOString(),
    read: false,
  };

  nudges.push(newNudge);
  try {
    localStorage.setItem(NUDGES_STORAGE_KEY, JSON.stringify(nudges));
  } catch (e) {
    console.warn('Could not save nudge to storage', e);
  }

  // Trigger local notification if permitted (simulates incoming push notification)
  if (isNotificationSupported() && Notification.permission === 'granted') {
    sendLocalNotification(`${emoji} ${senderName} seni dürttü!`, {
      body: `"${message}" — Haydi hedefini tamamla!`,
      tag: `pace-nudge-${newNudge.id}`,
      data: { url: '/?view=today' },
    });
  }

  return {
    success: true,
    nudge: newNudge,
    xpBonus: 5, // 5 XP peer bonus for nudging a teammate
  };
}

/**
 * Get active unread nudges for the current user
 */
export function getIncomingNudges(userId) {
  const nudges = getAllNudges();
  const effectiveUserId = userId || 'me';

  return nudges.filter(
    (n) => (n.targetUserId === effectiveUserId || n.targetUserId === 'me') && !n.read
  );
}

/**
 * Mark a nudge as read / dismissed
 */
export function dismissNudge(nudgeId) {
  const nudges = getAllNudges();
  const updated = nudges.map((n) => (n.id === nudgeId ? { ...n, read: true } : n));
  try {
    localStorage.setItem(NUDGES_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated.filter((n) => !n.read);
}

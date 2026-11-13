/**
 * PACE Notifications & Friend Nudge Manager
 * Native Web Notifications, Service Worker integration, App Badging API, and Friend Nudge system.
 */

import { playPop, isSoundEnabled } from './soundFx.js';
import { localDateIso } from './date.js';
import * as api from './api.js';

const REMINDER_KEY = 'pace_reminder_time';
const NOTIFICATIONS_ENABLED_KEY = 'pace_notifications_enabled';
const LAST_REMINDER_DATE_KEY = 'pace_last_reminder_date';
const NUDGES_STORAGE_KEY = 'pace_nudges';
const SETTINGS_V1_KEY = 'pace_notification_settings_v1';

/**
 * Check if the browser supports native Web Notifications
 */
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Check if Web Push API + Service Worker is supported
 */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    isNotificationSupported()
  );
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
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
    saveNotificationSettings({ enabled: permission === 'granted' });
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
    return {
      enabled: false,
      reminderTime: '20:00',
      quietStart: '22:00',
      quietEnd: '08:30',
      socialEnabled: true,
      permission: 'unsupported',
    };
  }
  const permission = getNotificationPermission();
  let v1 = {};
  try {
    const raw = localStorage.getItem(SETTINGS_V1_KEY);
    if (raw) v1 = JSON.parse(raw) || {};
  } catch {}
  const enabledStr = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  const enabled =
    typeof v1.enabled === 'boolean'
      ? v1.enabled
      : enabledStr !== null
      ? enabledStr === 'true'
      : permission === 'granted';
  const reminderTime = v1.reminderTime || localStorage.getItem(REMINDER_KEY) || '20:00';
  const quietStart = v1.quietStart || '22:00';
  const quietEnd = v1.quietEnd || '08:30';
  const socialEnabled = typeof v1.socialEnabled === 'boolean' ? v1.socialEnabled : true;

  return {
    enabled,
    reminderTime,
    quietStart,
    quietEnd,
    socialEnabled,
    permission,
  };
}

/**
 * Save notification preferences
 */
export function saveNotificationSettings({
  enabled,
  reminderTime,
  quietStart,
  quietEnd,
  socialEnabled,
}) {
  if (typeof window === 'undefined') return;
  const current = getNotificationSettings();
  const next = {
    enabled: enabled !== undefined ? Boolean(enabled) : current.enabled,
    reminderTime: reminderTime || current.reminderTime,
    quietStart: quietStart || current.quietStart,
    quietEnd: quietEnd || current.quietEnd,
    socialEnabled: socialEnabled !== undefined ? Boolean(socialEnabled) : current.socialEnabled,
  };
  try {
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, next.enabled ? 'true' : 'false');
    localStorage.setItem(REMINDER_KEY, next.reminderTime);
    localStorage.setItem(SETTINGS_V1_KEY, JSON.stringify(next));
  } catch {}
}

export function isWithinQuietHours(hhmm, quietStart = '22:00', quietEnd = '08:30') {
  if (!hhmm || !quietStart || !quietEnd) return false;
  if (quietStart <= quietEnd) {
    return hhmm >= quietStart && hhmm <= quietEnd;
  }
  return hhmm >= quietStart || hhmm <= quietEnd;
}

export async function getCurrentPushSubscription() {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function syncPushPreferences(settings = getNotificationSettings()) {
  if (typeof window === 'undefined' || api.isDemo()) return { ok: true, demo: true };
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul';
    await api.updatePushPreferences({
      timezone: tz,
      reminder_time: settings.reminderTime,
      quiet_start: settings.quietStart,
      quiet_end: settings.quietEnd,
      daily_enabled: settings.enabled,
      social_enabled: settings.socialEnabled,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

export async function subscribeWebPush(settings = getNotificationSettings()) {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported' };
  }
  const perm = Notification.permission === 'granted' ? 'granted' : await requestNotificationPermission();
  if (perm !== 'granted') {
    return { ok: false, reason: perm };
  }
  try {
    const keyRes = await api.getPushPublicKey().catch(() => null);
    const publicKey = keyRes?.public_key;
    if (!publicKey) {
      // VAPID keys not configured on server; local reminders still work
      return { ok: false, reason: 'vapid_missing' };
    }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul';
    await api.subscribePush({
      subscription: sub.toJSON(),
      timezone: tz,
      reminder_time: settings.reminderTime,
      quiet_start: settings.quietStart,
      quiet_end: settings.quietEnd,
      daily_enabled: settings.enabled,
      social_enabled: settings.socialEnabled,
    });
    return { ok: true, subscription: sub };
  } catch (err) {
    console.warn('Web Push subscribe failed:', err);
    return { ok: false, reason: 'subscribe_error', error: err?.message };
  }
}

export async function unsubscribeWebPush() {
  if (!isPushSupported()) return { ok: true };
  try {
    const sub = await getCurrentPushSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe().catch(() => {});
      await api.unsubscribePush(endpoint).catch(() => {});
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
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
  quietStart = null,
  quietEnd = null,
  lastReminderDate = null,
  now = new Date(),
  remainingHabitsCount = 0,
}) {
  if (!enabled || remainingHabitsCount <= 0) return false;

  const todayStr = localDateIso(now);
  if (lastReminderDate === todayStr) {
    // Already reminded today
    return false;
  }

  const [reminderHour, reminderMinute] = reminderTime.split(':').map(Number);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentHHMM = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

  if (quietStart && quietEnd && isWithinQuietHours(currentHHMM, quietStart, quietEnd)) {
    return false;
  }

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

  const todayStr = localDateIso();
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
    quietStart: settings.quietStart,
    quietEnd: settings.quietEnd,
    lastReminderDate,
    now: new Date(),
    remainingHabitsCount: remainingHabits.length,
  });

  if (shouldTrigger) {
    const count = remainingHabits.length;
    const title = `🎯 PACE: Bugün ${count} hedefin seni bekliyor!`;
    const body =
      count === 1
        ? `"${remainingHabits[0].name}" bugün seni bekliyor. Küçük bir adım yeterli.`
        : `Bugün ${count} rutinin seni bekliyor. Kendi ritminde devam et!`;

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
// FRIEND NUDGE (NAZİK YOKLAMA) & CHEER SYSTEM
// -------------------------------------------------------------

export const NUDGE_PRESETS = [
  { emoji: '☕', text: 'Bugün küçük bir adım atmak ister misin?', label: 'Nazik Yokla' },
  { emoji: '⚡', text: 'Ritim bozulmasın, yanındayız!', label: 'Seri Koru' },
  { emoji: '👉', text: 'Hedefini tamamlamayı unutma!', label: 'Hatırlat' },
  { emoji: '🔥', text: 'Grup olarak bugün de güzel bir gün çıkaralım!', label: 'Grup Ruhu' },
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
 * Send a gentle nudge or cheer to a friend (real backend API + offline/demo fallback)
 */
export async function sendNudge({
  targetMember,
  senderUser,
  message,
  emoji = '👉',
  groupId = 'default',
  reactionType = 'nudge',
}) {
  const habitDate = localDateIso();
  if (groupId && groupId !== 'default' && targetMember?.user_id) {
    try {
      const res = await api.sendGroupReaction(groupId, {
        target_user_id: targetMember.user_id,
        reaction_type: reactionType,
        emoji,
        message,
        habit_date: habitDate,
      });
      if (res?.reaction) {
        return {
          success: true,
          nudge: res.reaction,
          xpBonus: reactionType === 'cheer' ? 10 : 5,
          synced: true,
        };
      }
    } catch (err) {
      if (err?.status === 429) {
        return { success: false, error: err.message, xpBonus: 0 };
      }
      console.warn('Backend reaction fallback:', err);
    }
  }

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
    reactionType,
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

  return {
    success: true,
    nudge: newNudge,
    xpBonus: reactionType === 'cheer' ? 10 : 5,
    synced: false,
  };
}

/**
 * Get active unread local nudges for the current user
 */
export function getIncomingNudges(userId) {
  const nudges = getAllNudges();
  const effectiveUserId = userId || 'me';

  return nudges.filter(
    (n) => (n.targetUserId === effectiveUserId || n.targetUserId === 'me') && !n.read
  );
}

/**
 * Fetch unread social inbox from server + local storage
 */
export async function fetchSocialInbox(userId) {
  const localItems = getIncomingNudges(userId);
  if (!userId || api.isDemo()) {
    return localItems;
  }
  try {
    const res = await api.getSocialInbox();
    const serverItems = Array.isArray(res?.items) ? res.items : [];
    const seenIds = new Set(serverItems.map((i) => i.id));
    return [...serverItems, ...localItems.filter((i) => !seenIds.has(i.id))];
  } catch {
    return localItems;
  }
}

/**
 * Mark a nudge/inbox item as read / dismissed
 */
export function dismissNudge(nudgeId) {
  if (nudgeId && !String(nudgeId).startsWith('nudge-')) {
    api.markSocialInboxRead(nudgeId).catch(() => {});
  }
  const nudges = getAllNudges();
  const updated = nudges.map((n) => (n.id === nudgeId ? { ...n, read: true } : n));
  try {
    localStorage.setItem(NUDGES_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated.filter((n) => !n.read);
}

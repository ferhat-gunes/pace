import { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../lib/api';
import { isPlannedOn } from '../lib/rules';
import { localDateIso } from '../lib/date';

const LOCAL_STORAGE_KEY = 'pace_local_drafts';
const QUEUE_KEY = 'pace_pending_mutations';

function enqueueMutation(mutation) {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push(mutation);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export function useHabits() {
  const [selectedDate, setSelectedDate] = useState(() => localDateIso());
  const [habits, setHabits] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [groups, setGroups] = useState(() => {
    try {
      const saved = localStorage.getItem('pace_groups_cache');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [user, setUser] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [serverGamification, setServerGamification] = useState(null);
  const [weekStart, setWeekStart] = useState(() => {
    try {
      const saved = localStorage.getItem('pace_week_start');
      return saved !== null ? Number(saved) : 1;
    } catch {
      return 1;
    }
  });
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState('Hazır');
  const [filterMode, setFilterMode] = useState('planned'); // 'planned' | 'all'
  const [lastArchivedHabit, setLastArchivedHabit] = useState(null);
  const [checkinErrors, setCheckinErrors] = useState({});

  const readLocalDrafts = useCallback(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.habits)) setHabits(parsed.habits);
        if (Array.isArray(parsed.checkins)) setCheckins(parsed.checkins);
      }
    } catch {}
  }, []);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setSyncState('Yükleniyor…');
      const data = await api.request('habits');
      if (data) {
        setAuthRequired(false);
        setGuestMode(false);
        setHabits(data.habits || []);
        setCheckins(data.checkins || []);
        if (data.gamification) {
          setServerGamification(data.gamification);
        }
        if (data.user) {
          setUser(data.user);
          if (data.user.week_start !== undefined) {
            setWeekStart(Number(data.user.week_start));
          }
        }
      }

      const groupsData = await api.request('groups').catch(() => null);
      if (groupsData && groupsData.groups) {
        setGroups(groupsData.groups);
        try {
          localStorage.setItem('pace_groups_cache', JSON.stringify(groupsData.groups));
        } catch {}
      }
      setSyncState('Kaydedildi');
    } catch (err) {
      if (err?.status === 401) {
        setUser(null);
        setAuthRequired(true);
        setGuestMode(true);
        readLocalDrafts();
        setSyncState('Yerel mod');
        return;
      }
      console.warn('Network load fallback:', err);
      readLocalDrafts();
      setSyncState('Çevrimdışı mod');
    } finally {
      setLoading(false);
    }
  }, [readLocalDrafts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save local cache for offline / guest resilience
  useEffect(() => {
    if (loading) return;
    if (habits.length > 0 || checkins.length > 0 || guestMode) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ habits, checkins }));
      } catch (e) {}
    }
  }, [habits, checkins, guestMode, loading]);

  // Migrate local guest data to cloud right after sign-in / registration
  const migrateGuestToCloud = useCallback(async () => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      const parsed = cached ? JSON.parse(cached) : null;
      const guestHabits = Array.isArray(parsed?.habits) && parsed.habits.length > 0 ? parsed.habits : habits;
      const guestCheckins = Array.isArray(parsed?.checkins) && parsed.checkins.length > 0 ? parsed.checkins : checkins;
      if (guestMode && guestHabits.length > 0 && !api.isDemo()) {
        await api.importData({
          habits: guestHabits,
          checkins: guestCheckins,
          week_start: weekStart,
        }).catch(() => {});
      }
    } catch {}
    await loadData();
  }, [guestMode, habits, checkins, weekStart, loadData]);

  // Auto-flush pending mutations when returning online
  const flushPending = useCallback(async () => {
    if (guestMode && !api.isDemo()) return;
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (!raw) return;
      const queue = JSON.parse(raw);
      if (!Array.isArray(queue) || !queue.length) return;
      setSyncState('Eşitleniyor…');
      const idRemap = {};

      while (queue.length > 0) {
        const item = queue[0];
        const type = item.type || 'checkin';
        try {
          if (type === 'checkin') {
            const targetHabitId = idRemap[item.habitId] || item.habitId;
            await api.request(`habits/${targetHabitId}/check-ins/${item.date}`, {
              method: 'PUT',
              body: JSON.stringify({
                value: item.value,
                expected_revision: item.expectedRevision,
                idempotency_key: item.idempotencyKey,
              }),
            });
          } else if (type === 'add_habit') {
            const res = await api.request('habits', {
              method: 'POST',
              body: JSON.stringify(item.payload),
            });
            if (res?.habit?.id && item.tempId) {
              idRemap[item.tempId] = res.habit.id;
            }
          } else if (type === 'update_habit') {
            const targetHabitId = idRemap[item.habitId] || item.habitId;
            await api.request(`habits/${targetHabitId}`, {
              method: 'PATCH',
              body: JSON.stringify(item.payload),
            });
          } else if (type === 'archive_habit') {
            const targetHabitId = idRemap[item.habitId] || item.habitId;
            await api.request(`habits/${targetHabitId}/archive`, { method: 'POST' });
          } else if (type === 'restore_habit') {
            const targetHabitId = idRemap[item.habitId] || item.habitId;
            await api.request(`habits/${targetHabitId}/restore`, { method: 'POST' });
          } else if (type === 'week_start') {
            await api.request('account/preferences', {
              method: 'PATCH',
              body: JSON.stringify({ week_start: item.weekStart }),
            });
          }
          queue.shift();
          localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        } catch (err) {
          if (err?.status && err.status >= 400 && err.status < 500 && err.status !== 408 && err.status !== 429) {
            queue.shift();
            localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
            continue;
          }
          break;
        }
      }

      if (queue.length === 0) {
        localStorage.removeItem(QUEUE_KEY);
        setSyncState('Kaydedildi');
        await loadData();
      }
    } catch (e) {
      console.warn('Failed to flush queue:', e);
    }
  }, [guestMode, loadData]);

  useEffect(() => {
    window.addEventListener('online', flushPending);
    return () => window.removeEventListener('online', flushPending);
  }, [flushPending]);

  const clearCheckinError = useCallback((habitId) => {
    setCheckinErrors((prev) => {
      if (!prev[habitId]) return prev;
      const next = { ...prev };
      delete next[habitId];
      return next;
    });
  }, []);

  // Log a checkin for a habit on selectedDate
  const logCheckin = useCallback(async (habitId, value, targetDate = selectedDate) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    clearCheckinError(habitId);

    let expectedRevision = 0;
    const existing = checkins.find((c) => c.habit_id === habitId && c.habit_date === targetDate);
    if (existing) {
      expectedRevision = Number(existing.revision || 0);
    }

    setCheckins((prev) => {
      const idx = prev.findIndex((c) => c.habit_id === habitId && c.habit_date === targetDate);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], value, deleted: 0, updated_at: new Date().toISOString() };
        return next;
      }
      return [
        ...prev,
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          habit_id: habitId,
          habit_date: targetDate,
          value,
          revision: 0,
          created_at: new Date().toISOString(),
        },
      ];
    });

    if (guestMode && !api.isDemo()) {
      setSyncState('Cihazda kaydedildi');
      return;
    }

    const idempotencyKey = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    try {
      setSyncState('Kaydediliyor…');
      const res = await api.request(`habits/${habitId}/check-ins/${targetDate}`, {
        method: 'PUT',
        body: JSON.stringify({
          value,
          expected_revision: expectedRevision,
          idempotency_key: idempotencyKey,
        }),
      });
      if (res?.checkin) {
        setCheckins((prev) => {
          const idx = prev.findIndex((c) => c.habit_id === habitId && c.habit_date === targetDate);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...res.checkin };
            return next;
          }
          return [...prev, res.checkin];
        });
      }
      setSyncState('Kaydedildi');
    } catch (err) {
      if (err?.status === 409) {
        setCheckinErrors((prev) => ({
          ...prev,
          [habitId]: { message: err.message || 'Kayıt başka bir cihazda değişti.', value },
        }));
        setSyncState('Çakışma');
        await loadData();
        return;
      }
      if (err?.status && err.status >= 400 && err.status < 500) {
        setCheckinErrors((prev) => ({
          ...prev,
          [habitId]: { message: err.message || 'Kayıt sunucuya gönderilemedi.', value },
        }));
        setSyncState('Hata');
        return;
      }
      console.warn('Sync queued locally:', err);
      enqueueMutation({
        type: 'checkin',
        habitId,
        date: targetDate,
        value,
        expectedRevision,
        idempotencyKey,
      });
      setSyncState('Çevrimdışı kaydedildi');
    }
  }, [habits, checkins, selectedDate, guestMode, clearCheckinError, loadData]);

  // Add a new habit
  const addHabit = useCallback(async (habitData) => {
    const tempId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newHabit = {
      id: tempId,
      created_at: new Date().toISOString(),
      start_date: selectedDate,
      paused: false,
      archived_at: null,
      direction: 'at_least',
      ...habitData,
    };

    setHabits((prev) => [newHabit, ...prev]);

    if (guestMode && !api.isDemo()) {
      setSyncState('Cihazda kaydedildi');
      return newHabit;
    }

    setSyncState('Kaydediliyor…');
    try {
      const res = await api.request('habits', {
        method: 'POST',
        body: JSON.stringify(newHabit),
      });
      if (res?.habit?.id) {
        const realId = res.habit.id;
        setHabits((prev) => prev.map((h) => (h.id === tempId ? { ...h, id: realId } : h)));
        setCheckins((prev) => prev.map((c) => (c.habit_id === tempId ? { ...c, habit_id: realId } : c)));
      }
      setSyncState('Kaydedildi');
    } catch (err) {
      console.warn('Habit queued locally:', err);
      enqueueMutation({ type: 'add_habit', tempId, payload: newHabit });
      setSyncState('Çevrimdışı kaydedildi');
    }
    return newHabit;
  }, [selectedDate, guestMode]);

  // Update an existing habit (from today)
  const updateHabit = useCallback(async (habitId, habitData) => {
    const effective = localDateIso();
    const payload = { ...habitData, effective_from: effective };
    setHabits((prev) =>
      prev.map((h) => (h.id === habitId ? { ...h, ...habitData, updated_at: new Date().toISOString() } : h))
    );

    if (guestMode && !api.isDemo()) {
      setSyncState('Cihazda kaydedildi');
      return;
    }

    setSyncState('Kaydediliyor…');
    try {
      await api.request(`habits/${habitId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setSyncState('Kaydedildi');
    } catch (err) {
      console.warn('Update habit queued locally:', err);
      enqueueMutation({ type: 'update_habit', habitId, payload });
      setSyncState('Çevrimdışı kaydedildi');
    }
  }, [guestMode]);

  // Toggle pause state on a habit
  const togglePauseHabit = useCallback(async (habitId) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const nextPaused = !habit.paused;
    await updateHabit(habitId, { paused: nextPaused });
  }, [habits, updateHabit]);

  // Archive a habit (with undo support)
  const archiveHabit = useCallback(async (habitId) => {
    const habitToArchive = habits.find((h) => h.id === habitId);
    if (!habitToArchive) return;

    setLastArchivedHabit(habitToArchive);
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId ? { ...h, archived_at: new Date().toISOString() } : h
      )
    );

    if (guestMode && !api.isDemo()) {
      setSyncState('Cihazda kaydedildi');
      return;
    }

    setSyncState('Kaydediliyor…');
    try {
      await api.request(`habits/${habitId}/archive`, { method: 'POST' });
      setSyncState('Kaydedildi');
    } catch (err) {
      console.warn('Archive offline:', err);
      enqueueMutation({ type: 'archive_habit', habitId });
      setSyncState('Çevrimdışı kaydedildi');
    }
  }, [habits, guestMode]);

  // Restore/unarchive a habit
  const restoreHabit = useCallback(async (habitId) => {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId ? { ...h, archived_at: null, paused: false } : h
      )
    );
    setLastArchivedHabit(null);

    if (guestMode && !api.isDemo()) {
      setSyncState('Cihazda kaydedildi');
      return;
    }

    setSyncState('Kaydediliyor…');
    try {
      await api.request(`habits/${habitId}/restore`, { method: 'POST' });
      setSyncState('Kaydedildi');
    } catch (err) {
      console.warn('Restore offline:', err);
      enqueueMutation({ type: 'restore_habit', habitId });
      setSyncState('Çevrimdışı kaydedildi');
    }
  }, [guestMode]);

  // Update week start setting
  const updateWeekStart = useCallback(async (newStart) => {
    const startNum = Number(newStart) === 0 ? 0 : 1;
    setWeekStart(startNum);
    try {
      localStorage.setItem('pace_week_start', String(startNum));
    } catch (e) {}

    if (guestMode && !api.isDemo()) return;

    try {
      await api.request('account/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ week_start: startNum }),
      });
    } catch (err) {
      console.warn('Preferences update queued:', err);
      enqueueMutation({ type: 'week_start', weekStart: startNum });
    }
  }, [guestMode]);

  // Import backup data
  const importBackup = useCallback(async (jsonData) => {
    if (guestMode && !api.isDemo()) {
      if (Array.isArray(jsonData?.habits)) setHabits(jsonData.habits);
      if (Array.isArray(jsonData?.checkins)) setCheckins(jsonData.checkins);
      setSyncState('Cihazda kaydedildi');
      return { success: true, count: jsonData?.habits?.length || 0 };
    }
    setSyncState('İçe aktarılıyor…');
    try {
      const res = await api.importData(jsonData);
      if (res?.ok) {
        await loadData();
        setSyncState('Kaydedildi');
        return { success: true, count: res.habits_count || jsonData.habits?.length || 0 };
      }
      return { success: false, error: 'İçe aktarma başarısız.' };
    } catch (err) {
      console.error('Import error:', err);
      setSyncState('Hata');
      return { success: false, error: err.message };
    }
  }, [guestMode, loadData]);

  // Filtered habits for today view
  const todayHabits = useMemo(() => {
    return habits
      .filter((h) => !h.archived_at)
      .filter((h) => {
        if (filterMode === 'all') return true;
        return isPlannedOn(h, selectedDate, checkins, weekStart);
      });
  }, [habits, selectedDate, filterMode, checkins, weekStart]);

  // Calculate today completion
  const completionStats = useMemo(() => {
    if (todayHabits.length === 0) return { completed: 0, total: 0, percentage: 0 };
    let completed = 0;
    todayHabits.forEach((h) => {
      const c = checkins.find((log) => !log.deleted && log.habit_id === h.id && log.habit_date === selectedDate);
      const val = c ? Number(c.value) : 0;
      const target = Number(h.target) || 1;
      if (h.tracking === 'check') {
        if (val >= 1) completed++;
      } else if (h.direction === 'at_most') {
        if (c && val <= target) completed++;
      } else if (val >= target) {
        completed++;
      }
    });
    return {
      completed,
      total: todayHabits.length,
      percentage: Math.round((completed / todayHabits.length) * 100),
    };
  }, [todayHabits, checkins, selectedDate]);

  return {
    habits,
    checkins,
    groups,
    user,
    setUser,
    authRequired,
    setAuthRequired,
    guestMode,
    serverGamification,
    migrateGuestToCloud,
    weekStart,
    updateWeekStart,
    loading,
    syncState,
    selectedDate,
    setSelectedDate,
    filterMode,
    setFilterMode,
    todayHabits,
    completionStats,
    checkinErrors,
    clearCheckinError,
    logCheckin,
    addHabit,
    updateHabit,
    togglePauseHabit,
    archiveHabit,
    restoreHabit,
    lastArchivedHabit,
    setLastArchivedHabit,
    importBackup,
    loadData,
  };
}

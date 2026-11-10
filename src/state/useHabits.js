import { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../lib/api';
import { isPlannedOn } from '../lib/rules';

const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const LOCAL_STORAGE_KEY = 'pace_local_drafts';

export function useHabits() {
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [habits, setHabits] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [groups, setGroups] = useState([]);
  const [user, setUser] = useState(null);
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

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setSyncState('Yükleniyor…');
      const data = await api.request('habits');
      if (data) {
        setHabits(data.habits || []);
        setCheckins(data.checkins || []);
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
      }
      setSyncState('Kaydedildi');
    } catch (err) {
      console.warn('Network load fallback:', err);
      // Fallback to local storage if available
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.habits) setHabits(parsed.habits);
          if (parsed.checkins) setCheckins(parsed.checkins);
        }
      } catch (e) {}
      setSyncState('Çevrimdışı mod');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save local cache for offline resilience
  useEffect(() => {
    if (habits.length > 0 || checkins.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ habits, checkins }));
      } catch (e) {}
    }
  }, [habits, checkins]);

  // Log a checkin for a habit on selectedDate
  const logCheckin = useCallback(async (habitId, value) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    let prevValue = 0;
    setCheckins((prev) => {
      const idx = prev.findIndex((c) => c.habit_id === habitId && c.habit_date === selectedDate);
      if (idx >= 0) {
        prevValue = prev[idx].value;
        const next = [...prev];
        next[idx] = { ...next[idx], value, updated_at: new Date().toISOString() };
        return next;
      }
      return [...prev, { id: `log-${Date.now()}`, habit_id: habitId, habit_date: selectedDate, value, created_at: new Date().toISOString() }];
    });

    try {
      setSyncState('Kaydediliyor…');
      await api.request(`habits/${habitId}/check-ins/${selectedDate}`, {
        method: 'PUT',
        body: JSON.stringify({
          value,
          idempotency_key: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        }),
      });
      setSyncState('Kaydedildi');
    } catch (err) {
      console.warn('Sync queued locally:', err);
      setSyncState('Çevrimdışı kaydedildi');
    }
  }, [habits, selectedDate]);

  // Add a new habit
  const addHabit = useCallback(async (habitData) => {
    const newHabit = {
      id: `h-${Date.now()}`,
      created_at: new Date().toISOString(),
      start_date: selectedDate,
      ...habitData,
    };

    setHabits((prev) => [newHabit, ...prev]);
    setSyncState('Kaydediliyor…');

    try {
      const res = await api.request('habits', {
        method: 'POST',
        body: JSON.stringify(newHabit),
      });
      if (res?.habit?.id) {
        newHabit.id = res.habit.id;
      }
      setSyncState('Kaydedildi');
    } catch (err) {
      console.warn('Habit queued locally:', err);
      setSyncState('Çevrimdışı kaydedildi');
    }
  }, [selectedDate]);

  // Archive a habit (with undo support)
  const archiveHabit = useCallback(async (habitId) => {
    const habitToArchive = habits.find(h => h.id === habitId);
    if (!habitToArchive) return;

    setLastArchivedHabit(habitToArchive);
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId ? { ...h, archived_at: new Date().toISOString() } : h
      )
    );
    setSyncState('Kaydediliyor…');

    try {
      await api.request(`habits/${habitId}/archive`, { method: 'POST' });
      setSyncState('Kaydedildi');
    } catch (err) {
      console.warn('Archive offline:', err);
      setSyncState('Çevrimdışı kaydedildi');
    }
  }, [habits]);

  // Restore/unarchive a habit
  const restoreHabit = useCallback(async (habitId) => {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId ? { ...h, archived_at: null } : h
      )
    );
    setLastArchivedHabit(null);
    setSyncState('Kaydediliyor…');

    try {
      await api.request(`habits/${habitId}/restore`, { method: 'POST' });
      setSyncState('Kaydedildi');
    } catch (err) {
      console.warn('Restore offline:', err);
      setSyncState('Çevrimdışı kaydedildi');
    }
  }, []);

  // Update week start setting
  const updateWeekStart = useCallback(async (newStart) => {
    const startNum = Number(newStart) === 0 ? 0 : 1;
    setWeekStart(startNum);
    try {
      localStorage.setItem('pace_week_start', String(startNum));
    } catch (e) {}

    try {
      await api.request('account/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ week_start: startNum }),
      });
    } catch (err) {
      console.warn('Preferences update queued:', err);
    }
  }, []);

  // Import backup data
  const importBackup = useCallback(async (jsonData) => {
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
  }, [loadData]);

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
      const val = c ? c.value : 0;
      if (h.tracking === 'check' && val >= 1) completed++;
      else if (h.tracking === 'quantity' && val >= (h.target || 1)) completed++;
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
    logCheckin,
    addHabit,
    archiveHabit,
    restoreHabit,
    lastArchivedHabit,
    setLastArchivedHabit,
    importBackup,
    loadData,
  };
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../lib/api';
import { isPlannedOn, formatTarget } from '../lib/rules';

const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function useHabits() {
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [habits, setHabits] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [groups, setGroups] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState('Hazır');
  const [filterMode, setFilterMode] = useState('planned'); // 'planned' | 'all'

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setSyncState('Yükleniyor…');
      const data = await api.request('/api/habits');
      if (data) {
        setHabits(data.habits || []);
        setCheckins(data.checkins || []);
        setUser(data.user || null);
      }
      
      const groupsData = await api.request('/api/groups');
      if (groupsData && groupsData.groups) {
        setGroups(groupsData.groups);
      }
      setSyncState('Kaydedildi');
    } catch (err) {
      console.warn('Network load fallback:', err);
      setSyncState('Çevrimdışı mod');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Log a checkin for a habit on selectedDate
  const logCheckin = useCallback(async (habitId, value) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    setCheckins((prev) => {
      const idx = prev.findIndex((c) => c.habit_id === habitId && c.habit_date === selectedDate);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], value };
        return next;
      }
      return [...prev, { id: `log-${Date.now()}`, habit_id: habitId, habit_date: selectedDate, value }];
    });

    try {
      setSyncState('Kaydediliyor…');
      await api.request('/api/checkins', {
        method: 'POST',
        body: JSON.stringify({
          habit_id: habitId,
          habit_date: selectedDate,
          value,
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

    try {
      await api.request('/api/habits', {
        method: 'POST',
        body: JSON.stringify(newHabit),
      });
    } catch (err) {
      console.warn('Habit queued locally:', err);
    }
  }, [selectedDate]);

  // Archive a habit
  const archiveHabit = useCallback(async (habitId) => {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId ? { ...h, archived_at: new Date().toISOString() } : h
      )
    );

    try {
      await api.request(`/api/habits/${habitId}/archive`, { method: 'POST' });
    } catch (err) {
      console.warn('Archive offline:', err);
    }
  }, []);

  // Filtered habits for today view
  const todayHabits = useMemo(() => {
    return habits
      .filter((h) => !h.archived_at)
      .filter((h) => {
        if (filterMode === 'all') return true;
        return isPlannedOn(h, selectedDate);
      });
  }, [habits, selectedDate, filterMode]);

  // Calculate today completion
  const completionStats = useMemo(() => {
    if (todayHabits.length === 0) return { completed: 0, total: 0, percentage: 0 };
    let completed = 0;
    todayHabits.forEach((h) => {
      const c = checkins.find((log) => log.habit_id === h.id && log.habit_date === selectedDate);
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
    loadData,
  };
}

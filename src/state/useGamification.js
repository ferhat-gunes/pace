/**
 * useGamification.js - React Hook for Duolingo-style XP, Streak, Gems, and Daily Quests
 * Seamlessly integrates with PACE habits and persists state locally and across sessions.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { playFanfare, playChestOpen, playSuccess } from '../lib/soundFx';
import { triggerHaptic } from '../lib/celebration';
import confetti from 'canvas-confetti';

const STORAGE_KEY = 'pace_gamification_v2';

export function useGamification(checkins = [], habits = []) {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      xp: 120,
      gems: 35,
      claimedDates: {}, // { '2026-11-10': true }
      lastActiveDate: null,
      levelCelebrationPending: null,
    };
  });

  // Save to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

  // Calculate real consecutive streak from checkins history
  const streak = useMemo(() => {
    if (!checkins || checkins.length === 0) return 1;

    // Set of active dates with at least 1 positive checkin
    const activeDates = new Set();
    checkins.forEach((c) => {
      if (!c.deleted && Number(c.value) > 0 && c.habit_date) {
        activeDates.add(c.habit_date);
      }
    });

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // If neither today nor yesterday has a checkin, streak is 0 (or baseline 1 for encouragement)
    let currentStreak = 0;
    let checkDate = new Date(activeDates.has(todayStr) ? today : yesterday);

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (activeDates.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return Math.max(1, currentStreak);
  }, [checkins]);

  // XP, Level and Level Progress calculations (100 XP per level)
  const xp = data.xp || 0;
  const level = Math.floor(xp / 100) + 1;
  const levelProgress = xp % 100;
  const gems = data.gems || 0;

  // Daily quest: Complete 3 habits today
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const todayCompletedCount = useMemo(() => {
    let completed = 0;
    habits.forEach((h) => {
      const c = checkins.find(
        (ci) => !ci.deleted && ci.habit_id === h.id && ci.habit_date === todayStr
      );
      if (c) {
        const val = Number(c.value);
        const target = Number(h.target) || 1;
        if (h.tracking === 'check' ? val >= 1 : val >= target) {
          completed++;
        }
      }
    });
    return completed;
  }, [habits, checkins, todayStr]);

  const questTarget = Math.min(3, Math.max(1, habits.length));
  const isQuestCompleted = todayCompletedCount >= questTarget;
  const isQuestClaimed = Boolean(data.claimedDates?.[todayStr]);

  // Award XP for actions
  const addXp = useCallback((amount, reason = '') => {
    setData((prev) => {
      const prevLvl = Math.floor(prev.xp / 100) + 1;
      const nextXp = prev.xp + amount;
      const nextLvl = Math.floor(nextXp / 100) + 1;

      let levelCelebrationPending = prev.levelCelebrationPending;
      if (nextLvl > prevLvl) {
        levelCelebrationPending = nextLvl;
        playFanfare();
        triggerHaptic('celebration');
        try {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}
      }

      return {
        ...prev,
        xp: nextXp,
        levelCelebrationPending,
      };
    });
  }, []);

  const addGems = useCallback((amount) => {
    setData((prev) => ({
      ...prev,
      gems: (prev.gems || 0) + amount,
    }));
  }, []);

  // Claim Daily Quest Mystery Chest
  const claimDailyChest = useCallback(() => {
    if (!isQuestCompleted || isQuestClaimed) return;

    playChestOpen();
    triggerHaptic('celebration');

    try {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#FFC800', '#FF9600', '#58CC02', '#CE82FF'],
      });
    } catch {}

    setData((prev) => ({
      ...prev,
      xp: prev.xp + 40,
      gems: (prev.gems || 0) + 10,
      claimedDates: {
        ...prev.claimedDates,
        [todayStr]: true,
      },
    }));
  }, [isQuestCompleted, isQuestClaimed, todayStr]);

  const clearLevelCelebration = useCallback(() => {
    setData((prev) => ({ ...prev, levelCelebrationPending: null }));
  }, []);

  return {
    streak,
    xp,
    level,
    levelProgress,
    gems,
    todayCompletedCount,
    questTarget,
    isQuestCompleted,
    isQuestClaimed,
    addXp,
    addGems,
    claimDailyChest,
    levelCelebrationPending: data.levelCelebrationPending,
    clearLevelCelebration,
  };
}

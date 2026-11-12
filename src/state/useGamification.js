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
        const parsed = JSON.parse(saved);
        return {
          xp: parsed.xp ?? 120,
          gems: parsed.gems ?? 35,
          claimedDates: parsed.claimedDates || {},
          streakFreezes: parsed.streakFreezes ?? 2, // 2 initial streak shields
          usedFreezeDates: parsed.usedFreezeDates || {},
          lastActiveDate: parsed.lastActiveDate || null,
          levelCelebrationPending: null,
        };
      }
    } catch {}
    return {
      xp: 120,
      gems: 35,
      claimedDates: {}, // { '2026-11-10': true }
      streakFreezes: 2, // 2 free streak shields for all users
      usedFreezeDates: {},
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

  // Calculate real consecutive streak with Streak Freeze & Rest Day support
  const { streak, isStreakFrozenToday, usedFreezeDates } = useMemo(() => {
    if (!checkins || checkins.length === 0) {
      return { streak: 1, isStreakFrozenToday: false, usedFreezeDates: data.usedFreezeDates || {} };
    }

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

    const freezes = { ...(data.usedFreezeDates || {}) };
    let availableFreezes = data.streakFreezes || 0;
    let freezeUsedForYesterday = Boolean(freezes[yesterdayStr]);

    // If yesterday was missed and not yet frozen, but user has an available shield, auto-protect yesterday!
    if (!activeDates.has(yesterdayStr) && !freezes[yesterdayStr] && availableFreezes > 0) {
      // Check if there was an active streak before yesterday
      const twoDaysAgo = new Date(yesterday);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

      if (activeDates.has(twoDaysAgoStr) || freezes[twoDaysAgoStr]) {
        freezes[yesterdayStr] = true;
        freezeUsedForYesterday = true;
        // Schedule update to deduct freeze
        setTimeout(() => {
          setData((prev) => {
            if (prev.usedFreezeDates?.[yesterdayStr]) return prev;
            return {
              ...prev,
              streakFreezes: Math.max(0, (prev.streakFreezes || 1) - 1),
              usedFreezeDates: {
                ...(prev.usedFreezeDates || {}),
                [yesterdayStr]: true,
              },
            };
          });
        }, 50);
      }
    }

    // Determine start date for streak count
    let currentStreak = 0;
    let checkDate = new Date(today);

    // If today has no checkin, start evaluating from yesterday
    if (!activeDates.has(todayStr) && !freezes[todayStr]) {
      checkDate = new Date(yesterday);
    }

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (activeDates.has(dateStr) || freezes[dateStr]) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      streak: Math.max(1, currentStreak),
      isStreakFrozenToday: freezeUsedForYesterday,
      usedFreezeDates: freezes,
    };
  }, [checkins, data.usedFreezeDates, data.streakFreezes]);

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

  // Purchase extra Streak Freeze with Gems (e.g. 25 gems)
  const buyStreakFreeze = useCallback((cost = 25) => {
    if ((data.gems || 0) < cost) {
      return { success: false, message: 'Yetersiz elmas! Görevleri tamamlayarak elmas kazanabilirsin.' };
    }

    playSuccess();
    triggerHaptic('success');
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#38BDF8', '#818CF8', '#FFFFFF'],
      });
    } catch {}

    setData((prev) => ({
      ...prev,
      gems: (prev.gems || 0) - cost,
      streakFreezes: (prev.streakFreezes || 0) + 1,
    }));

    return { success: true, message: 'Seri Kurtarma Kalkanı satın alındı! 🛡️' };
  }, [data.gems]);

  // Award group synergy milestone bonus (when entire group checks in on the same day)
  const awardGroupBonus = useCallback((bonusXp = 50) => {
    playFanfare();
    triggerHaptic('celebration');
    try {
      confetti({
        particleCount: 55,
        spread: 75,
        origin: { y: 0.5 },
        colors: ['#FFC800', '#58CC02', '#38BDF8'],
      });
    } catch {}

    setData((prev) => ({
      ...prev,
      xp: (prev.xp || 0) + bonusXp,
      gems: (prev.gems || 0) + 5,
    }));
  }, []);

  return {
    streak,
    streakFreezes: data.streakFreezes || 0,
    isStreakFrozenToday,
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
    buyStreakFreeze,
    awardGroupBonus,
    claimDailyChest,
    levelCelebrationPending: data.levelCelebrationPending,
    clearLevelCelebration,
  };
}

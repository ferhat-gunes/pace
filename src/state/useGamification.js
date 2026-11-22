import { dailyCompletion } from '../lib/statistics.js';
import { isPlannedOn } from '../lib/rules.js';
/**
 * useGamification.js - React Hook for Duolingo-style XP, Streak, Gems, and Daily Quests
 * Seamlessly integrates with PACE habits and persists state locally and across sessions.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { playFanfare, playChestOpen, playSuccess } from '../lib/soundFx';
import { triggerHaptic } from '../lib/celebration';
import { localDateIso, addDaysIso } from '../lib/date';
import * as api from '../lib/api';
import rawConfetti from 'canvas-confetti';
const confetti=(...args)=>{if(typeof window!=='undefined'&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return rawConfetti(...args);};

const STORAGE_KEY = 'pace_gamification_v2';

const DEFAULT_GAMIFICATION = {
  xp: 0,
  gems: 10,
  claimedDates: {},
  allDoneBonusDates: {},
  streakFreezes: 1,
  usedFreezeDates: {},
  lastActiveDate: null,
  levelCelebrationPending: null,
};

export function useGamification(
  checkins = [],
  habits = [],
  serverGamification = null,
  isAuthenticated = false,
  ownerId = null,
  weekStart = 1
) {
  const storageKey=STORAGE_KEY+':'+encodeURIComponent(ownerId||(api.isDemo()?'demo':'guest'));
  const [loadedKey,setLoadedKey]=useState(storageKey);
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          xp: parsed.xp ?? 0,
          gems: parsed.gems ?? 10,
          claimedDates: parsed.claimedDates || {},
          allDoneBonusDates: parsed.allDoneBonusDates || {},
          streakFreezes: parsed.streakFreezes ?? 1,
          usedFreezeDates: parsed.usedFreezeDates || {},
          lastActiveDate: parsed.lastActiveDate || null,
          levelCelebrationPending: null,
        };
      }
    } catch {}
    return { ...DEFAULT_GAMIFICATION };
  });

  const skipNextSyncRef = useRef(false);
  const lastHydratedRef = useRef(null);

  useEffect(()=>{if(loadedKey===storageKey)return;let saved=null;try{saved=JSON.parse(localStorage.getItem(storageKey)||'null')}catch{}setData({...DEFAULT_GAMIFICATION,...(saved||{}),levelCelebrationPending:null});setLoadedKey(storageKey);lastHydratedRef.current=null;skipNextSyncRef.current=true;},[storageKey,loadedKey]);

  // Hydrate from server when state loads
  useEffect(() => {
    if (!serverGamification || loadedKey!==storageKey) return;
    const sig = JSON.stringify(serverGamification);
    if (lastHydratedRef.current === sig) return;
    lastHydratedRef.current = sig;
    skipNextSyncRef.current = true;
    setData((prev) => ({
      ...prev,
      xp: Number(serverGamification.xp ?? prev.xp ?? 0),
      gems: Number(serverGamification.gems ?? prev.gems ?? 10),
      streakFreezes: Number(serverGamification.streakFreezes ?? prev.streakFreezes ?? 1),
      usedFreezeDates: serverGamification.usedFreezeDates || prev.usedFreezeDates || {},
      claimedDates: serverGamification.claimedDates || prev.claimedDates || {},
      allDoneBonusDates: serverGamification.allDoneBonusDates || prev.allDoneBonusDates || {},
    }));
  }, [serverGamification,loadedKey,storageKey]);

  // Save to localStorage and debounce sync to server when authenticated
  useEffect(() => {
    if(loadedKey!==storageKey)return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {}
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    if (!isAuthenticated || api.isDemo() || !serverGamification) return;
    const timer = setTimeout(() => {
      api.saveGamification({
        xp: data.xp || 0,
        gems: data.gems || 0,
        streakFreezes: data.streakFreezes || 0,
        usedFreezeDates: data.usedFreezeDates || {},
        claimedDates: data.claimedDates || {},
        allDoneBonusDates: data.allDoneBonusDates || {},
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [data, isAuthenticated,loadedKey,storageKey,serverGamification]);

  const todayStr = localDateIso();
  const yesterdayStr = addDaysIso(todayStr, -1);
  const twoDaysAgoStr = addDaysIso(todayStr, -2);

  // Set of active dates with at least 1 positive checkin
  const activeDates = useMemo(() => {
    const set = new Set();
    (checkins || []).forEach((c) => {
      if (!c.deleted && Number(c.value) > 0 && c.habit_date) {
        set.add(c.habit_date);
      }
    });
    return set;
  }, [checkins]);

  // Auto-protect yesterday with an available streak shield in useEffect (no side effects in useMemo)
  useEffect(() => {
    if (activeDates.size === 0) return;
    const freezes = data.usedFreezeDates || {};
    const availableFreezes = data.streakFreezes || 0;
    if (!activeDates.has(yesterdayStr) && !freezes[yesterdayStr] && availableFreezes > 0) {
      if (activeDates.has(twoDaysAgoStr) || freezes[twoDaysAgoStr]) {
        setData((prev) => {
          if (prev.usedFreezeDates?.[yesterdayStr] || (prev.streakFreezes || 0) <= 0) return prev;
          return {
            ...prev,
            streakFreezes: Math.max(0, (prev.streakFreezes || 1) - 1),
            usedFreezeDates: {
              ...(prev.usedFreezeDates || {}),
              [yesterdayStr]: true,
            },
          };
        });
      }
    }
  }, [activeDates, yesterdayStr, twoDaysAgoStr, data.usedFreezeDates, data.streakFreezes]);

  // Calculate real consecutive streak with Streak Freeze support
  const { streak, isStreakFrozenToday } = useMemo(() => {
    if (activeDates.size === 0) {
      return { streak: 0, isStreakFrozenToday: false };
    }

    const freezes = data.usedFreezeDates || {};
    const freezeUsedForYesterday = Boolean(freezes[yesterdayStr]);

    let currentStreak = 0;
    let checkIso = (!activeDates.has(todayStr) && !freezes[todayStr]) ? yesterdayStr : todayStr;

    for (let i = 0; i < 3650; i++) {
      if (activeDates.has(checkIso) || freezes[checkIso]) {
        currentStreak++;
        checkIso = addDaysIso(checkIso, -1);
      } else {
        break;
      }
    }

    return {
      streak: currentStreak,
      isStreakFrozenToday: freezeUsedForYesterday,
    };
  }, [activeDates, data.usedFreezeDates, todayStr, yesterdayStr]);

  // XP, Level and Level Progress calculations (100 XP per level)
  const xp = data.xp || 0;
  const level = Math.floor(xp / 100) + 1;
  const levelProgress = xp % 100;
  const gems = data.gems || 0;

  const planned=useMemo(()=>habits.filter(h=>isPlannedOn(h,todayStr,checkins,weekStart)),[habits,checkins,todayStr,weekStart]);
  const todayCompletedCount=useMemo(()=>planned.filter(h=>dailyCompletion(h,todayStr,checkins,weekStart)).length,[planned,checkins,todayStr,weekStart]);
  const activeHabitsCount=planned.length;
  const questTarget = Math.min(3, Math.max(1, activeHabitsCount));
  const isQuestCompleted = activeHabitsCount > 0 && todayCompletedCount >= questTarget;
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
        colors: ['#C8FF2E', '#F2F0EA', '#9A9891'],
      });
    } catch {}

    setData((prev) => {
      if (prev.claimedDates?.[todayStr]) return prev;
      return {
        ...prev,
        xp: prev.xp + 40,
        gems: (prev.gems || 0) + 10,
        claimedDates: {
          ...prev.claimedDates,
          [todayStr]: true,
        },
      };
    });
  }, [isQuestCompleted, isQuestClaimed, todayStr]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    if (isQuestCompleted && !isQuestClaimed) {
      claimDailyChest();
    }
  }, [loadedKey, storageKey, isQuestCompleted, isQuestClaimed, claimDailyChest]);

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
        colors: ['#C8FF2E', '#F2F0EA', '#9A9891'],
      });
    } catch {}

    setData((prev) => ({
      ...prev,
      gems: (prev.gems || 0) - cost,
      streakFreezes: (prev.streakFreezes || 0) + 1,
    }));

    return { success: true, message: 'Seri Kurtarma Kalkanı satın alındı!' };
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
        colors: ['#C8FF2E', '#F2F0EA', '#9A9891'],
      });
    } catch {}

    setData((prev) => ({
      ...prev,
      xp: (prev.xp || 0) + bonusXp,
      gems: (prev.gems || 0) + 5,
    }));
  }, []);

  const awardAllDoneBonus = useCallback((dateStr = todayStr) => {
    setData((prev) => {
      if (prev.allDoneBonusDates?.[dateStr]) return prev;
      const prevLvl = Math.floor(prev.xp / 100) + 1;
      const nextXp = prev.xp + 25;
      const nextLvl = Math.floor(nextXp / 100) + 1;
      let levelCelebrationPending = prev.levelCelebrationPending;
      if (nextLvl > prevLvl) {
        levelCelebrationPending = nextLvl;
        playFanfare();
        triggerHaptic('celebration');
      }
      return {
        ...prev,
        xp: nextXp,
        levelCelebrationPending,
        allDoneBonusDates: {
          ...(prev.allDoneBonusDates || {}),
          [dateStr]: true,
        },
      };
    });
  }, [todayStr]);

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
    awardAllDoneBonus,
    claimDailyChest,
    levelCelebrationPending: data.levelCelebrationPending,
    clearLevelCelebration,
  };
}

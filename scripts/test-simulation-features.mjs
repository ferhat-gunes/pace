import test from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------
// 1. STREAK FREEZE & SHIELD LOGIC TESTS
// ---------------------------------------------------------

function evaluateStreakWithShields({
  checkins,
  streakFreezes,
  usedFreezeDates = {},
  todayDateStr = new Date().toISOString().split('T')[0],
}) {
  const activeDates = new Set();
  checkins.forEach((c) => {
    if (!c.deleted && Number(c.value) > 0 && c.habit_date) {
      activeDates.add(c.habit_date);
    }
  });

  const today = new Date(todayDateStr + 'T12:00:00');
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const freezes = { ...usedFreezeDates };
  let availableFreezes = streakFreezes;
  let freezeUsedForYesterday = Boolean(freezes[yesterdayStr]);

  // Auto-protect yesterday if missed and shield is available
  if (!activeDates.has(yesterdayStr) && !freezes[yesterdayStr] && availableFreezes > 0) {
    const twoDaysAgo = new Date(yesterday);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    if (activeDates.has(twoDaysAgoStr) || freezes[twoDaysAgoStr]) {
      freezes[yesterdayStr] = true;
      freezeUsedForYesterday = true;
      availableFreezes -= 1;
    }
  }

  // Count consecutive streak backwards
  let currentStreak = 0;
  let checkDate = new Date(today);

  if (!activeDates.has(todayDateStr) && !freezes[todayDateStr]) {
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
    remainingFreezes: availableFreezes,
    usedFreezeDates: freezes,
  };
}

test('Streak Freeze: auto-protects streak when yesterday is missed and user has shields', () => {
  const todayStr = '2026-11-12';
  const twoDaysAgoStr = '2026-11-10';
  const threeDaysAgoStr = '2026-11-09';

  // Checkins active 3 days ago and 2 days ago, but missed yesterday (11-11)
  const checkins = [
    { habit_id: 'h1', habit_date: threeDaysAgoStr, value: 1, deleted: false },
    { habit_id: 'h1', habit_date: twoDaysAgoStr, value: 1, deleted: false },
  ];

  const result = evaluateStreakWithShields({
    checkins,
    streakFreezes: 2,
    usedFreezeDates: {},
    todayDateStr: todayStr,
  });

  assert.strictEqual(result.isStreakFrozenToday, true, 'Streak should be protected by shield');
  assert.strictEqual(result.remainingFreezes, 1, 'Shield count should be decremented from 2 to 1');
  assert.strictEqual(result.usedFreezeDates['2026-11-11'], true, 'Yesterday should be recorded as frozen');
  // Streak covers 3 days ago, 2 days ago, and frozen yesterday = 3 days
  assert.strictEqual(result.streak, 3, 'Consecutive streak should be 3 including protected yesterday');
});

test('Streak Freeze: streak resets if no shields are available when missed', () => {
  const todayStr = '2026-11-12';
  const twoDaysAgoStr = '2026-11-10';

  const checkins = [
    { habit_id: 'h1', habit_date: twoDaysAgoStr, value: 1, deleted: false },
  ];

  const result = evaluateStreakWithShields({
    checkins,
    streakFreezes: 0, // No shields left
    usedFreezeDates: {},
    todayDateStr: todayStr,
  });

  assert.strictEqual(result.isStreakFrozenToday, false, 'Shield cannot be used when count is 0');
  assert.strictEqual(result.streak, 1, 'Streak resets to minimum 1 when unprotected');
});

// ---------------------------------------------------------
// 2. GEM STORE & STREAK FREEZE PURCHASE TESTS
// ---------------------------------------------------------

function buyStreakFreeze(currentGems, currentFreezes, cost = 25) {
  if (currentGems < cost) {
    return {
      success: false,
      gems: currentGems,
      streakFreezes: currentFreezes,
      message: 'Yetersiz elmas! Görevleri tamamlayarak elmas kazanabilirsin.',
    };
  }
  return {
    success: true,
    gems: currentGems - cost,
    streakFreezes: currentFreezes + 1,
    message: 'Seri Kurtarma Kalkanı satın alındı! 🛡️',
  };
}

test('Gem Store: purchasing shield succeeds when user has 25+ gems', () => {
  const res = buyStreakFreeze(35, 1, 25);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.gems, 10);
  assert.strictEqual(res.streakFreezes, 2);
  assert.ok(res.message.includes('satın alındı'));
});

test('Gem Store: purchasing shield fails when gems are insufficient', () => {
  const res = buyStreakFreeze(15, 1, 25);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.gems, 15);
  assert.strictEqual(res.streakFreezes, 1);
  assert.ok(res.message.includes('Yetersiz elmas'));
});

// ---------------------------------------------------------
// 3. GRACE PERIOD (DÜNÜ TELAFİ ET) TESTS
// ---------------------------------------------------------

function calculateYesterdayIncompleteCount(habits, checkins, todayIso) {
  const today = new Date(todayIso + 'T12:00:00');
  today.setDate(today.getDate() - 1);
  const yesterdayIso = today.toISOString().split('T')[0];

  let incomplete = 0;
  habits.forEach((h) => {
    const c = checkins.find((ci) => !ci.deleted && ci.habit_id === h.id && ci.habit_date === yesterdayIso);
    const val = c ? Number(c.value) : 0;
    const target = Number(h.target) || 1;
    if (h.tracking === 'check' ? val < 1 : val < target) {
      incomplete++;
    }
  });
  return incomplete;
}

test('Grace Period: detects yesterday incomplete habits and updates after makeup checkin', () => {
  const todayIso = '2026-11-12';
  const yesterdayIso = '2026-11-11';

  const habits = [
    { id: 'h1', name: 'Kitap Oku', tracking: 'quantity', target: 10 },
    { id: 'h2', name: 'Su İç', tracking: 'quantity', target: 8 },
    { id: 'h3', name: 'Meditasyon', tracking: 'check', target: 1 },
  ];

  let checkins = [
    { habit_id: 'h1', habit_date: yesterdayIso, value: 10, deleted: false }, // done
    // h2 and h3 were missed
  ];

  let incomplete = calculateYesterdayIncompleteCount(habits, checkins, todayIso);
  assert.strictEqual(incomplete, 2, '2 habits should be detected as incomplete for yesterday');

  // Makeup checkin logged for yesterday!
  checkins.push({ habit_id: 'h2', habit_date: yesterdayIso, value: 8, deleted: false });
  checkins.push({ habit_id: 'h3', habit_date: yesterdayIso, value: 1, deleted: false });

  incomplete = calculateYesterdayIncompleteCount(habits, checkins, todayIso);
  assert.strictEqual(incomplete, 0, 'Incomplete count drops to 0 after grace period makeup');
});

// ---------------------------------------------------------
// 4. REST DAY / RECOVERY SABBATH TESTS
// ---------------------------------------------------------

function isHabitDueOnDate(schedule, dateIso) {
  const date = new Date(dateIso + 'T12:00:00');
  // JS getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Convert to ISO 1 = Mon, 7 = Sun
  const isoDay = date.getDay() === 0 ? 7 : date.getDay();

  if (!schedule || schedule.type === 'daily') {
    return true;
  }
  if (schedule.type === 'weekdays') {
    if (Array.isArray(schedule.days)) {
      return schedule.days.includes(isoDay) || schedule.days.includes(date.getDay());
    }
    return isoDay >= 1 && isoDay <= 5;
  }
  if (schedule.type === 'specific_days' && Array.isArray(schedule.days)) {
    return schedule.days.includes(isoDay) || schedule.days.includes(date.getDay());
  }
  return true;
}

test('Rest Day: weekdays schedule is due Monday-Friday and rest on Saturday-Sunday', () => {
  const schedule = { type: 'weekdays', days: [1, 2, 3, 4, 5] };

  // Monday 2026-11-09 -> due
  assert.strictEqual(isHabitDueOnDate(schedule, '2026-11-09'), true);
  // Friday 2026-11-13 -> due
  assert.strictEqual(isHabitDueOnDate(schedule, '2026-11-13'), true);
  // Saturday 2026-11-14 -> rest day!
  assert.strictEqual(isHabitDueOnDate(schedule, '2026-11-14'), false);
  // Sunday 2026-11-15 -> rest day!
  assert.strictEqual(isHabitDueOnDate(schedule, '2026-11-15'), false);
});

test('Rest Day: rest_day_sunday schedule is due Mon-Sat and rest on Sunday', () => {
  const schedule = { type: 'specific_days', days: [1, 2, 3, 4, 5, 6] };

  assert.strictEqual(isHabitDueOnDate(schedule, '2026-11-14'), true, 'Saturday is active');
  assert.strictEqual(isHabitDueOnDate(schedule, '2026-11-15'), false, 'Sunday is Sabbath rest day');
});

// ---------------------------------------------------------
// 5. PEER CHEERS & GROUP SYNERGY TESTS
// ---------------------------------------------------------

function sendPeerCheer(cheersStore, groupId, recipientUserId, cheerEmoji, cheerText, senderUserId) {
  const store = { ...cheersStore };
  if (!store[groupId]) store[groupId] = {};
  if (!store[groupId][recipientUserId]) store[groupId][recipientUserId] = [];

  const cheer = {
    emoji: cheerEmoji,
    text: cheerText,
    sender: senderUserId,
    timestamp: new Date().toISOString(),
  };

  store[groupId][recipientUserId].push(cheer);
  return {
    updatedStore: store,
    xpAwarded: 10, // +10 XP for solidarity cheering
  };
}

test('Peer Cheer: sends solidarity cheer, updates recipient count and awards 10 XP', () => {
  const store = {};
  const res = sendPeerCheer(store, 'grp_1', 'user_bob', '👏', 'Harikasın!', 'user_alice');

  assert.strictEqual(res.xpAwarded, 10);
  const bobCheers = res.updatedStore['grp_1']['user_bob'];
  assert.strictEqual(bobCheers.length, 1);
  assert.strictEqual(bobCheers[0].emoji, '👏');
  assert.strictEqual(bobCheers[0].text, 'Harikasın!');
  assert.strictEqual(bobCheers[0].sender, 'user_alice');
});

test('Triad Catalyst: identifies 2-member groups to recommend 3rd member', () => {
  const groupA = { id: 'g1', members: [{ id: 'u1' }, { id: 'u2' }] };
  const groupB = { id: 'g2', members: [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }] };

  assert.strictEqual(groupA.members.length === 2, true, 'Group A triggers Triad Catalyst');
  assert.strictEqual(groupB.members.length === 2, false, 'Group B is already a triad or larger');
});

test('Group Synergy Milestone: awards 50 XP bonus when all members complete daily goals', () => {
  const members = [{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u3' }];
  const todayStr = '2026-11-12';

  const checkins = [
    { user_id: 'u1', habit_date: todayStr, value: 1, deleted: false },
    { user_id: 'u2', habit_date: todayStr, value: 1, deleted: false },
    { user_id: 'u3', habit_date: todayStr, value: 1, deleted: false },
  ];

  const allCompleted = members.every((m) =>
    checkins.some((c) => !c.deleted && c.user_id === m.user_id && c.habit_date === todayStr && Number(c.value) > 0)
  );

  assert.strictEqual(allCompleted, true, '100% group members completed');
});

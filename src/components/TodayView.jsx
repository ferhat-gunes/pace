import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Plus, Check, Minus, ChevronLeft, ChevronRight, RotateCcw, Gift, Calendar, AlertTriangle, Users, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { formatTarget, stateFor } from '../lib/rules';
import { localDateIso, addDaysIso } from '../lib/date';
import { triggerHaptic, triggerConfetti } from '../lib/celebration';
import { playPop, playSuccess, playStep } from '../lib/soundFx';
import OnboardingStarter from './OnboardingStarter.jsx';

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const DAY_FULL_NAMES = [
  'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
];

export default function TodayView({
  selectedDate,
  setSelectedDate,
  todayHabits = [],
  habits = [],
  checkins = [],
  logCheckin,
  checkinErrors = {},
  clearCheckinError,
  completionStats = { completed: 0, total: 0, percentage: 0 },
  filterMode = 'planned',
  setFilterMode,
  onOpenAddModal,
  onAddStarterHabits,
  guestMode = false,
  onOpenAuth,
  onGoGroups,
  socialInbox = [],
  onDismissInbox,
  weekStart = 1,
  // Gamification props
  questTarget = 3,
  todayCompletedCount = 0,
  isQuestCompleted = false,
  isQuestClaimed = false,
  claimDailyChest,
  addXp,
  awardAllDoneBonus,
  isStreakFrozenToday = false,
  streak = 0,
}) {
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [guestPromptDismissed, setGuestPromptDismissed] = useState(false);
  const dateInputRef = useRef(null);

  const todayIso = useMemo(() => localDateIso(), []);
  const yesterdayIso = useMemo(() => addDaysIso(todayIso, -1), [todayIso]);

  const yesterdayIncompleteCount = useMemo(() => {
    if (selectedDate !== todayIso || !habits || habits.length === 0) return 0;
    let missed = 0;
    habits.forEach((h) => {
      if (h.archived_at || h.paused) return;
      const c = checkins.find((ci) => !ci.deleted && ci.habit_id === h.id && ci.habit_date === yesterdayIso);
      const val = c ? Number(c.value) : 0;
      const target = Number(h.target) || 1;
      if (h.tracking === 'check') {
        if (val < 1) missed++;
      } else if (h.direction === 'at_most') {
        if (!c || val > target) missed++;
      } else if (val < target) {
        missed++;
      }
    });
    return missed;
  }, [habits, checkins, selectedDate, todayIso, yesterdayIso]);

  // P3 Comeback Mode: user had checkins before, but none in the last >= 4 days
  const showComebackBanner = useMemo(() => {
    if (selectedDate !== todayIso || habits.length === 0) return false;
    const activeCheckins = checkins.filter((c) => !c.deleted && Number(c.value) > 0 && c.habit_date);
    if (activeCheckins.length === 0) return false;
    let latestDate = '';
    for (const c of activeCheckins) {
      if (c.habit_date <= todayIso && c.habit_date > latestDate) {
        latestDate = c.habit_date;
      }
    }
    if (!latestDate || latestDate === todayIso) return false;
    const cutoff = addDaysIso(todayIso, -4);
    return latestDate <= cutoff;
  }, [habits.length, checkins, selectedDate, todayIso]);

  const hasAnyPositiveCheckin = useMemo(
    () => checkins.some((c) => !c.deleted && Number(c.value) > 0),
    [checkins]
  );

  // Format dynamic date title
  const dateHeading = useMemo(() => {
    if (selectedDate === todayIso) {
      const d = new Date();
      return `Bugün, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
    }
    const cur = new Date(selectedDate + 'T12:00:00');
    const today = new Date(todayIso + 'T12:00:00');
    const diffDays = Math.round((cur - today) / (1000 * 60 * 60 * 24));
    if (diffDays === -1) return `Dün, ${cur.getDate()} ${MONTH_NAMES[cur.getMonth()]}`;
    if (diffDays === 1) return `Yarın, ${cur.getDate()} ${MONTH_NAMES[cur.getMonth()]}`;
    return `${cur.getDate()} ${MONTH_NAMES[cur.getMonth()]} ${DAY_FULL_NAMES[cur.getDay()]}`;
  }, [selectedDate, todayIso]);

  // Generate 7 days for current week view based on selectedDate
  const weekDays = useMemo(() => {
    const cur = new Date(selectedDate + 'T12:00:00');
    const dayOfWeek = (cur.getDay() - weekStart + 7) % 7;
    const startDay = new Date(cur);
    startDay.setDate(cur.getDate() - dayOfWeek);

    const names = weekStart === 1
      ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
      : ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDay);
      d.setDate(startDay.getDate() + i);
      const iso = localDateIso(d);

      const dayLogs = checkins.filter(c => !c.deleted && c.habit_date === iso);
      const hasCompleted = dayLogs.some(c => Number(c.value) > 0);

      days.push({
        iso,
        dayName: names[i],
        dayNum: d.getDate(),
        isToday: iso === todayIso,
        isFuture: iso > todayIso,
        hasActivity: hasCompleted,
      });
    }
    return days;
  }, [selectedDate, todayIso, checkins, weekStart]);

  const canGoNextWeek = weekDays.length > 0 && weekDays[weekDays.length - 1].iso < todayIso;

  const changeWeek = (offsetDays) => {
    playPop();
    const newIso = addDaysIso(selectedDate, offsetDays);
    setSelectedDate?.(newIso > todayIso ? todayIso : newIso);
  };

  const handleStartEdit = (habitId, currentVal) => {
    playPop();
    setEditingHabitId(habitId);
    setEditValue(String(currentVal));
  };

  const handleSaveEdit = (habitId) => {
    const normalized = String(editValue).replace(',', '.');
    const n = Math.max(0, Math.min(1000000, Number(normalized) || 0));
    logCheckin?.(habitId, n);
    setEditingHabitId(null);
    playPop();
    setAnnouncement(`Miktar güncellendi: ${n}`);
  };

  const handleQuickStep = (habit, delta, e) => {
    const checkin = checkins.find((c) => !c.deleted && c.habit_id === habit.id && c.habit_date === selectedDate);
    const current = checkin ? Number(checkin.value) : 0;
    const target = Number(habit.target) || 1;
    const nextVal = Math.max(0, current + delta);
    logCheckin?.(habit.id, nextVal);

    if (delta > 0) {
      playStep(true);
      if (habit.direction !== 'at_most') addXp?.(3);
    } else {
      playStep(false);
    }

    if (habit.direction !== 'at_most' && nextVal >= target && current < target) {
      playSuccess();
      triggerHaptic('success');
      triggerConfetti(e?.clientX, e?.clientY);
      addXp?.(15);
    } else {
      triggerHaptic('light');
    }
    setAnnouncement(`${habit.name}: ${nextVal} ${habit.unit || ''}`);
  };

  const isAllDone = completionStats.total > 0 && completionStats.completed === completionStats.total;

  useEffect(() => {
    if (isAllDone && selectedDate === todayIso) {
      awardAllDoneBonus?.(todayIso);
    }
  }, [isAllDone, selectedDate, todayIso, awardAllDoneBonus]);

  return (
    <section className="page-view" id="view-today" aria-labelledby="page-title">
      {/* Screen reader live announcement */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Header row with Date Picker + Add Habit Button (always accessible on mobile & desktop) */}
      <div className="today-heading-wrap" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
              <h1 id="page-title" style={{ margin: 0, fontSize: 'clamp(20px, 4.5vw, 26px)', color: 'var(--ink)' }}>
                <button
                  type="button"
                  id="selected-date-label"
                  onClick={() => {
                    playPop();
                    if (dateInputRef.current?.showPicker) {
                      dateInputRef.current.showPicker();
                    } else {
                      dateInputRef.current?.click();
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 0,
                    padding: '4px 0',
                    minHeight: '44px',
                    font: 'inherit',
                    color: 'inherit',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    textAlign: 'left',
                  }}
                  title="Takvimden tarih seç"
                  aria-label={`${dateHeading} — takvimden başka bir tarih seç`}
                >
                  <span>{dateHeading}</span>
                  <Calendar size={18} style={{ color: 'var(--muted)', flexShrink: 0 }} aria-hidden="true" />
                </button>
              </h1>
              <input
                ref={dateInputRef}
                type="date"
                max={todayIso}
                value={selectedDate}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && val <= todayIso) {
                    playPop();
                    setSelectedDate?.(val);
                  }
                }}
                aria-label="Tarih seç"
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: '1px',
                  height: '1px',
                  pointerEvents: 'none',
                }}
              />
            </div>
            <span id="today-completion" className="completion-summary" aria-live="polite" style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, display: 'block', marginTop: '-4px' }}>
              {completionStats.total > 0
                ? `${completionStats.completed} / ${completionStats.total} tamamlandı (%${completionStats.percentage})`
                : habits.length > 0
                ? 'Bu gün için planlanan alışkanlık yok'
                : 'Hadi ilk rutinini seçelim'}
            </span>
          </div>

          <button
            type="button"
            className="btn-3d btn-3d-green today-add-btn"
            aria-label="Yeni alışkanlık ekle"
            onClick={() => {
              playPop();
              onOpenAddModal?.();
            }}
            style={{ minHeight: '44px', padding: '0 14px', fontSize: '13px', borderRadius: '14px', flexShrink: 0 }}
          >
            <Plus size={18} strokeWidth={3} />
            <span className="today-add-label">Ekle</span>
          </button>
        </div>

        {/* Compact Filter + Week Nav Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', gap: '6px', flexWrap: 'wrap' }}>
          <div className="segmented-control" role="tablist" aria-label="Alışkanlık filtreleme">
            <button
              type="button"
              role="tab"
              className={`segmented-item ${filterMode === 'planned' ? 'is-selected' : ''}`}
              aria-selected={filterMode === 'planned'}
              style={{ minHeight: '44px', padding: '6px 14px' }}
              onClick={() => {
                playPop();
                setFilterMode?.('planned');
              }}
            >
              Planlı
            </button>
            <button
              type="button"
              role="tab"
              className={`segmented-item ${filterMode === 'all' ? 'is-selected' : ''}`}
              aria-selected={filterMode === 'all'}
              style={{ minHeight: '44px', padding: '6px 14px' }}
              onClick={() => {
                playPop();
                setFilterMode?.('all');
              }}
            >
              Tümü
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {selectedDate !== todayIso && (
              <motion.button
                type="button"
                className="btn-3d btn-3d-orange"
                style={{ minHeight: '44px', padding: '0 10px', fontSize: '12px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={() => {
                  playPop();
                  setSelectedDate?.(todayIso);
                }}
                whileTap={{ scale: 0.94, y: 2 }}
                title="Bugüne dön"
              >
                <RotateCcw size={13} />
                <span>Bugün</span>
              </motion.button>
            )}
            <motion.button
              type="button"
              className="btn-3d btn-3d-gray"
              style={{ width: '44px', height: '44px', minWidth: '44px', padding: 0, borderRadius: '12px' }}
              aria-label="Önceki hafta"
              whileTap={{ scale: 0.9, y: 2 }}
              onClick={() => changeWeek(-7)}
            >
              <ChevronLeft size={18} />
            </motion.button>
            <motion.button
              type="button"
              className="btn-3d btn-3d-gray"
              style={{ width: '44px', height: '44px', minWidth: '44px', padding: 0, borderRadius: '12px', opacity: canGoNextWeek ? 1 : 0.45 }}
              aria-label="Sonraki hafta"
              disabled={!canGoNextWeek}
              whileTap={canGoNextWeek ? { scale: 0.9, y: 2 } : {}}
              onClick={() => canGoNextWeek && changeWeek(7)}
            >
              <ChevronRight size={18} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Compact 7-Day Strip */}
      <div
        className="week-strip"
        id="week-strip"
        role="tablist"
        aria-label="Kayıt gününü seç"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          marginBottom: '12px',
          width: '100%',
        }}
      >
        {weekDays.map((day) => {
          const isSelected = day.iso === selectedDate;
          const isFuture = Boolean(day.isFuture);
          return (
            <motion.button
              key={day.iso}
              type="button"
              role="tab"
              disabled={isFuture}
              aria-disabled={isFuture}
              className={`week-day ${isSelected ? 'is-selected' : ''}`}
              aria-selected={isSelected}
              aria-current={day.isToday ? 'date' : undefined}
              aria-label={`${day.dayNum} ${day.dayName}${day.isToday ? ', Bugün' : ''}${isFuture ? ', Gelecek tarih' : ''}`}
              whileTap={isFuture ? {} : { scale: 0.90, y: 2 }}
              onClick={() => {
                if (isFuture) return;
                playPop();
                setSelectedDate?.(day.iso);
              }}
              style={{
                minHeight: '48px',
                padding: '4px 2px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                background: isSelected ? 'var(--orange, #FF9600)' : 'var(--surface)',
                color: isSelected ? '#FFFFFF' : 'var(--ink)',
                border: isSelected ? '2px solid var(--orange-dark, #D47A00)' : '1.5px solid var(--border)',
                borderBottom: isSelected ? '3px solid var(--orange-dark, #D47A00)' : '3px solid var(--border)',
                cursor: isFuture ? 'not-allowed' : 'pointer',
                opacity: isFuture ? 0.45 : 1,
                transition: 'background 0.15s ease, border-color 0.15s ease, transform 0.1s ease',
                position: 'relative',
              }}
            >
              <span className="week-day-name" style={{ fontSize: '10px', fontWeight: 700, opacity: isSelected ? 0.95 : 0.7 }}>
                {day.dayName}
              </span>
              <strong className="week-day-num" style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1.15 }}>
                {day.dayNum}
              </strong>
              {day.hasActivity && (
                <span
                  style={{
                    display: 'block',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: isSelected ? '#FFFFFF' : 'var(--green, #58CC02)',
                    marginTop: '1px',
                  }}
                  aria-hidden="true"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Incoming Social Inbox (Server-synced nudges & cheers) */}
      {socialInbox.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {socialInbox.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-chunky"
              style={{
                background: item.reactionType === 'cheer' ? 'var(--green-soft)' : 'var(--orange-soft)',
                borderColor: item.reactionType === 'cheer' ? 'var(--green)' : 'var(--orange)',
                borderBottomColor: item.reactionType === 'cheer' ? 'var(--green-dark)' : 'var(--orange-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                padding: '10px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: '1 1 180px' }}>
                <span style={{ fontSize: '22px' }}>{item.emoji || '👉'}</span>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: '13px', color: 'var(--ink)', display: 'block' }}>
                    {item.senderDisplayName} {item.reactionType === 'cheer' ? 'seni tebrik etti!' : 'seni nazikçe yokladı'}
                  </strong>
                  {item.message && (
                    <span style={{ fontSize: '12px', color: 'var(--ink)', fontWeight: 600 }}>
                      "{item.message}"
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="btn-3d btn-3d-gray"
                style={{ minHeight: '44px', padding: '0 14px', fontSize: '12px', borderRadius: '12px' }}
                onClick={() => {
                  playPop();
                  onDismissInbox?.(item.id);
                }}
              >
                Tamam 👍
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Ready Chest Quick Claim Button at top ONLY when chest is unlocked and unclaimed */}
      {isQuestCompleted && !isQuestClaimed && (
        <motion.div
          className="daily-quest-banner"
          style={{ padding: '10px 14px', marginBottom: '12px' }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="quest-title" style={{ fontSize: '14px' }}>
              <span role="img" aria-label="Kupa">🏆</span>
              <span>Günün Sandığı Hazır!</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink)', fontWeight: 600 }}>
              +40 XP ve +10 💎 Elmas ödülünü al.
            </div>
          </div>
          <motion.button
            type="button"
            className="btn-3d btn-3d-orange quest-chest-btn"
            style={{ minHeight: '44px', padding: '0 14px', fontSize: '13px', borderRadius: '14px' }}
            onClick={claimDailyChest}
            whileTap={{ scale: 0.92, y: 3 }}
            aria-label="Günün Sandığını Aç (+40 XP & +10 Elmas)"
          >
            <Gift size={18} />
            <span>AÇ!</span>
          </motion.button>
        </motion.div>
      )}

      {/* P3 Comeback Mode (gentle return after >=4 days gap) */}
      {showComebackBanner && (
        <div
          className="card-chunky"
          style={{
            background: 'var(--primary-soft)',
            borderColor: 'var(--primary)',
            borderBottomColor: 'var(--primary-dark)',
            padding: '12px 14px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '22px' }}>🌱</span>
          <div style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.4 }}>
            <strong style={{ display: 'block', fontSize: '13px' }}>Kaldığın yerden hafifçe devam et</strong>
            Ara vermek normaldir. Bugün sadece tek bir küçük adımla ritmine dönebilirsin.
          </div>
        </div>
      )}

      {/* Streak Freeze Alert Banner */}
      {isStreakFrozenToday && selectedDate === todayIso && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--blue-soft, #E0F2FE)',
            border: '1.5px solid var(--blue, #38BDF8)',
            borderRadius: '16px',
            padding: '10px 14px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '20px' }}>🛡️</span>
          <div>
            <strong style={{ fontSize: '13px', color: 'var(--blue-dark, #0369A1)', display: 'block' }}>
              Seri Kurtarma Kalkanı Devrede!
            </strong>
            <span style={{ fontSize: '12px', color: 'var(--ink)' }}>
              Dün kalkanın serini korudu ({streak} gün). Bugün küçük bir adım yeterli!
            </span>
          </div>
        </motion.div>
      )}

      {/* Yesterday Active Grace Period Banner */}
      {selectedDate === yesterdayIso && (
        <div
          style={{
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '10px 14px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '18px' }}>⏱️</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--orange-dark)', lineHeight: 1.4 }}>
            Telafi Modu: Dünkü eksiklerini tamamlayarak serini koruyabilirsin.
          </span>
        </div>
      )}

      {/* Completion Celebration Card */}
      {isAllDone && (
        <motion.div
          className="celebration-card"
          role="status"
          style={{ padding: '14px', marginBottom: '12px' }}
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 16 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '20px' }}>🏆</span>
            <strong style={{ fontSize: '16px', color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
              Harika bir ritim!
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
            Bugün için planlanan tüm alışkanlıklarını tamamladın. +25 Bonus XP kazandın!
          </p>
        </motion.div>
      )}

      {/* Habit List OR Value-First 30s Onboarding */}
      {habits.length === 0 ? (
        <OnboardingStarter
          onAddStarterHabits={onAddStarterHabits}
          onOpenCustomModal={onOpenAddModal}
        />
      ) : todayHabits.length === 0 ? (
        <div className="empty-state card-chunky" style={{ padding: '36px 20px', textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '16px', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '24px' }}>
            ☕
          </div>
          <h2 style={{ fontSize: '18px', color: 'var(--ink)', marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>
            Bu gün için planlanan alışkanlık yok
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 auto 16px', maxWidth: '340px', fontWeight: 500 }}>
            Dinlenme günü! İstersen tüm rutinlerini görmek için "Tümü" sekmesine geçebilirsin.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-3d btn-3d-gray"
              style={{ minHeight: '44px', padding: '0 16px', fontSize: '13px', borderRadius: '14px' }}
              onClick={() => {
                playPop();
                setFilterMode?.('all');
              }}
            >
              Tümünü Göster
            </button>
            <button
              type="button"
              className="btn-3d btn-3d-green"
              style={{ minHeight: '44px', padding: '0 18px', fontSize: '13px', borderRadius: '14px' }}
              onClick={() => {
                playPop();
                onOpenAddModal?.();
              }}
            >
              Alışkanlık Ekle +
            </button>
          </div>
        </div>
      ) : (
        <div id="today-list" className="habit-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {todayHabits.map((h, index) => {
            const checkin = checkins.find(
              (c) => !c.deleted && c.habit_id === h.id && c.habit_date === selectedDate
            );
            const value = checkin ? Number(checkin.value) : 0;
            const target = Number(h.target) || 1;
            const isAtMost = h.tracking === 'quantity' && h.direction === 'at_most';
            const isOverLimit = isAtMost && value > target;
            const isDone = h.tracking === 'check'
              ? value >= 1
              : isAtMost
              ? Boolean(checkin && value <= target)
              : value >= target;

            const weeklyInfo = h.schedule?.type === 'weekly_quota'
              ? stateFor(h, selectedDate, checkins, weekStart)
              : null;

            return (
              <motion.div
                key={h.id}
                className={`habit-row card-chunky ${h.tracking === 'check' ? 'is-check' : 'is-quantity'} ${isDone ? 'is-complete' : ''}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.2) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  borderColor: isOverLimit ? 'var(--red)' : undefined,
                  borderBottomColor: isOverLimit ? 'var(--red-dark)' : undefined,
                }}
              >
                <div
                  className="habit-main"
                  style={{
                    flex: '1 1 auto',
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: '4px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '2px',
                      minWidth: 0,
                      width: '100%',
                    }}
                  >
                    <strong
                      className="habit-name"
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: 'var(--ink)',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%',
                        fontFamily: 'var(--font-heading)',
                      }}
                    >
                      {h.name}
                    </strong>
                    <span
                      className="habit-meta"
                      style={{
                        color: isOverLimit ? 'var(--red-dark)' : 'var(--muted)',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}
                    >
                      {formatTarget(h)}
                      {weeklyInfo ? ` · Bu hafta ${weeklyInfo.actual}/${weeklyInfo.goal}` : ''}
                    </span>
                  </div>

                  {h.tracking === 'quantity' && (
                    <div style={{ marginTop: '3px', width: '100%' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: isOverLimit ? 'var(--red-dark)' : isDone ? '#46A302' : 'var(--muted)',
                          marginBottom: '3px',
                        }}
                      >
                        <span>
                          {value} / {target} {h.unit || ''}
                          {isOverLimit && ' (Sınır aşıldı)'}
                          {isAtMost && isDone && !isOverLimit && ' (Sınır içinde ✓)'}
                        </span>
                        <span>%{Math.min(100, Math.round((value / target) * 100))}</span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '7px',
                          background: 'var(--surface-alt)',
                          borderRadius: '999px',
                          overflow: 'hidden',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <motion.div
                          initial={false}
                          animate={{ width: `${Math.min(100, (value / target) * 100)}%` }}
                          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                          style={{
                            height: '100%',
                            background: isOverLimit
                              ? 'linear-gradient(90deg, #FF4B4B 0%, #EA2B2B 100%)'
                              : isDone
                              ? 'linear-gradient(90deg, #58CC02 0%, #46A302 100%)'
                              : 'linear-gradient(90deg, #FF9600 0%, #FFC800 100%)',
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {checkinErrors[h.id] && (
                    <div
                      role="alert"
                      style={{
                        marginTop: '6px',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        background: 'var(--red-soft)',
                        color: 'var(--red-dark)',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={14} aria-hidden="true" />
                        {checkinErrors[h.id].message}
                      </span>
                      <span style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn-3d btn-3d-gray"
                          style={{ minHeight: '44px', padding: '0 10px', fontSize: '11px', borderRadius: '8px' }}
                          onClick={() => logCheckin?.(h.id, checkinErrors[h.id].value)}
                        >
                          Yeniden Dene
                        </button>
                        <button
                          type="button"
                          className="btn-3d btn-3d-gray"
                          style={{ minHeight: '44px', padding: '0 10px', fontSize: '11px', borderRadius: '8px' }}
                          onClick={() => clearCheckinError?.(h.id)}
                        >
                          Kapat
                        </button>
                      </span>
                    </div>
                  )}
                </div>

                {/* Chunky 3D Action Controls (all >= 44px touch targets) */}
                <div className="habit-actions" style={{ flexShrink: 0 }}>
                  {h.tracking === 'check' ? (
                    <motion.button
                      type="button"
                      className={`btn-3d ${isDone ? 'btn-3d-green' : 'btn-3d-gray'}`}
                      style={{
                        minHeight: '44px',
                        minWidth: '94px',
                        padding: '0 12px',
                        fontSize: '12px',
                      }}
                      whileTap={{ scale: 0.92, y: 4 }}
                      aria-pressed={isDone}
                      aria-label={isDone ? `${h.name} tamamlandı, geri almak için tıkla` : `${h.name} tamamlandı olarak işaretle`}
                      onClick={(e) => {
                        const nextVal = isDone ? 0 : 1;
                        logCheckin?.(h.id, nextVal);
                        if (nextVal > 0) {
                          playSuccess();
                          triggerHaptic('success');
                          triggerConfetti(e?.clientX, e?.clientY);
                          addXp?.(15);
                        } else {
                          playPop();
                          triggerHaptic('light');
                        }
                        setAnnouncement(nextVal > 0 ? `${h.name} tamamlandı` : `${h.name} geri alındı`);
                      }}
                    >
                      {isDone ? (
                        <>
                          <Check size={17} strokeWidth={3} />
                          <span>TAMAM!</span>
                        </>
                      ) : (
                        <span>TAMAMLA</span>
                      )}
                    </motion.button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <motion.button
                        type="button"
                        className="btn-3d btn-3d-gray"
                        style={{ width: '44px', height: '44px', minWidth: '44px', borderRadius: '14px', padding: 0 }}
                        aria-label={`${h.name} miktarını 1 azalt`}
                        onClick={(e) => handleQuickStep(h, -1, e)}
                        whileTap={{ scale: 0.88, y: 3 }}
                        disabled={value <= 0}
                      >
                        <Minus size={18} strokeWidth={3} />
                      </motion.button>

                      {editingHabitId === h.id ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.,]/g, ''))}
                          onBlur={() => handleSaveEdit(h.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(h.id);
                            if (e.key === 'Escape') setEditingHabitId(null);
                          }}
                          style={{
                            width: '58px',
                            height: '44px',
                            textAlign: 'center',
                            borderRadius: '14px',
                            border: '2.5px solid var(--primary)',
                            fontWeight: 800,
                            fontSize: '16px',
                            background: 'var(--surface)',
                            color: 'var(--ink)',
                            boxShadow: '0 4px 14px rgba(28, 176, 246, 0.25)',
                          }}
                          aria-label={`${h.name} miktarı`}
                        />
                      ) : (
                        <motion.button
                          type="button"
                          className="btn-3d btn-3d-gray"
                          onClick={() => handleStartEdit(h.id, value)}
                          whileTap={{ scale: 0.94 }}
                          title="Doğrudan sayı girmek için tıkla"
                          style={{
                            minWidth: '44px',
                            height: '44px',
                            padding: '0 8px',
                            textAlign: 'center',
                            fontWeight: 800,
                            fontSize: '14px',
                            borderRadius: '14px',
                          }}
                          aria-label={`${h.name} güncel miktar: ${value}, değiştirmek için tıkla`}
                        >
                          {value}
                        </motion.button>
                      )}

                      <motion.button
                        type="button"
                        className="btn-3d btn-3d-orange"
                        style={{ width: '44px', height: '44px', minWidth: '44px', borderRadius: '14px', padding: 0 }}
                        aria-label={`${h.name} miktarını 1 artır`}
                        onClick={(e) => handleQuickStep(h, 1, e)}
                        whileTap={{ scale: 0.88, y: 3 }}
                      >
                        <Plus size={18} strokeWidth={3} />
                      </motion.button>

                      {/* Smart complete shortcut ONLY for at_least habits */}
                      {!isAtMost && !isDone && target - value > 1 && (
                        <motion.button
                          type="button"
                          className="btn-3d btn-3d-blue"
                          style={{ minHeight: '44px', minWidth: '44px', padding: '0 8px', fontSize: '12px', borderRadius: '14px' }}
                          title={`Kalan ${target - value} ${h.unit || ''} tamamla`}
                          whileTap={{ scale: 0.88, y: 3 }}
                          onClick={(e) => {
                            logCheckin?.(h.id, target);
                            playSuccess();
                            triggerHaptic('success');
                            triggerConfetti(e?.clientX, e?.clientY);
                            addXp?.(15);
                            setAnnouncement(`${h.name} hedefe ulaştı: ${target}`);
                          }}
                        >
                          +{Math.round((target - value) * 10) / 10}
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Below-the-fold Contextual Prompts (keeps top list uncluttered & reachable) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
        {/* Compact Daily Quest Card (when not yet completed or already claimed) */}
        {habits.length > 0 && (!isQuestCompleted || isQuestClaimed) && (
          <div className="daily-quest-banner" style={{ marginBottom: 0, padding: '12px 14px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="quest-title" style={{ fontSize: '14px' }}>
                <span role="img" aria-label="Kupa">🏆</span>
                <span>Günün Görevi</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink)', fontWeight: 600, marginTop: '2px' }}>
                {isQuestClaimed
                  ? 'Günün sandığı açıldı! Harika ilerleme ⭐'
                  : `${questTarget} alışkanlığını tamamla, sandığı aç!`}
              </div>
              <div className="quest-progress-wrap">
                <div className="quest-bar">
                  <div
                    className="quest-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.round((todayCompletedCount / questTarget) * 100))}%`,
                    }}
                  />
                </div>
                <span className="quest-count-text">
                  {todayCompletedCount}/{questTarget}
                </span>
              </div>
            </div>
            <div
              style={{
                minHeight: '44px',
                minWidth: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '14px',
                padding: '0 10px',
                background: 'rgba(255,255,255,0.6)',
                color: '#7A5700',
                fontWeight: 800,
                fontSize: '12px',
              }}
            >
              <Gift size={18} style={{ marginRight: '4px' }} />
              {isQuestClaimed ? 'Açıldı' : 'Sandık'}
            </div>
          </div>
        )}

        {/* Grace Period / Yesterday Missed Reminder (placed cleanly below list) */}
        {yesterdayIncompleteCount > 0 && selectedDate === todayIso && (
          <div
            style={{
              background: 'var(--orange-soft, #FEF3C7)',
              border: '1.5px solid var(--orange, #F59E0B)',
              borderRadius: '16px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>⏱️</span>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--orange-dark, #B45309)', display: 'block' }}>
                  Telafi Fırsatı
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--ink)' }}>
                  Dünden kalan {yesterdayIncompleteCount} alışkanlığın var.
                </span>
              </div>
            </div>
            <button
              type="button"
              className="btn-3d btn-3d-orange"
              style={{ padding: '0 14px', fontSize: '12px', minHeight: '44px', borderRadius: '12px' }}
              onClick={() => {
                playPop();
                setSelectedDate?.(yesterdayIso);
              }}
            >
              Dünü Telafi Et
            </button>
          </div>
        )}

        {/* Soft Post-First-Checkin Account & Friend Prompt for Guest Users */}
        {guestMode && hasAnyPositiveCheckin && !guestPromptDismissed && (
          <div
            className="card-chunky"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--primary)',
              borderBottomColor: 'var(--primary-dark)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Sparkles size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.4 }}>
                <strong>İlk adımını attın!</strong> İlerlemeni cihazlar arasında saklamak veya yakın bir arkadaşınla birlikte devam etmek ister misin?
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-3d btn-3d-blue"
                style={{ minHeight: '44px', padding: '0 14px', fontSize: '12px', borderRadius: '12px' }}
                onClick={() => {
                  playPop();
                  onOpenAuth?.();
                }}
              >
                İlerlemeni Kaydet
              </button>
              <button
                type="button"
                className="btn-3d btn-3d-gray"
                style={{ minHeight: '44px', padding: '0 14px', fontSize: '12px', borderRadius: '12px' }}
                onClick={() => {
                  playPop();
                  onGoGroups?.();
                }}
              >
                <Users size={15} />
                <span>Arkadaşla Takip Et</span>
              </button>
              <button
                type="button"
                className="button button-quiet"
                style={{ minHeight: '44px', padding: '0 10px', fontSize: '12px', marginLeft: 'auto' }}
                onClick={() => setGuestPromptDismissed(true)}
              >
                Sonra
              </button>
            </div>
          </div>
        )}

        {/* Secondary end-of-list Add Habit CTA */}
        {todayHabits.length > 0 && (
          <button
            type="button"
            className="btn-3d btn-3d-gray"
            style={{ width: '100%', minHeight: '46px', fontSize: '13px', borderRadius: '16px' }}
            onClick={() => {
              playPop();
              onOpenAddModal?.();
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Yeni Alışkanlık Ekle</span>
          </button>
        )}
      </div>
    </section>
  );
}

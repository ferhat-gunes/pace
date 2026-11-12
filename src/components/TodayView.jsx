import React, { useMemo, useState } from 'react';
import { Plus, Check, Minus, ChevronLeft, ChevronRight, RotateCcw, Sparkles, Gift } from 'lucide-react';
import { motion } from 'motion/react';
import { formatTarget } from '../lib/rules';
import { triggerHaptic, triggerConfetti } from '../lib/celebration';
import { playPop, playSuccess, playStep } from '../lib/soundFx';

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
  completionStats = { completed: 0, total: 0, percentage: 0 },
  filterMode = 'planned',
  setFilterMode,
  onOpenAddModal,
  weekStart = 1,
  // Gamification props
  questTarget = 3,
  todayCompletedCount = 0,
  isQuestCompleted = false,
  isQuestClaimed = false,
  claimDailyChest,
  addXp,
}) {
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [announcement, setAnnouncement] = useState('');

  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

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
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const dayLogs = checkins.filter(c => !c.deleted && c.habit_date === iso);
      const hasCompleted = dayLogs.some(c => Number(c.value) > 0);

      days.push({
        iso,
        dayName: names[i],
        dayNum: d.getDate(),
        isToday: iso === todayIso,
        hasActivity: hasCompleted,
      });
    }
    return days;
  }, [selectedDate, todayIso, checkins, weekStart]);

  const changeWeek = (offsetDays) => {
    playPop();
    const cur = new Date(selectedDate + 'T12:00:00');
    cur.setDate(cur.getDate() + offsetDays);
    const newIso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
    setSelectedDate?.(newIso);
  };

  const handleStartEdit = (habitId, currentVal) => {
    playPop();
    setEditingHabitId(habitId);
    setEditValue(String(currentVal));
  };

  const handleSaveEdit = (habitId) => {
    const n = Math.max(0, Math.min(1000000, Number(editValue) || 0));
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
      addXp?.(3);
    } else {
      playStep(false);
    }

    if (nextVal >= target && current < target) {
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

  return (
    <section className="page-view" id="view-today" aria-labelledby="page-title">
      {/* Screen reader live announcement */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Duolingo Daily Quest Mystery Chest Banner */}
      <motion.div
        className="daily-quest-banner"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="quest-title">
            <span role="img" aria-label="Kupa">🏆</span>
            <span>Günün Görevi</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 600, marginTop: '2px' }}>
            {isQuestClaimed
              ? 'Günün hediye sandığı açıldı! Tebrikler! ⭐'
              : isQuestCompleted
              ? 'Tüm hedefler tamamlandı! Sandığını açabilirsin! 🎉'
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

        {/* Interactive Chest Button */}
        <motion.button
          type="button"
          className={`btn-3d ${isQuestCompleted && !isQuestClaimed ? 'btn-3d-orange quest-chest-btn' : isQuestClaimed ? 'btn-3d-gray' : 'btn-3d-gray'}`}
          style={{
            padding: '10px 14px',
            fontSize: '13px',
            borderRadius: '16px',
            opacity: isQuestCompleted && !isQuestClaimed ? 1 : isQuestClaimed ? 0.75 : 0.85,
          }}
          disabled={!isQuestCompleted || isQuestClaimed}
          onClick={claimDailyChest}
          whileTap={isQuestCompleted && !isQuestClaimed ? { scale: 0.9, y: 4 } : {}}
          aria-label={isQuestCompleted && !isQuestClaimed ? 'Günün Sandığını Aç (+40 XP & +10 Elmas)' : 'Günün Görevi'}
        >
          <Gift size={20} />
          <span>{isQuestClaimed ? 'Açıldı' : isQuestCompleted ? 'AÇ!' : 'Sandık'}</span>
        </motion.button>
      </motion.div>

      {/* Header with stacked mobile layout */}
      <div className="today-heading-wrap" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h1 id="page-title" style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 26px)', color: 'var(--ink)' }}>
              <span id="selected-date-label">{dateHeading}</span>
            </h1>
            <span id="today-completion" className="completion-summary" aria-live="polite" style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600, display: 'block', marginTop: '2px' }}>
              {completionStats.total > 0
                ? `${completionStats.completed} / ${completionStats.total} tamamlandı (%${completionStats.percentage})`
                : 'Bu gün için planlanan alışkanlık yok'}
            </span>
          </div>

          {/* Desktop "Alışkanlık Ekle" Button */}
          <button
            type="button"
            className="btn-3d btn-3d-green add-habit-trigger"
            aria-label="Yeni alışkanlık ekle"
            onClick={() => {
              playPop();
              onOpenAddModal?.();
            }}
            style={{ padding: '10px 20px', fontSize: '14px' }}
          >
            Alışkanlık Ekle +
          </button>
        </div>

        {/* Filter bar & Jump to today */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', gap: '8px' }}>
          <div className="segmented-control" role="tablist" aria-label="Alışkanlık filtreleme">
            <button
              type="button"
              role="tab"
              className={`segmented-item ${filterMode === 'planned' ? 'is-selected' : ''}`}
              aria-selected={filterMode === 'planned'}
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
              onClick={() => {
                playPop();
                setFilterMode?.('all');
              }}
            >
              Tümü
            </button>
          </div>

          {selectedDate !== todayIso && (
            <motion.button
              type="button"
              className="btn-3d btn-3d-gray"
              style={{ minHeight: '38px', padding: '0 12px', fontSize: '12px' }}
              onClick={() => {
                playPop();
                setSelectedDate?.(todayIso);
              }}
              whileTap={{ scale: 0.94, y: 2 }}
              title="Bugüne dön"
            >
              <RotateCcw size={14} />
              <span>Bugün</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Week Navigation Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <motion.button
            type="button"
            className="btn-3d btn-3d-gray"
            style={{ width: '40px', height: '40px', minWidth: '40px', padding: 0, borderRadius: '12px' }}
            aria-label="Önceki hafta"
            whileTap={{ scale: 0.9, y: 2 }}
            onClick={() => changeWeek(-7)}
          >
            <ChevronLeft size={18} />
          </motion.button>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--muted)', userSelect: 'none' }}>
            Haftalık Takvim
          </span>
          <motion.button
            type="button"
            className="btn-3d btn-3d-gray"
            style={{ width: '40px', height: '40px', minWidth: '40px', padding: 0, borderRadius: '12px' }}
            aria-label="Sonraki hafta"
            whileTap={{ scale: 0.9, y: 2 }}
            onClick={() => changeWeek(7)}
          >
            <ChevronRight size={18} />
          </motion.button>
        </div>

        {selectedDate !== todayIso && (
          <motion.button
            type="button"
            className="btn-3d btn-3d-gray"
            style={{ minHeight: '36px', padding: '0 10px', fontSize: '12px', borderRadius: '12px' }}
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
      </div>

      {/* 7-Day Strip Full Width Grid with Chunky Touch */}
      <div
        className="week-strip"
        id="week-strip"
        role="tablist"
        aria-label="Kayıt gününü seç"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          marginBottom: '20px',
          width: '100%',
        }}
      >
        {weekDays.map((day) => {
          const isSelected = day.iso === selectedDate;
          return (
            <motion.button
              key={day.iso}
              type="button"
              role="tab"
              className={`week-day ${isSelected ? 'is-selected' : ''}`}
              aria-selected={isSelected}
              aria-current={day.isToday ? 'date' : undefined}
              aria-label={`${day.dayNum} ${day.dayName}${day.isToday ? ', Bugün' : ''}`}
              whileTap={{ scale: 0.92, y: 2 }}
              onClick={() => {
                playPop();
                setSelectedDate?.(day.iso);
              }}
              style={{
                minHeight: '54px',
                padding: '6px 2px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '14px',
                background: isSelected ? '#FF9600' : 'var(--surface)',
                color: isSelected ? '#FFFFFF' : 'var(--ink)',
                border: isSelected ? '2px solid #D47A00' : '2px solid var(--border)',
                borderBottom: isSelected ? '4px solid #D47A00' : '3px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              <span className="week-day-name" style={{ fontSize: '11px', fontWeight: 700, opacity: isSelected ? 0.95 : 0.7 }}>
                {day.dayName}
              </span>
              <strong className="week-day-num" style={{ fontSize: '15px', fontWeight: 800 }}>
                {day.dayNum}
              </strong>
              {day.hasActivity && (
                <span
                  style={{
                    display: 'block',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: isSelected ? '#FFFFFF' : '#58CC02',
                    marginTop: '2px',
                  }}
                  aria-hidden="true"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Completion Celebration Card */}
      {isAllDone && (
        <motion.div
          className="celebration-card"
          role="status"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
            <Sparkles size={22} color="#FF9600" />
            <strong style={{ fontSize: '17px', color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
              Harika bir ritim! 🌟
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
            Bugün için planlanan tüm alışkanlıklarını tamamladın. +25 Bonus XP kazandın!
          </p>
        </motion.div>
      )}

      {/* Habit List */}
      {todayHabits.length === 0 ? (
        <div className="empty-state card-chunky" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>
            🌱
          </div>
          <h2 style={{ fontSize: '19px', color: 'var(--ink)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
            {filterMode === 'planned' ? 'Bu gün için planlanan alışkanlık yok' : 'Henüz hiç alışkanlık yok'}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px', maxWidth: '360px', margin: '0 auto 20px', fontWeight: 500 }}>
            Kendini zorlamadan, kendi ritminde küçük adımlarla başla.
          </p>

          <motion.button
            type="button"
            className="btn-3d btn-3d-green"
            style={{ minHeight: '48px', padding: '0 24px', fontSize: '15px' }}
            whileTap={{ scale: 0.94, y: 4 }}
            onClick={() => {
              playPop();
              onOpenAddModal?.();
            }}
          >
            Alışkanlık Ekle +
          </motion.button>
        </div>
      ) : (
        <div id="today-list" className="habit-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {todayHabits.map((h, index) => {
            const checkin = checkins.find(
              (c) => !c.deleted && c.habit_id === h.id && c.habit_date === selectedDate
            );
            const value = checkin ? Number(checkin.value) : 0;
            const target = Number(h.target) || 1;
            const isDone = h.tracking === 'check' ? value >= 1 : value >= target;

            return (
              <motion.div
                key={h.id}
                className={`habit-row card-chunky ${h.tracking === 'check' ? 'is-check' : 'is-quantity'} ${isDone ? 'is-complete' : ''}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
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
                        fontSize: '16px',
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
                        color: 'var(--muted)',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'block',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatTarget(h)}
                    </span>
                  </div>

                  {h.tracking === 'quantity' && (
                    <div style={{ marginTop: '4px', width: '100%' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: isDone ? '#46A302' : 'var(--muted)',
                          marginBottom: '3px',
                        }}
                      >
                        <span>{value} / {target} {h.unit || ''}</span>
                        <span>%{Math.min(100, Math.round((value / target) * 100))}</span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
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
                            background: isDone
                              ? 'linear-gradient(90deg, #58CC02 0%, #46A302 100%)'
                              : 'linear-gradient(90deg, #FF9600 0%, #FFC800 100%)',
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Chunky 3D Action Controls */}
                <div className="habit-actions" style={{ flexShrink: 0 }}>
                  {h.tracking === 'check' ? (
                    <motion.button
                      type="button"
                      className={`btn-3d ${isDone ? 'btn-3d-green' : 'btn-3d-gray'}`}
                      style={{
                        minHeight: '44px',
                        minWidth: '100px',
                        fontSize: '13px',
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
                          <Check size={18} strokeWidth={3} />
                          <span>TAMAM!</span>
                        </>
                      ) : (
                        <span>TAMAMLA</span>
                      )}
                    </motion.button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <motion.button
                        type="button"
                        className="btn-3d btn-3d-gray"
                        style={{ width: '42px', height: '42px', minWidth: '42px', borderRadius: '14px', padding: 0 }}
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
                          pattern="[0-9]*"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))}
                          onBlur={() => handleSaveEdit(h.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(h.id);
                            if (e.key === 'Escape') setEditingHabitId(null);
                          }}
                          style={{
                            width: '62px',
                            height: '42px',
                            textAlign: 'center',
                            borderRadius: '14px',
                            border: '2.5px solid var(--primary)',
                            fontWeight: 800,
                            fontSize: '17px',
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
                            minWidth: '46px',
                            height: '42px',
                            padding: '0 8px',
                            textAlign: 'center',
                            fontWeight: 800,
                            fontSize: '15px',
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
                        style={{ width: '42px', height: '42px', minWidth: '42px', borderRadius: '14px', padding: 0 }}
                        aria-label={`${h.name} miktarını 1 artır`}
                        onClick={(e) => handleQuickStep(h, 1, e)}
                        whileTap={{ scale: 0.88, y: 3 }}
                      >
                        <Plus size={18} strokeWidth={3} />
                      </motion.button>

                      {/* Smart complete shortcut if under target by > 1 */}
                      {!isDone && target - value > 1 && (
                        <motion.button
                          type="button"
                          className="btn-3d btn-3d-blue"
                          style={{ minHeight: '42px', padding: '0 10px', fontSize: '13px', borderRadius: '14px' }}
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
                          +{target - value}
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

      {/* Thumb-zone 3D Floating Action Button on mobile */}
      <motion.button
        type="button"
        className="mobile-fab btn-3d btn-3d-orange"
        aria-label="Yeni alışkanlık ekle"
        whileTap={{ scale: 0.88, y: 4 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => {
          playPop();
          onOpenAddModal?.();
        }}
      >
        <Plus size={28} strokeWidth={3} />
      </motion.button>
    </section>
  );
}

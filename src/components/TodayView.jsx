import React, { useMemo, useState } from 'react';
import { Plus, Check, Minus, ChevronLeft, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';
import { formatTarget } from '../lib/rules';
import { triggerHaptic, triggerConfetti } from '../lib/celebration';

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
    const cur = new Date(selectedDate + 'T12:00:00');
    cur.setDate(cur.getDate() + offsetDays);
    const newIso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
    setSelectedDate?.(newIso);
  };

  const handleStartEdit = (habitId, currentVal) => {
    setEditingHabitId(habitId);
    setEditValue(String(currentVal));
  };

  const handleSaveEdit = (habitId) => {
    const n = Math.max(0, Math.min(1000000, Number(editValue) || 0));
    logCheckin?.(habitId, n);
    setEditingHabitId(null);
    setAnnouncement(`Miktar güncellendi: ${n}`);
  };

  const handleQuickStep = (habit, delta, e) => {
    const checkin = checkins.find((c) => !c.deleted && c.habit_id === habit.id && c.habit_date === selectedDate);
    const current = checkin ? Number(checkin.value) : 0;
    const target = Number(habit.target) || 1;
    const nextVal = Math.max(0, current + delta);
    logCheckin?.(habit.id, nextVal);
    if (nextVal >= target && current < target) {
      triggerHaptic('success');
      triggerConfetti(e?.clientX, e?.clientY);
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

      {/* Header with stacked mobile layout */}
      <div className="today-heading-wrap" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h1 id="page-title" style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 26px)', color: 'var(--forest)' }}>
              <span id="selected-date-label">{dateHeading}</span>
            </h1>
            <span id="today-completion" className="completion-summary" aria-live="polite" style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500, display: 'block', marginTop: '2px' }}>
              {completionStats.total > 0
                ? `${completionStats.completed} / ${completionStats.total} tamamlandı (%${completionStats.percentage})`
                : 'Bu gün için planlanan alışkanlık yok'}
            </span>
          </div>

          {/* Desktop "Alışkanlık Ekle" Button */}
          <button
            type="button"
            className="button button-primary add-habit-trigger"
            aria-label="Yeni alışkanlık ekle"
            onClick={onOpenAddModal}
            style={{ display: 'none' }} /* Desktop-only media rule handles visibility */
          >
            Alışkanlık Ekle +
          </button>
        </div>

        {/* Filter bar & Jump to today */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '8px' }}>
          <div className="segmented-control" role="tablist" aria-label="Alışkanlık filtreleme">
            <button
              type="button"
              role="tab"
              className={`segmented-item ${filterMode === 'planned' ? 'is-selected' : ''}`}
              aria-selected={filterMode === 'planned'}
              onClick={() => setFilterMode?.('planned')}
            >
              Planlı
            </button>
            <button
              type="button"
              role="tab"
              className={`segmented-item ${filterMode === 'all' ? 'is-selected' : ''}`}
              aria-selected={filterMode === 'all'}
              onClick={() => setFilterMode?.('all')}
            >
              Tümü
            </button>
          </div>

          {selectedDate !== todayIso && (
            <button
              type="button"
              className="button button-quiet"
              style={{ minHeight: '38px', padding: '0 12px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setSelectedDate?.(todayIso)}
              title="Bugüne dön"
            >
              <RotateCcw size={14} />
              <span>Bugün</span>
            </button>
          )}
        </div>
      </div>

      {/* Week Navigation Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="button button-quiet"
            style={{ width: '40px', height: '40px', minWidth: '40px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
            aria-label="Önceki hafta"
            onClick={() => changeWeek(-7)}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)' }}>
            Haftalık Takvim
          </span>
          <button
            type="button"
            className="button button-quiet"
            style={{ width: '40px', height: '40px', minWidth: '40px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
            aria-label="Sonraki hafta"
            onClick={() => changeWeek(7)}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {selectedDate !== todayIso && (
          <button
            type="button"
            className="button button-quiet"
            style={{ minHeight: '38px', padding: '0 12px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '10px' }}
            onClick={() => setSelectedDate?.(todayIso)}
            title="Bugüne dön"
          >
            <RotateCcw size={13} />
            <span>Bugün</span>
          </button>
        )}
      </div>

      {/* 7-Day Strip Full Width Grid */}
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
            <button
              key={day.iso}
              type="button"
              role="tab"
              className={`week-day ${isSelected ? 'is-selected' : ''}`}
              aria-selected={isSelected}
              aria-current={day.isToday ? 'date' : undefined}
              aria-label={`${day.dayNum} ${day.dayName}${day.isToday ? ', Bugün' : ''}`}
              onClick={() => setSelectedDate?.(day.iso)}
              style={{
                minHeight: '52px',
                padding: '6px 2px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                background: isSelected ? 'var(--orange-dark)' : 'var(--surface)',
                color: isSelected ? '#FFFFFF' : 'var(--ink)',
                border: isSelected ? '1px solid var(--orange-dark)' : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="week-day-name" style={{ fontSize: '11px', fontWeight: 600, opacity: isSelected ? 0.9 : 0.7 }}>
                {day.dayName}
              </span>
              <strong className="week-day-num" style={{ fontSize: '15px', fontWeight: 800 }}>
                {day.dayNum}
              </strong>
              {day.hasActivity && (
                <span
                  style={{
                    display: 'block',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: isSelected ? '#FFFFFF' : 'var(--sage)',
                    marginTop: '2px',
                  }}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Completion Celebration Card */}
      {isAllDone && (
        <div className="celebration-card" role="status">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
            <Sparkles size={20} color="var(--orange-dark)" />
            <strong style={{ fontSize: '16px', color: 'var(--forest)' }}>Harika bir ritim!</strong>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
            Bugün için planlanan tüm alışkanlıklarını tamamladın. Dinlenmeyi hak ettin.
          </p>
        </div>
      )}

      {/* Habit List */}
      {todayHabits.length === 0 ? (
        <div className="empty-state panel-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--forest-soft)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            🌱
          </div>
          <h2 style={{ fontSize: '18px', color: 'var(--forest)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
            {filterMode === 'planned' ? 'Bu gün için planlanan alışkanlık yok' : 'Henüz hiç alışkanlık yok'}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px', maxWidth: '360px', margin: '0 auto 20px' }}>
            Kendini zorlamadan, kendi ritminde küçük adımlarla başla.
          </p>

          <button
            type="button"
            className="button button-primary"
            style={{ minHeight: '48px', padding: '0 24px', fontSize: '15px' }}
            onClick={onOpenAddModal}
          >
            Alışkanlık Ekle +
          </button>
        </div>
      ) : (
        <div id="today-list" className="habit-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {todayHabits.map((h) => {
            const checkin = checkins.find(
              (c) => !c.deleted && c.habit_id === h.id && c.habit_date === selectedDate
            );
            const value = checkin ? Number(checkin.value) : 0;
            const target = Number(h.target) || 1;
            const isDone = h.tracking === 'check' ? value >= 1 : value >= target;

            return (
              <div
                key={h.id}
                className={`habit-row ${h.tracking === 'check' ? 'is-check' : 'is-quantity'} ${isDone ? 'is-complete' : ''}`}
                style={{
                  minHeight: '64px',
                  background: 'var(--surface)',
                  border: isDone ? '1px solid var(--forest-border)' : '1px solid var(--border)',
                  borderLeft: isDone ? '4px solid var(--forest)' : '4px solid transparent',
                  borderRadius: 'var(--radius)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  transition: 'all 0.18s ease',
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
                        fontWeight: 700,
                        color: 'var(--ink)',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%',
                      }}
                    >
                      {h.name}
                    </strong>
                    <span
                      className="habit-meta"
                      style={{
                        color: 'var(--muted)',
                        fontSize: '12px',
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
                          fontWeight: 600,
                          color: isDone ? 'var(--forest)' : 'var(--muted)',
                          marginBottom: '3px',
                        }}
                      >
                        <span>{value} / {target} {h.unit || ''}</span>
                        <span>%{Math.min(100, Math.round((value / target) * 100))}</span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '5px',
                          background: 'var(--sage-track)',
                          borderRadius: '999px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, (value / target) * 100)}%`,
                            background: isDone ? 'var(--forest)' : 'var(--orange-dark)',
                            transition: 'width 0.25s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="habit-actions" style={{ flexShrink: 0 }}>
                  {h.tracking === 'check' ? (
                    <button
                      type="button"
                      className={`button ${isDone ? 'button-complete' : 'button-quiet'}`}
                      style={{
                        minHeight: '44px',
                        minWidth: '96px',
                        fontSize: '14px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        borderRadius: '12px',
                      }}
                      aria-pressed={isDone}
                      aria-label={isDone ? `${h.name} tamamlandı, geri almak için tıkla` : `${h.name} tamamlandı olarak işaretle`}
                      onClick={(e) => {
                        const nextVal = isDone ? 0 : 1;
                        logCheckin?.(h.id, nextVal);
                        if (nextVal > 0) {
                          triggerHaptic('success');
                          triggerConfetti(e?.clientX, e?.clientY);
                        } else {
                          triggerHaptic('light');
                        }
                        setAnnouncement(nextVal > 0 ? `${h.name} tamamlandı` : `${h.name} geri alındı`);
                      }}
                    >
                      {isDone ? (
                        <>
                          <Check size={16} />
                          <span>Tamam</span>
                        </>
                      ) : (
                        <span>Tamamla</span>
                      )}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="button button-quiet button-icon"
                        aria-label={`${h.name} miktarını 1 azalt`}
                        onClick={() => handleQuickStep(h, -1)}
                        disabled={value <= 0}
                      >
                        <Minus size={16} />
                      </button>

                      {editingHabitId === h.id ? (
                        <input
                          type="number"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleSaveEdit(h.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(h.id);
                            if (e.key === 'Escape') setEditingHabitId(null);
                          }}
                          style={{
                            width: '56px',
                            height: '44px',
                            textAlign: 'center',
                            borderRadius: '10px',
                            border: '2px solid var(--orange-dark)',
                            fontWeight: 700,
                            fontSize: '16px',
                            background: 'var(--surface)',
                          }}
                          aria-label={`${h.name} miktarı`}
                        />
                      ) : (
                        <button
                          type="button"
                          className="button button-quiet"
                          onClick={() => handleStartEdit(h.id, value)}
                          title="Doğrudan sayı girmek için tıkla"
                          style={{
                            minWidth: '44px',
                            height: '44px',
                            padding: '0 8px',
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: '15px',
                            borderRadius: '10px',
                          }}
                          aria-label={`${h.name} güncel miktar: ${value}, değiştirmek için tıkla`}
                        >
                          {value}
                        </button>
                      )}

                      <button
                        type="button"
                        className="button button-primary button-icon"
                        aria-label={`${h.name} miktarını 1 artır`}
                        onClick={(e) => handleQuickStep(h, 1, e)}
                      >
                        <Plus size={16} />
                      </button>

                      {/* Smart complete shortcut if under target by > 1 */}
                      {!isDone && target - value > 1 && (
                        <button
                          type="button"
                          className="button button-quiet"
                          style={{ minHeight: '44px', padding: '0 10px', fontSize: '12px', fontWeight: 700, color: 'var(--forest)' }}
                          title={`Kalan ${target - value} ${h.unit || ''} tamamla`}
                          onClick={(e) => {
                            logCheckin?.(h.id, target);
                            triggerHaptic('success');
                            triggerConfetti(e?.clientX, e?.clientY);
                            setAnnouncement(`${h.name} hedefe ulaştı: ${target}`);
                          }}
                        >
                          +{target - value}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Thumb-zone Floating Action Button on mobile */}
      <button
        type="button"
        className="mobile-fab"
        aria-label="Yeni alışkanlık ekle"
        onClick={onOpenAddModal}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </section>
  );
}

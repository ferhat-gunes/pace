import React, { useMemo, useState } from 'react';
import { Plus, Check, Minus, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { formatTarget } from '../lib/rules';

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
      
      // Calculate completion pip for this day
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
  };

  return (
    <section className="page-view" id="view-today" aria-labelledby="page-title">
      <div className="page-heading today-heading">
        <div className="record-heading">
          <h1 id="page-title">
            <span id="selected-date-label">{dateHeading}</span>
          </h1>
          <span id="today-completion" className="completion-summary" aria-live="polite">
            {completionStats.total > 0
              ? `${completionStats.completed} / ${completionStats.total} tamamlandı (%${completionStats.percentage})`
              : 'Bu gün için planlanan alışkanlık yok'}
          </span>
        </div>

        <div className="today-heading-actions">
          {/* Segmented filter control */}
          <div className="segmented-filter" role="group" aria-label="Alışkanlık filtreleme">
            <button
              type="button"
              className={`button ${filterMode === 'planned' ? 'button-primary' : 'button-quiet'}`}
              style={{ height: '38px', padding: '0 12px', fontSize: '13px' }}
              aria-pressed={filterMode === 'planned'}
              onClick={() => setFilterMode?.('planned')}
            >
              Planlı
            </button>
            <button
              type="button"
              className={`button ${filterMode === 'all' ? 'button-primary' : 'button-quiet'}`}
              style={{ height: '38px', padding: '0 12px', fontSize: '13px' }}
              aria-pressed={filterMode === 'all'}
              onClick={() => setFilterMode?.('all')}
            >
              Tümü
            </button>
          </div>

          <button
            type="button"
            className="button button-primary add-habit-trigger"
            aria-label="Yeni alışkanlık ekle"
            onClick={onOpenAddModal}
          >
            Alışkanlık Ekle +
          </button>
        </div>
      </div>

      {/* Week Navigation & Strip */}
      <div className="week-strip-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <button
          type="button"
          className="button button-quiet"
          style={{ minWidth: '40px', height: '48px', padding: 0 }}
          aria-label="Önceki hafta"
          onClick={() => changeWeek(-7)}
        >
          <ChevronLeft size={20} />
        </button>

        <div className="week-strip" id="week-strip" role="tablist" aria-label="Kayıt gününü seç" style={{ flex: 1, margin: 0 }}>
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
                style={isSelected ? { background: 'var(--orange-dark)', color: '#FFFFFF', borderColor: 'var(--orange-dark)' } : {}}
              >
                <span className="week-day-name">{day.dayName}</span>
                <strong className="week-day-num">{day.dayNum}</strong>
                {day.hasActivity && (
                  <span
                    style={{
                      display: 'block',
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: isSelected ? '#FFFFFF' : 'var(--sage)',
                      margin: '3px auto 0',
                    }}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="button button-quiet"
          style={{ minWidth: '40px', height: '48px', padding: 0 }}
          aria-label="Sonraki hafta"
          onClick={() => changeWeek(7)}
        >
          <ChevronRight size={20} />
        </button>

        {selectedDate !== todayIso && (
          <button
            type="button"
            className="button button-quiet"
            style={{ height: '48px', padding: '0 12px', fontSize: '12px', fontWeight: 600 }}
            onClick={() => setSelectedDate?.(todayIso)}
            title="Bugüne dön"
          >
            <RotateCcw size={14} style={{ marginRight: '4px' }} />
            Bugün
          </button>
        )}
      </div>

      {/* Habit List */}
      {todayHabits.length === 0 ? (
        <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', color: 'var(--forest)', marginBottom: '8px' }}>
            {filterMode === 'planned' ? 'Bu gün için planlanan alışkanlık yok' : 'Henüz hiç alışkanlık yok'}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>
            Yeni bir rutin başlatarak kendi ritmini yakala.
          </p>
          <button
            type="button"
            className="button button-primary add-habit-trigger"
            onClick={onOpenAddModal}
          >
            Alışkanlık Ekle +
          </button>
        </div>
      ) : (
        <div id="today-list" className="habit-list">
          {todayHabits.map((h) => {
            const checkin = checkins.find(
              (c) => !c.deleted && c.habit_id === h.id && c.habit_date === selectedDate
            );
            const value = checkin ? Number(checkin.value) : 0;
            const isDone =
              h.tracking === 'check' ? value >= 1 : value >= (h.target || 1);

            return (
              <div
                key={h.id}
                className={`habit-row ${h.tracking === 'check' ? 'is-check' : 'is-quantity'} ${isDone ? 'is-complete' : ''}`}
                style={{ minHeight: '64px', transition: 'all 0.2s ease' }}
              >
                <div className="habit-main">
                  <div className="habit-title-group">
                    <strong className="habit-name" style={{ fontSize: '16px' }}>{h.name}</strong>
                    <span className="habit-meta" style={{ color: 'var(--muted)', fontSize: '13px' }}>
                      {formatTarget(h)}
                    </span>
                  </div>

                  {h.tracking === 'quantity' && (
                    <div className="habit-progress" style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: isDone ? 'var(--forest)' : 'var(--ink)' }}>
                        {value} / {h.target} {h.unit || ''}
                      </span>
                    </div>
                  )}
                </div>

                <div className="habit-actions">
                  {h.tracking === 'check' ? (
                    <button
                      type="button"
                      className={`button ${isDone ? 'button-primary' : 'button-quiet'}`}
                      style={{
                        minHeight: '44px',
                        minWidth: '100px',
                        background: isDone ? 'var(--forest)' : undefined,
                        color: isDone ? '#FFFFFF' : undefined,
                        borderColor: isDone ? 'var(--forest)' : undefined,
                      }}
                      aria-pressed={isDone}
                      aria-label={`${h.name} tamamlandı olarak işaretle`}
                      onClick={() => logCheckin?.(h.id, isDone ? 0 : 1)}
                    >
                      {isDone ? '✓ Tamam' : 'Tamamla'}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="button button-quiet"
                        style={{ minWidth: '44px', height: '44px', padding: 0 }}
                        aria-label={`${h.name} miktarını 1 azalt`}
                        onClick={() => logCheckin?.(h.id, Math.max(0, value - 1))}
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
                            borderRadius: '8px',
                            border: '2px solid var(--orange-dark)',
                            fontWeight: 700,
                            fontSize: '15px',
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
                            padding: '0 6px',
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: '15px',
                            border: '1px dashed var(--border)',
                          }}
                          aria-label={`${h.name} güncel miktar: ${value}, değiştirmek için tıkla`}
                        >
                          {value}
                        </button>
                      )}

                      <button
                        type="button"
                        className="button button-primary"
                        style={{ minWidth: '44px', height: '44px', padding: 0 }}
                        aria-label={`${h.name} miktarını 1 artır`}
                        onClick={() => logCheckin?.(h.id, value + 1)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

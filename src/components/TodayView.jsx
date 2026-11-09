import React, { useMemo } from 'react';
import { Plus, Check, Minus } from 'lucide-react';
import { formatTarget } from '../lib/rules';

export default function TodayView({
  selectedDate,
  setSelectedDate,
  todayHabits = [],
  checkins = [],
  logCheckin,
  completionStats = { completed: 0, total: 0, percentage: 0 },
  filterMode = 'planned',
  setFilterMode,
  onOpenAddModal,
}) {
  // Generate 7 days for the week strip
  const weekDays = useMemo(() => {
    const cur = new Date(selectedDate);
    const dayOfWeek = (cur.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(cur);
    monday.setDate(cur.getDate() - dayOfWeek);

    const names = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        iso,
        dayName: names[i],
        dayNum: d.getDate(),
      });
    }
    return days;
  }, [selectedDate]);

  return (
    <section className="page-view" id="view-today" aria-labelledby="page-title">
      <div className="page-heading today-heading">
        <div className="record-heading">
          <h1 id="page-title">
            <span id="selected-date-label">Bugün</span>
          </h1>
          <span id="today-completion" className="completion-summary">
            {completionStats.total > 0
              ? `${completionStats.completed} / ${completionStats.total} tamamlandı (%${completionStats.percentage})`
              : 'Bugün için planlanan alışkanlık yok'}
          </span>
        </div>

        <div className="today-heading-actions">
          <label className="habit-filter">
            <span className="sr-only">Gösterilen alışkanlıklar</span>
            <select
              id="show-all-habits"
              value={filterMode}
              onChange={(e) => setFilterMode?.(e.target.value)}
            >
              <option value="planned">Planlı</option>
              <option value="all">Tümü</option>
            </select>
          </label>
          <button
            type="button"
            className="button button-primary add-habit-trigger"
            aria-label="Alışkanlık ekle"
            onClick={onOpenAddModal}
          >
            Ekle
          </button>
        </div>
      </div>

      {/* Week Strip */}
      <div className="week-strip" id="week-strip" aria-label="Kayıt gününü seç">
        {weekDays.map((day) => {
          const isSelected = day.iso === selectedDate;
          return (
            <button
              key={day.iso}
              type="button"
              className={`week-day ${isSelected ? 'is-selected' : ''}`}
              onClick={() => setSelectedDate?.(day.iso)}
              style={isSelected ? { background: 'var(--orange)', color: '#FFFFFF', borderColor: 'var(--orange)' } : {}}
            >
              <span className="week-day-name">{day.dayName}</span>
              <strong className="week-day-num">{day.dayNum}</strong>
            </button>
          );
        })}
      </div>

      {/* Habit List */}
      {todayHabits.length === 0 ? (
        <div className="empty-state">
          <h2>İlk alışkanlığını ekle</h2>
          <button
            type="button"
            className="button button-primary add-habit-trigger"
            onClick={onOpenAddModal}
          >
            Alışkanlık ekle
          </button>
        </div>
      ) : (
        <div id="today-list" className="habit-list">
          {todayHabits.map((h) => {
            const checkin = checkins.find(
              (c) => c.habit_id === h.id && c.habit_date === selectedDate
            );
            const value = checkin ? checkin.value : 0;
            const isDone =
              h.tracking === 'check' ? value >= 1 : value >= (h.target || 1);

            return (
              <div
                key={h.id}
                className={`habit-row ${h.tracking === 'check' ? 'is-check' : 'is-quantity'} ${isDone ? 'is-complete' : ''}`}
              >
                <div className="habit-main">
                  <div className="habit-title-group">
                    <strong className="habit-name">{h.name}</strong>
                    <span className="habit-meta">{formatTarget(h)}</span>
                  </div>

                  {h.tracking === 'quantity' && (
                    <div className="habit-progress">
                      <span>{value} / {h.target} {h.unit || ''}</span>
                    </div>
                  )}
                </div>

                <div className="habit-actions">
                  {h.tracking === 'check' ? (
                    <button
                      type="button"
                      className={`button ${isDone ? 'button-primary' : 'button-quiet'}`}
                      style={isDone ? { background: 'var(--forest)', color: '#FFFFFF', borderColor: 'var(--forest)' } : {}}
                      onClick={() => logCheckin?.(h.id, isDone ? 0 : 1)}
                    >
                      {isDone ? '✓ Tamam' : 'Tamamla'}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="button button-quiet"
                        style={{ minWidth: '36px', height: '36px', padding: 0 }}
                        onClick={() => logCheckin?.(h.id, Math.max(0, value - 1))}
                      >
                        <Minus size={14} />
                      </button>
                      <strong style={{ minWidth: '32px', textAlign: 'center' }}>{value}</strong>
                      <button
                        type="button"
                        className="button button-primary"
                        style={{ minWidth: '36px', height: '36px', padding: 0 }}
                        onClick={() => logCheckin?.(h.id, value + 1)}
                      >
                        <Plus size={14} />
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

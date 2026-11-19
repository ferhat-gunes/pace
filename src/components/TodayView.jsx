import React, { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { Plus, Minus, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { addDays, formatNumber, formatTarget, latestCheckins, recordFor, settingsAt, goalFor, stateFor, weekDays as calendarWeek } from '../lib/rules';
import { dailyCompletion } from '../lib/statistics.js';
import { resolveRolloverSelection, useLocalDate } from '../lib/local-date.js';
import { parseEntryAmount } from '../lib/numeric-entry.js';
import DailyEngagement from './DailyEngagement.jsx';
import { Button, IconButton, StatusMarker, ProgressBar, InlineFeedback, EmptyState, LoadingState } from './ui/index.js';

const OnboardingStarter = lazy(() => import('./OnboardingStarter.jsx'));

const shortDay = (day) => new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(new Date(day + 'T12:00:00'));
const longDate = (day) => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }).format(new Date(day + 'T12:00:00'));
const entryKey = (id, day) => JSON.stringify([id, day]);

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
  onAddStarterHabits,
  gamification,
  socialInbox = [],
  onDismissInbox,
  weekStart = 1,
  entryStates = {},
  retryEntry,
  undoEntry,
  onOpenHabitDetail,
}) {
  const todayIso = useLocalDate();
  const previousToday = useRef(todayIso);
  const amountControls = useRef(new Map());
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const normalized = useMemo(() => latestCheckins(checkins), [checkins]);
  const future = selectedDate > todayIso;

  useEffect(() => {
    if (previousToday.current !== todayIso) {
      setSelectedDate?.(resolveRolloverSelection(selectedDate, previousToday.current, todayIso));
      previousToday.current = todayIso;
    }
  }, [todayIso, selectedDate, setSelectedDate]);

  useEffect(() => {
    setEditingHabitId(null);
    setEditError('');
  }, [selectedDate]);

  const dateHeading =
    selectedDate === todayIso
      ? `Bugün, ${new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date(todayIso + 'T12:00:00'))}`
      : selectedDate === addDays(todayIso, -1)
        ? `Dün, ${longDate(selectedDate)}`
        : selectedDate === addDays(todayIso, 1)
          ? `Yarın, ${longDate(selectedDate)}`
          : longDate(selectedDate);

  const days = calendarWeek(selectedDate, weekStart);
  const isAllDone = completionStats.total > 0 && completionStats.completed === completionStats.total;
  const hasHabits = habits.some((h) => !settingsAt(h, selectedDate).archived_at);

  const beginEdit = (id, value) => {
    setEditingHabitId(id);
    setEditValue(String(value).replace('.', ','));
    setEditError('');
  };

  const closeEdit = (id) => {
    setEditingHabitId(null);
    setEditError('');
    requestAnimationFrame(() => amountControls.current.get(id)?.focus());
  };

  const saveEdit = (id) => {
    try {
      const amount = parseEntryAmount(editValue);
      logCheckin?.(id, amount);
      closeEdit(id);
      setAnnouncement(`Miktar ${formatNumber(amount)} olarak güncellendi; kayıt durumu satırda gösteriliyor.`);
    } catch (err) {
      setEditError(err.message);
    }
  };

  const quickStep = (h, delta) => {
    logCheckin?.(h.id, (previous) => Math.max(0, Math.min(1000000, Number(previous) + delta)));
    setAnnouncement(`${h.name}: miktar güncellendi.`);
  };

  const selectKey = (e, items, index, onSelect) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? items.length - 1
          : (index + (e.key === 'ArrowLeft' ? -1 : 1) + items.length) % items.length;
    onSelect(items[next]);
    const buttons = [...e.currentTarget.parentElement.querySelectorAll('button')];
    buttons[next]?.focus();
  };

  return (
    <section className="page-view" id="view-today" aria-labelledby="page-title">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <DailyEngagement
        gamification={gamification}
        checkins={normalized}
        socialInbox={socialInbox}
        onDismissInbox={onDismissInbox}
      />

      <div className="today-heading-wrap" style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h1 id="page-title" style={{ margin: 0 }}>
              <span id="selected-date-label">{dateHeading}</span>
            </h1>
            <span id="today-completion" className="completion-summary mono" aria-live="polite" style={{ display: 'inline-block', marginTop: 'var(--space-1)' }}>
              {completionStats.total
                ? `${completionStats.completed} / ${completionStats.total} hedef tamamlandı (%${completionStats.percentage})`
                : 'Bu tarih için planlanan alışkanlık yok'}
            </span>
          </div>
          <Button variant="primary" size="md" aria-label="Yeni alışkanlık ekle" onClick={onOpenAddModal}>
            <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>Alışkanlık Ekle</span>
          </Button>
        </div>

        <div className="segmented-control" role="group" aria-label="Alışkanlık filtreleme" style={{ marginTop: 'var(--space-4)' }}>
          {['planned', 'all'].map((filter, index) => (
            <button
              key={filter}
              type="button"
              className={`segmented-item ${filterMode === filter ? 'is-selected' : ''}`}
              aria-pressed={filterMode === filter}
              onClick={() => setFilterMode?.(filter)}
              onKeyDown={(e) => selectKey(e, ['planned', 'all'], index, setFilterMode)}
            >
              {filter === 'planned' ? 'Planlı' : 'Tümü'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <IconButton label="Önceki hafta" onClick={() => setSelectedDate?.(addDays(selectedDate, -7))}>
            <ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" />
          </IconButton>
          <span className="mono" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Haftalık takvim
          </span>
          <IconButton label="Sonraki hafta" onClick={() => setSelectedDate?.(addDays(selectedDate, 7))}>
            <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
          </IconButton>
        </div>
        {selectedDate !== todayIso && (
          <Button variant="tertiary" size="sm" onClick={() => setSelectedDate?.(todayIso)}>
            <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>Bugün</span>
          </Button>
        )}
      </div>

      <div
        className="week-strip"
        id="week-strip"
        role="group"
        aria-label="Kayıt gününü seç"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', width: '100%', marginBottom: 'var(--space-5)' }}
      >
        {days.map((day, index) => {
          const hasCheckin = normalized.some((c) => !c.deleted && c.habit_date === day);
          return (
            <button
              key={day}
              type="button"
              className={`week-day ${day === selectedDate ? 'is-selected' : ''}`}
              aria-pressed={day === selectedDate}
              aria-current={day === todayIso ? 'date' : undefined}
              aria-label={`${longDate(day)}${day === todayIso ? ', Bugün' : ''}`}
              onClick={() => setSelectedDate?.(day)}
              onKeyDown={(e) => selectKey(e, days, index, setSelectedDate)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            >
              <span className="week-day-name mono" style={{ fontSize: '11px' }}>
                {shortDay(day)}
              </span>
              <strong className="week-day-num mono">{Number(day.slice(-2))}</strong>
              {hasCheckin && (
                <span
                  aria-hidden="true"
                  style={{ width: 6, height: 6, marginTop: 3, background: 'currentColor' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {future && (
        <InlineFeedback tone="neutral" role="status">
          Gelecek günün planını görüntülüyorsun. Kayıt girişi o gün açılır.
        </InlineFeedback>
      )}

      {isAllDone && (
        <InlineFeedback tone="neutral" role="status">
          <strong>Tüm hedefler tamamlandı</strong> — Bu tarihin planlanan hedefleri tamamlandı.
        </InlineFeedback>
      )}

      {!hasHabits && onAddStarterHabits ? (
        <Suspense fallback={<LoadingState label="Başlangıç rutinleri yükleniyor…" />}>
          <OnboardingStarter onAddStarterHabits={onAddStarterHabits} onOpenCustomModal={onOpenAddModal} />
        </Suspense>
      ) : todayHabits.length === 0 ? (
        <EmptyState
          title={hasHabits && filterMode === 'planned' ? 'Bu tarih için plan yok' : 'İlk alışkanlığınla başla'}
          description={
            hasHabits
              ? 'Planlanmamış günler eksik sayılmaz. İstersen diğer alışkanlıklarını görüntüleyebilirsin.'
              : 'Küçük bir hedef seç; ilerlemeni günlük düzeninde takip et.'
          }
          action={
            <Button
              variant="primary"
              onClick={hasHabits && filterMode === 'planned' ? () => setFilterMode?.('all') : onOpenAddModal}
            >
              {hasHabits && filterMode === 'planned' ? 'Tüm alışkanlıkları gör' : 'İlk Alışkanlığını Ekle'}
            </Button>
          }
        />
      ) : (
        <div id="today-list" className="habit-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {todayHabits.map((habit) => {
            const h = { ...settingsAt(habit, selectedDate), target: goalFor(habit, selectedDate, normalized, weekStart) };
            const record = recordFor(habit, selectedDate, normalized);
            const value = Number(record?.value || 0);
            const target = Number(h.target || 1);
            const isDone = dailyCompletion(habit, selectedDate, normalized, weekStart);
            const weekly = h.schedule?.type === 'weekly_quota';
            const weeklyState = weekly ? stateFor(habit, selectedDate, normalized, weekStart) : null;
            const entry = entryStates instanceof Map ? entryStates.get(entryKey(h.id, selectedDate)) : entryStates[entryKey(h.id, selectedDate)];
            const error = entry && ['error', 'conflict'].includes(entry.status);
            const displayProgress =
              h.direction === 'at_most'
                ? record
                  ? Math.min(1, target / Math.max(value, 0.000001))
                  : 0
                : Math.min(1, value / target);
            const formId = `entry-${h.id}`;
            const rowComplete = weekly ? weeklyState.status === 'done' : isDone;

            return (
              <article
                key={h.id}
                className={`habit-row ${h.tracking === 'check' ? 'is-check' : 'is-quantity'} ${rowComplete ? 'is-complete' : ''}`}
                aria-label={h.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 'var(--space-4)',
                  borderLeft: rowComplete ? '2px solid var(--signal)' : undefined,
                }}
              >
                <div className="habit-main" style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <StatusMarker status={rowComplete ? 'done' : 'missed'} size={12} />
                    <button
                      type="button"
                      onClick={() => onOpenHabitDetail?.(habit)}
                      aria-label={`${h.name} detaylarını görüntüle`}
                      style={{
                        background: 'transparent',
                        border: 0,
                        padding: 0,
                        margin: 0,
                        color: 'inherit',
                        font: 'inherit',
                        textAlign: 'left',
                        cursor: 'pointer',
                        minWidth: 0,
                      }}
                    >
                      <strong className="habit-name" style={{ display: 'block', overflowWrap: 'anywhere', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: 'var(--border)' }}>
                        {h.name}
                      </strong>
                    </button>
                  </div>
                  <span className="habit-meta mono" style={{ display: 'block', marginTop: 'var(--space-1)', fontSize: '12px' }}>
                    {formatTarget(h)}
                  </span>

                  {weekly && (
                    <p className="weekly-quota-summary mono" style={{ margin: 'var(--space-2) 0', fontWeight: 700, fontSize: '12px' }}>
                      Bu hafta {weeklyState.actual} / {weeklyState.goal} gün
                      {weeklyState.status === 'done' ? ' · Haftalık hedef tamamlandı' : ''}
                    </p>
                  )}

                  {h.tracking === 'quantity' && (
                    <div className="habit-progress" style={{ marginTop: 'var(--space-3)' }}>
                      <div className="progress-label mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                        <span>
                          {weekly ? 'Seçili gün: ' : ''}
                          {record ? formatNumber(value) : 'Kayıt yok'} / {formatNumber(target)} {h.unit}
                        </span>
                        <span>
                          {h.direction === 'at_most'
                            ? record
                              ? isDone
                                ? 'Sınır içinde'
                                : 'Sınır aşıldı'
                              : 'Henüz kayıt yok'
                            : `%${Math.round(displayProgress * 100)}`}
                        </span>
                      </div>
                      <ProgressBar
                        value={Math.round(displayProgress * 100)}
                        max={100}
                        label={`${h.name} ${weekly ? 'seçili gün' : ''} ilerleme`}
                      />
                    </div>
                  )}

                  {weekly && h.tracking === 'check' && (
                    <p className="mono" style={{ fontSize: '12px', marginBottom: 0, marginTop: 'var(--space-1)' }}>
                      Seçili gün: {isDone ? 'Yapıldı' : 'Henüz tamamlanmadı'}
                    </p>
                  )}
                </div>

                <div className="habit-actions" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-2)', maxWidth: '100%' }}>
                  {h.tracking === 'check' ? (
                    <Button
                      variant={isDone ? 'primary' : 'secondary'}
                      size="md"
                      disabled={future}
                      aria-pressed={isDone}
                      aria-label={isDone ? `${h.name} tamamlandı, geri almak için tıkla` : `${h.name} tamamlandı olarak işaretle`}
                      onClick={() => {
                        logCheckin?.(h.id, (previous) => (Number(previous) >= 1 ? 0 : 1));
                        setAnnouncement(`${h.name}: seçili günün kaydı güncellendi.`);
                      }}
                    >
                      <StatusMarker status={isDone ? 'done' : 'missed'} size={12} />
                      <span>{isDone ? (weekly ? 'Bu gün yapıldı' : 'Tamam') : weekly ? 'Bu günü tamamla' : 'Tamamla'}</span>
                    </Button>
                  ) : editingHabitId === h.id ? (
                    <form
                      id={formId}
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveEdit(h.id);
                      }}
                      style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}
                    >
                      <label htmlFor={`${formId}-amount`} style={{ fontSize: '13px', flexBasis: '100%' }}>
                        {h.name} miktarı ({h.unit || 'birim'})
                      </label>
                      <input
                        id={`${formId}-amount`}
                        type="text"
                        inputMode="decimal"
                        autoFocus
                        value={editValue}
                        onChange={(e) => {
                          setEditValue(e.target.value);
                          setEditError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            closeEdit(h.id);
                          }
                        }}
                        aria-invalid={Boolean(editError)}
                        aria-describedby={`${formId}-hint${editError ? ` ${formId}-error` : ''}`}
                        aria-label={`${h.name} miktarı`}
                        className="db-input mono"
                        style={{ width: 'min(180px, 100%)', minHeight: 44, padding: '8px 12px', fontSize: 16 }}
                      />
                      <Button type="submit" variant="primary" size="md" disabled={future}>
                        Kaydet
                      </Button>
                      <Button type="button" variant="tertiary" size="md" onClick={() => closeEdit(h.id)}>
                        Vazgeç
                      </Button>
                      <span id={`${formId}-hint`} style={{ fontSize: '12px', flexBasis: '100%', color: 'var(--fg-muted)' }}>
                        0–1.000.000; ondalık için virgül veya nokta kullanabilirsin. Değer yalnız Kaydet ile gönderilir.
                      </span>
                      {editError && (
                        <span id={`${formId}-error`} role="alert" style={{ color: 'var(--fg)', flexBasis: '100%', fontSize: '12px', fontWeight: 600 }}>
                          {editError}
                        </span>
                      )}
                    </form>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <IconButton
                        label={`${h.name} miktarını 1 azalt`}
                        disabled={future || value <= 0}
                        onClick={() => quickStep(h, -1)}
                      >
                        <Minus size={16} strokeWidth={1.5} aria-hidden="true" />
                      </IconButton>
                      <Button
                        variant="secondary"
                        size="md"
                        disabled={future}
                        aria-label={`${h.name} güncel miktar: ${value}, değiştirmek için tıkla`}
                        title="Miktarı düzenle"
                        ref={(el) => {
                          if (el) amountControls.current.set(h.id, el);
                          else amountControls.current.delete(h.id);
                        }}
                        onClick={() => beginEdit(h.id, value)}
                        className="mono"
                      >
                        {formatNumber(value)}
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        disabled={future || value >= 1000000}
                        aria-label={`${h.name} miktarını 1 artır`}
                        onClick={() => quickStep(h, 1)}
                      >
                        <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                      </Button>
                      {!isDone && h.direction !== 'at_most' && target - value > 1 && (
                        <Button
                          variant="tertiary"
                          size="md"
                          disabled={future}
                          title={`Kalan ${formatNumber(target - value)} ${h.unit || ''} tamamla`}
                          onClick={() => logCheckin?.(h.id, target)}
                          className="mono"
                        >
                          +{formatNumber(target - value)}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {entry && (
                  <div className="entry-feedback" style={{ flexBasis: '100%', display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span
                      role={error ? 'alert' : 'status'}
                      aria-atomic="true"
                      className="mono"
                      style={{ fontSize: '12px', color: error ? 'var(--fg)' : 'var(--fg-muted)' }}
                    >
                      {entry.status === 'conflict'
                        ? `Başka bir cihazda değişti. Taslağın ${formatNumber(value)} ${h.unit || ''} olarak korunuyor. ${entry.error || ''}`
                        : entry.status === 'error'
                          ? `Kaydedilemedi. Taslağın korunuyor. ${entry.error || ''}`
                          : entry.status === 'saved'
                            ? 'Kaydedildi'
                            : 'Kaydediliyor…'}
                    </span>
                    {error && (
                      <Button variant="tertiary" size="sm" onClick={() => retryEntry?.(h.id, selectedDate)}>
                        {entry.status === 'conflict' ? 'Güncel kayıt üzerine taslağımı kaydet' : 'Yeniden dene'}
                      </Button>
                    )}
                    {entry.canUndo && (
                      <Button variant="tertiary" size="sm" onClick={() => undoEntry?.(h.id, selectedDate)}>
                        Son kaydı geri al
                      </Button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

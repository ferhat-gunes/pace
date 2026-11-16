import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Check, Minus, ChevronLeft, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';
import { addDays, formatNumber, formatTarget, latestCheckins, recordFor, settingsAt, goalFor, stateFor, weekDays as calendarWeek } from '../lib/rules';
import { dailyCompletion } from '../lib/statistics.js';
import { resolveRolloverSelection, useLocalDate } from '../lib/local-date.js';
import { parseEntryAmount } from '../lib/numeric-entry.js';
import { triggerHaptic, triggerConfetti } from '../lib/celebration';

const shortDay = day => new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(new Date(day + 'T12:00:00'));
const longDate = day => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }).format(new Date(day + 'T12:00:00'));
const entryKey = (id, day) => JSON.stringify([id, day]);

export default function TodayView({
  selectedDate, setSelectedDate, todayHabits = [], habits = [], checkins = [], logCheckin,
  completionStats = { completed: 0, total: 0, percentage: 0 }, filterMode = 'planned',
  setFilterMode, onOpenAddModal, weekStart = 1, entryStates = {}, retryEntry, undoEntry,
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
  useEffect(() => { setEditingHabitId(null); setEditError(''); }, [selectedDate]);

  const dateHeading = selectedDate === todayIso
    ? `Bugün, ${new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date(todayIso + 'T12:00:00'))}`
    : selectedDate === addDays(todayIso, -1) ? `Dün, ${longDate(selectedDate)}`
      : selectedDate === addDays(todayIso, 1) ? `Yarın, ${longDate(selectedDate)}` : longDate(selectedDate);
  const days = calendarWeek(selectedDate, weekStart);
  const isAllDone = completionStats.total > 0 && completionStats.completed === completionStats.total;
  const hasHabits = habits.some(h => !settingsAt(h, selectedDate).archived_at);

  const beginEdit = (id, value) => { setEditingHabitId(id); setEditValue(String(value).replace('.', ',')); setEditError(''); };
  const closeEdit = id => { setEditingHabitId(null); setEditError(''); requestAnimationFrame(() => amountControls.current.get(id)?.focus()); };
  const saveEdit = id => {
    try {
      const amount = parseEntryAmount(editValue);
      logCheckin?.(id, amount);
      closeEdit(id);
      setAnnouncement(`Miktar ${formatNumber(amount)} olarak güncellendi; kayıt durumu kartta gösteriliyor.`);
    } catch (err) { setEditError(err.message); }
  };
  const quickStep = (h, delta) => {
    logCheckin?.(h.id, previous => Math.max(0, Math.min(1000000, Number(previous) + delta)));
    triggerHaptic('light');
    setAnnouncement(`${h.name}: miktar güncellendi.`);
  };
  const selectKey = (e, items, index, onSelect) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowLeft' ? -1 : 1) + items.length) % items.length;
    onSelect(items[next]);
    const buttons = [...e.currentTarget.parentElement.querySelectorAll('button')];
    buttons[next]?.focus();
  };

  return (
    <section className="page-view" id="view-today" aria-labelledby="page-title">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
      <div className="today-heading-wrap" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 id="page-title" style={{ margin: 0 }}><span id="selected-date-label">{dateHeading}</span></h1>
            <span id="today-completion" className="completion-summary" aria-live="polite">
              {completionStats.total ? `${completionStats.completed} / ${completionStats.total} hedef tamamlandı (%${completionStats.percentage})` : 'Bu tarih için planlanan alışkanlık yok'}
            </span>
          </div>
          <button type="button" className="button button-primary add-habit-trigger" aria-label="Yeni alışkanlık ekle" onClick={onOpenAddModal} style={{ display: 'none' }}>Alışkanlık Ekle +</button>
        </div>
        <div className="segmented-control" role="group" aria-label="Alışkanlık filtreleme" style={{ marginTop: 16 }}>
          {['planned', 'all'].map((filter, index) => <button key={filter} type="button" className={`segmented-item ${filterMode === filter ? 'is-selected' : ''}`} aria-pressed={filterMode === filter} onClick={() => setFilterMode?.(filter)} onKeyDown={e => selectKey(e, ['planned', 'all'], index, setFilterMode)}>{filter === 'planned' ? 'Planlı' : 'Tümü'}</button>)}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" className="button button-quiet button-icon" aria-label="Önceki hafta" onClick={() => setSelectedDate?.(addDays(selectedDate, -7))}><ChevronLeft size={18} /></button>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Haftalık takvim</span>
          <button type="button" className="button button-quiet button-icon" aria-label="Sonraki hafta" onClick={() => setSelectedDate?.(addDays(selectedDate, 7))}><ChevronRight size={18} /></button>
        </div>
        {selectedDate !== todayIso && <button type="button" className="button button-quiet" onClick={() => setSelectedDate?.(todayIso)}><RotateCcw size={14} /> Bugün</button>}
      </div>
      <div className="week-strip" id="week-strip" role="group" aria-label="Kayıt gününü seç" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', width: '100%', marginBottom: 20 }}>
        {days.map((day, index) => <button key={day} type="button" className={`week-day ${day === selectedDate ? 'is-selected' : ''}`} aria-pressed={day === selectedDate} aria-current={day === todayIso ? 'date' : undefined} aria-label={`${longDate(day)}${day === todayIso ? ', Bugün' : ''}`} onClick={() => setSelectedDate?.(day)} onKeyDown={e => selectKey(e, days, index, setSelectedDate)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className="week-day-name" style={{ fontSize: 12 }}>{shortDay(day)}</span>
          <strong className="week-day-num">{Number(day.slice(-2))}</strong>
          {normalized.some(c => !c.deleted && c.habit_date === day) && <span aria-hidden="true" style={{ width: 5, height: 5, marginTop: 3, borderRadius: '50%', background: 'currentColor' }} />}
        </button>)}
      </div>
      {future && <p className="inline-message" role="status">Gelecek günün planını görüntülüyorsun. Kayıt girişi o gün açılır.</p>}
      {isAllDone && <div className="celebration-card" role="status"><Sparkles size={20} aria-hidden="true" /><strong> Güzel bir ritim!</strong><p>Bu tarihin planlanan hedefleri tamamlandı. Kendi ritminde devam et.</p></div>}
      {todayHabits.length === 0 ? <div className="empty-state panel-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
        <h2>{hasHabits && filterMode === 'planned' ? 'Bu tarih için plan yok' : 'İlk alışkanlığınla başla'}</h2>
        <p>{hasHabits ? 'Planlanmamış günler eksik sayılmaz. İstersen diğer alışkanlıklarını görüntüleyebilirsin.' : 'Küçük bir hedef seç; ilerlemeni kendi ritminde takip et.'}</p>
        <button type="button" className="button button-primary" onClick={hasHabits && filterMode === 'planned' ? () => setFilterMode?.('all') : onOpenAddModal}>{hasHabits && filterMode === 'planned' ? 'Tüm alışkanlıkları gör' : 'İlk Alışkanlığını Ekle +'}</button>
      </div> : <div id="today-list" className="habit-list" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {todayHabits.map(habit => {
          const h = { ...settingsAt(habit, selectedDate), target: goalFor(habit, selectedDate, normalized, weekStart) };
          const record = recordFor(habit, selectedDate, normalized);
          const value = Number(record?.value || 0), target = Number(h.target || 1);
          const isDone = dailyCompletion(habit, selectedDate, normalized, weekStart);
          const weekly = h.schedule?.type === 'weekly_quota';
          const weeklyState = weekly ? stateFor(habit, selectedDate, normalized, weekStart) : null;
          const entry = entryStates instanceof Map ? entryStates.get(entryKey(h.id, selectedDate)) : entryStates[entryKey(h.id, selectedDate)];
          const error = entry && ['error', 'conflict'].includes(entry.status);
          const displayProgress = h.direction === 'at_most' ? (record ? Math.min(1, target / Math.max(value, 0.000001)) : 0) : Math.min(1, value / target);
          const formId = `entry-${h.id}`;
          return <article key={h.id} className={`habit-row ${h.tracking === 'check' ? 'is-check' : 'is-quantity'} ${(weekly ? weeklyState.status === 'done' : isDone) ? 'is-complete' : ''}`} aria-label={h.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div className="habit-main" style={{ flex: '1 1 220px', minWidth: 0 }}>
              <strong className="habit-name" style={{ display: 'block', overflowWrap: 'anywhere' }}>{h.name}</strong>
              <span className="habit-meta" style={{ display: 'block', marginTop: 5 }}>{formatTarget(h)}</span>
              {weekly && <p className="weekly-quota-summary" style={{ margin: '8px 0', fontWeight: 700 }}>Bu hafta {weeklyState.actual} / {weeklyState.goal} gün{weeklyState.status === 'done' ? ' · Haftalık hedef tamamlandı' : ''}</p>}
              {h.tracking === 'quantity' && <div className="habit-progress" style={{ marginTop: 10 }}>
                <div className="progress-label" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8 }}><span>{weekly ? 'Seçili gün: ' : ''}{record ? formatNumber(value) : 'Kayıt yok'} / {formatNumber(target)} {h.unit}</span><span>{h.direction === 'at_most' ? (record ? isDone ? 'Sınır içinde' : 'Sınır aşıldı' : 'Henüz kayıt yok') : `%${Math.round(displayProgress * 100)}`}</span></div>
                <div className="progress-track" role="progressbar" aria-label={`${h.name} ${weekly ? 'seçili gün' : ''} ilerleme`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(displayProgress * 100)} aria-valuetext={h.direction === 'at_most' ? record ? `${formatNumber(value)} ${h.unit}; üst sınır ${formatNumber(target)} ${h.unit}` : 'Henüz kayıt yok' : `${formatNumber(value)} / ${formatNumber(target)} ${h.unit}`}><div className="progress-fill" style={{ width: `${displayProgress * 100}%` }} /></div>
              </div>}
              {weekly && h.tracking === 'check' && <p style={{ fontSize: 13, marginBottom: 0 }}>Seçili gün: {isDone ? 'Yapıldı' : 'Henüz tamamlanmadı'}</p>}
            </div>
            <div className="habit-actions" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, maxWidth: '100%' }}>
              {h.tracking === 'check' ? <button type="button" disabled={future} className={`button ${isDone ? 'button-complete' : 'button-quiet'}`} aria-pressed={isDone} aria-label={isDone ? `${h.name} tamamlandı, geri almak için tıkla` : `${h.name} tamamlandı olarak işaretle`} onClick={e => {
                logCheckin?.(h.id, previous => Number(previous) >= 1 ? 0 : 1);
                if (!isDone) { triggerHaptic('success'); triggerConfetti(e.clientX, e.clientY); }
                setAnnouncement(`${h.name}: seçili günün kaydı güncellendi.`);
              }}>{isDone ? <><Check size={16} /> {weekly ? 'Bu gün yapıldı' : 'Tamam'}</> : weekly ? 'Bu günü tamamla' : 'Tamamla'}</button> : editingHabitId === h.id ? <form id={formId} onSubmit={e => { e.preventDefault(); saveEdit(h.id); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                <label htmlFor={`${formId}-amount`} style={{ fontSize: 13, flexBasis: '100%' }}>{h.name} miktarı ({h.unit || 'birim'})</label>
                <input id={`${formId}-amount`} type="text" inputMode="decimal" autoFocus value={editValue} onChange={e => { setEditValue(e.target.value); setEditError(''); }} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); closeEdit(h.id); } }} aria-invalid={Boolean(editError)} aria-describedby={`${formId}-hint${editError ? ` ${formId}-error` : ''}`} aria-label={`${h.name} miktarı`} style={{ width: 'min(180px, 100%)', minHeight: 44, padding: '8px 12px', fontSize: 16 }} />
                <button type="submit" className="button button-primary" disabled={future}>Kaydet</button>
                <button type="button" className="button button-quiet" onClick={() => closeEdit(h.id)}>Vazgeç</button>
                <span id={`${formId}-hint`} style={{ fontSize: 13, flexBasis: '100%' }}>0–1.000.000; ondalık için virgül veya nokta kullanabilirsin. Değer yalnız Kaydet ile gönderilir.</span>
                {editError && <span id={`${formId}-error`} role="alert" style={{ color: 'var(--red)', flexBasis: '100%' }}>{editError}</span>}
              </form> : <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" disabled={future || value <= 0} className="button button-quiet button-icon" aria-label={`${h.name} miktarını 1 azalt`} onClick={() => quickStep(h, -1)}><Minus size={16} /></button>
                <button type="button" disabled={future} className="button button-quiet" aria-label={`${h.name} güncel miktar: ${value}, değiştirmek için tıkla`} title="Miktarı düzenle" ref={el => { if (el) amountControls.current.set(h.id, el); else amountControls.current.delete(h.id); }} onClick={() => beginEdit(h.id, value)}>{formatNumber(value)}</button>
                <button type="button" disabled={future || value >= 1000000} className="button button-primary button-icon" aria-label={`${h.name} miktarını 1 artır`} onClick={() => quickStep(h, 1)}><Plus size={16} /></button>
                {!isDone && h.direction !== 'at_most' && target - value > 1 && <button type="button" disabled={future} className="button button-quiet" title={`Kalan ${formatNumber(target - value)} ${h.unit || ''} tamamla`} onClick={() => logCheckin?.(h.id, target)}>+{formatNumber(target - value)}</button>}
              </div>}
            </div>
            {entry && <div className="entry-feedback" style={{ flexBasis: '100%', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span role={error ? 'alert' : 'status'} aria-atomic="true" style={{ fontSize: 13, color: error ? 'var(--red)' : 'var(--muted)' }}>{entry.status === 'conflict' ? `Başka bir cihazda değişti. Taslağın ${formatNumber(value)} ${h.unit || ''} olarak korunuyor. ${entry.error || ''}` : entry.status === 'error' ? `Kaydedilemedi. Taslağın korunuyor. ${entry.error || ''}` : entry.status === 'saved' ? 'Kaydedildi' : 'Kaydediliyor…'}</span>
              {error && <button type="button" className="button button-quiet" onClick={() => retryEntry?.(h.id, selectedDate)}>{entry.status === 'conflict' ? 'Güncel kayıt üzerine taslağımı kaydet' : 'Yeniden dene'}</button>}
              {entry.canUndo && <button type="button" className="button button-quiet" onClick={() => undoEntry?.(h.id, selectedDate)}>Son kaydı geri al</button>}
            </div>}
          </article>;
        })}
      </div>}
      <button type="button" className="mobile-fab" aria-label="Yeni alışkanlık ekle" onClick={onOpenAddModal} style={{ position: 'static', width: 'auto', height: 'auto', minHeight: 48, padding: '12px 18px', bottom: 'auto', right: 'auto', marginTop: 24, gap: 8, borderRadius: 12 }}><Plus size={22} /> Alışkanlık Ekle</button>
    </section>
  );
}

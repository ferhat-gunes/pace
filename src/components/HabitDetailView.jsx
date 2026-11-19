import React, { useMemo } from 'react';
import { ArrowLeft, Pencil, Pause, Play, Archive } from 'lucide-react';
import { addDays, dateKey, formatNumber, formatTarget, isPlannedOn, latestCheckins, recordFor, settingsAt, stateFor } from '../lib/rules.js';
import { describeHabitRules } from '../lib/habit-form.js';
import { dailyCompletion, habitStatistics, habitStreak } from '../lib/statistics.js';
import { Button, IconButton, StatBlock, StatusMarker, EmptyState } from './ui/index.js';

const shortDay = (day) => new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(new Date(day + 'T12:00:00'));

export default function HabitDetailView({
  habit,
  checkins = [],
  weekStart = 1,
  onBack,
  onEdit,
}) {
  const todayIso = dateKey();
  const normalized = useMemo(() => latestCheckins(checkins), [checkins]);

  if (!habit) {
    return (
      <section className="page-view" id="view-habit-detail" aria-labelledby="habit-detail-title">
        <EmptyState
          title="Alışkanlık bulunamadı"
          description="Seçilen alışkanlık silinmiş veya henüz yüklenmemiş olabilir."
          action={
            <Button type="button" variant="primary" onClick={onBack}>
              Geri dön
            </Button>
          }
        />
      </section>
    );
  }

  const effective = settingsAt(habit, todayIso);
  const streak = habitStreak(habit, normalized, { today: todayIso, weekStart });
  const stats = habitStatistics(habit, normalized, { end: todayIso, weekStart });
  const todayState = stateFor(habit, todayIso, normalized, weekStart);

  const ruleText = (() => {
    try {
      return describeHabitRules({
        ...effective,
        schedule: effective.schedule || { type: 'daily' },
        progression: effective.progression || { enabled: false },
        debt: effective.debt || { enabled: false },
      });
    } catch {
      return formatTarget(effective);
    }
  })();

  const recentDays = Array.from({ length: 14 }, (_, idx) => {
    const day = addDays(todayIso, idx - 13);
    const planned = day >= (habit.start_date || '') && isPlannedOn(habit, day, normalized, weekStart);
    const done = planned && dailyCompletion(habit, day, normalized, weekStart);
    const record = recordFor(habit, day, normalized);
    return { day, planned, done, value: record?.value ?? null };
  });

  const planned14 = recentDays.filter((d) => d.planned).length;
  const done14 = recentDays.filter((d) => d.done).length;

  return (
    <section className="page-view" id="view-habit-detail" aria-labelledby="habit-detail-title">
      <div
        className="page-heading"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          minHeight: '44px',
          marginBottom: 'var(--space-4)',
        }}
      >
        <Button type="button" variant="tertiary" onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
          <span>Geri</span>
        </Button>

        <IconButton
          label={`${effective.name} alışkanlığını düzenle`}
          onClick={() => onEdit?.(habit)}
        >
          <Pencil size={18} strokeWidth={1.5} aria-hidden="true" />
        </IconButton>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 680 }}>
        <header style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <span
              className="mono"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                fontSize: '12px',
                fontWeight: 700,
                padding: '2px 8px',
                border: '1px solid var(--border)',
                background: 'var(--surface-1)',
              }}
            >
              {effective.archived_at ? (
                <>
                  <Archive size={13} strokeWidth={1.5} aria-hidden="true" />
                  Arşivlendi
                </>
              ) : effective.paused ? (
                <>
                  <Pause size={13} strokeWidth={1.5} aria-hidden="true" />
                  Duraklatıldı
                </>
              ) : (
                <>
                  <Play size={13} strokeWidth={1.5} aria-hidden="true" />
                  Aktif
                </>
              )}
            </span>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
              Başlangıç: {habit.start_date || '—'}
            </span>
          </div>

          <h1 id="habit-detail-title" style={{ margin: 0, overflowWrap: 'anywhere' }}>
            {effective.name}
          </h1>
          <p style={{ margin: 'var(--space-2) 0 0', fontSize: '14px', color: 'var(--fg-muted)', lineHeight: 1.5 }}>
            {ruleText}
          </p>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 'var(--space-3)',
          }}
        >
          <StatBlock label="Güncel Seri" value={`${streak.count} ${streak.unit}`} highlight={streak.count > 0} />
          <StatBlock label="Hedef" value={formatTarget(effective)} />
          <StatBlock label="Toplam Tamamlanan" value={`${stats.completedDays} gün`} />
          <StatBlock label="Son 14 Gün" value={planned14 ? `${done14} / ${planned14}` : '—'} />
        </div>

        <section
          aria-label="Bugünkü durum"
          style={{
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
            padding: 'var(--space-4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
              Bugünkü Durum
            </div>
            <div style={{ marginTop: 'var(--space-1)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <StatusMarker status={todayState.status === 'done' ? 'done' : 'missed'} size={12} />
              <span>
                {todayState.status === 'done'
                  ? 'Bugünkü hedef tamamlandı'
                  : effective.tracking === 'quantity'
                    ? `${formatNumber(todayState.actual || 0)} / ${formatNumber(todayState.goal || effective.target || 1)} ${effective.unit || ''}`
                    : 'Henüz tamamlanmadı'}
              </span>
            </div>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => onEdit?.(habit)}>
            <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>Düzenle</span>
          </Button>
        </section>

        <section
          aria-label="Son 14 gün"
          style={{
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
            padding: 'var(--space-4)',
          }}
        >
          <div className="mono" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: 'var(--space-3)' }}>
            Son 14 Gün
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 'var(--space-2)',
            }}
          >
            {recentDays.map((item) => (
              <div
                key={item.day}
                title={`${item.day}: ${item.done ? 'Tamamlandı' : item.planned ? 'Planlı' : 'Plan dışı'}`}
                style={{
                  border: '1px solid var(--border)',
                  padding: 'var(--space-2) var(--space-1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  background: item.done ? 'var(--surface-2)' : 'var(--bg)',
                  opacity: item.planned ? 1 : 0.45,
                }}
              >
                <span className="mono" style={{ fontSize: '10px', color: 'var(--fg-muted)' }}>
                  {shortDay(item.day)}
                </span>
                <strong className="mono" style={{ fontSize: '13px' }}>
                  {Number(item.day.slice(-2))}
                </strong>
                {item.planned ? (
                  <StatusMarker status={item.done ? 'done' : 'missed'} size={10} />
                ) : (
                  <span className="mono" style={{ fontSize: '10px', color: 'var(--fg-muted)' }}>—</span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

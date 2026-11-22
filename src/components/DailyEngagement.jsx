import React from 'react';
import { Shield, Flame } from 'lucide-react';
import { addDays, dateKey } from '../lib/rules.js';
import { Icon, InlineFeedback } from './ui/index.js';
import FrictionMicroSurvey from './Common/FrictionMicroSurvey.jsx';

export default function DailyEngagement({ gamification, checkins = [] }) {
  const today = dateKey();
  const previousDates = checkins
    .filter((c) => !c.deleted && c.habit_date < today)
    .map((c) => c.habit_date)
    .sort();
  const comeback = previousDates.length > 0 && previousDates.at(-1) <= addDays(today, -4);
  const g = gamification;

  if (!g && !comeback) return null;

  return (
    <div className="daily-engagement" style={{ display: 'grid', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
      {g && (
        <section
          aria-label="Seri ve koruma durumu"
          className="daily-engagement-card"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface-1)',
          }}
        >
          <div
            className="mono daily-engagement-meta"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 'var(--space-2) var(--space-4)',
              fontSize: '12px',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', color: g.streak > 0 ? 'var(--signal-text)' : 'var(--fg-muted)' }}>
              <Icon icon={Flame} size={14} />
              {g.streak} gün seri
            </span>
            <span className="daily-engagement-freezes" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--fg-muted)' }}>
              <Icon icon={Shield} size={14} />
              {g.streakFreezes} seri koruması
            </span>
          </div>

          {g.isStreakFrozenToday && (
            <InlineFeedback message="Kaçırılan gün için seri koruması uygulandı." tone="neutral" />
          )}
        </section>
      )}

      {comeback && (
        <aside
          style={{
            padding: 'var(--space-4)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface-1)',
          }}
        >
          <strong className="mono" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Kaldığın yerden devam et
          </strong>
          <p style={{ fontSize: '13px', color: 'var(--fg-muted)', marginTop: 'var(--space-1)', marginBottom: 'var(--space-3)' }}>
            Bir ara kaydedildi. İstikrarı yeniden kurmak için bugün tek bir adım işaretle.
          </p>
          <FrictionMicroSurvey todayIso={today} />
        </aside>
      )}
    </div>
  );
}

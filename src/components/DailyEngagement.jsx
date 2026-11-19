import React from 'react';
import { Shield, Flame, CheckSquare } from 'lucide-react';
import { addDays, dateKey } from '../lib/rules.js';
import { Button, Icon, ActivityItem, InlineFeedback } from './ui/index.js';
import FrictionMicroSurvey from './Common/FrictionMicroSurvey.jsx';

export default function DailyEngagement({ gamification, checkins = [], socialInbox = [], onDismissInbox }) {
  const today = dateKey();
  const previousDates = checkins
    .filter((c) => !c.deleted && c.habit_date < today)
    .map((c) => c.habit_date)
    .sort();
  const comeback = previousDates.length > 0 && previousDates.at(-1) <= addDays(today, -4);
  const g = gamification;

  if (!socialInbox.length && !g && !comeback) return null;

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
      {socialInbox.map((item) => (
        <aside
          key={item.id}
          aria-label="Üye mesajı"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface-1)',
          }}
        >
          <ActivityItem
            actor={item.sender_display || item.senderDisplayName || 'Üye'}
            summary={item.message}
          >
            <Button variant="secondary" onClick={() => onDismissInbox?.(item.id)}>
              Onayla
            </Button>
          </ActivityItem>
        </aside>
      ))}

      {g && (
        <section
          aria-labelledby="daily-review-title"
          style={{
            padding: 'var(--space-4)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface-1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
            }}
          >
            <div>
              <h2
                id="daily-review-title"
                className="mono"
                style={{
                  margin: '0 0 var(--space-1)',
                  fontSize: '14px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <Icon icon={CheckSquare} size={16} />
                Günlük Özet
              </h2>
              <p className="mono" style={{ margin: 0, fontSize: '12px', color: 'var(--fg-muted)' }}>
                {g.todayCompletedCount} / {g.questTarget} hedef tamamlandı
              </p>
            </div>
            <Button
              variant="primary"
              disabled={!g.isQuestCompleted || g.isQuestClaimed}
              onClick={g.claimDailyChest}
            >
              {g.isQuestClaimed
                ? 'Günlük özet kaydedildi'
                : g.isQuestCompleted
                  ? 'Günlük özeti kaydet'
                  : 'Hedefleri tamamla'}
            </Button>
          </div>

          <div
            className="mono"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--space-2) var(--space-4)',
              marginTop: 'var(--space-3)',
              paddingTop: 'var(--space-3)',
              borderTop: '1px solid var(--border)',
              fontSize: '12px',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', color: g.streak > 0 ? 'var(--signal-text)' : 'var(--fg-muted)' }}>
              <Icon icon={Flame} size={14} />
              {g.streak} gün seri
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--fg-muted)' }}>
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
            Ritme geri dön
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

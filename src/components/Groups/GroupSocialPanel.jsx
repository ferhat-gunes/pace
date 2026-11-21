import React, { useEffect, useMemo, useState } from 'react';
import * as api from '../../lib/api.js';
import { NUDGE_PRESETS } from '../../lib/notifications.js';
import { dateKey } from '../../lib/rules.js';
import { groupWeekSummary, groupDayState, latestGroupLog } from '../../lib/group-ui.js';
import {
  Button,
  GroupMemberRow,
  InlineFeedback,
  Reaction,
  ActivityItem,
} from '../ui/index.js';

const CHEER_PRESETS = [
  { emoji: '', label: 'TEBRİK', text: 'İstikrarlı tempo. Aynen devam.' },
  { emoji: '', label: 'TAMAM', text: 'Hedef tamamlandı. Sağlam disiplin.' },
  { emoji: '', label: 'RİTİM', text: 'Güçlü hafta. Standardı koru.' },
];

export default function GroupSocialPanel({
  group,
  members = [],
  habits = [],
  checkins = [],
  reactions = [],
  user,
  anchor,
  weekStart = 1,
  gamification,
  onRefresh,
  onSocialRefresh,
}) {
  const [choice, setChoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!choice) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (!busy) setChoice(null);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [choice, busy]);

  const rows = useMemo(
    () =>
      members
        .map((member) => {
          const sums = habits.map((h) => groupWeekSummary(h, checkins, member.user_id, anchor, weekStart));
          const total = sums.reduce((n, s) => n + s.elapsed, 0);
          const done = sums.reduce((n, s) => n + s.completed, 0);
          return {
            member,
            done,
            total,
            percentage: total ? Math.round((done / total) * 100) : 0,
            cheers: reactions.filter((r) => r.target_user_id === member.user_id && r.reaction_type === 'cheer').length,
          };
        })
        .sort((a, b) => b.percentage - a.percentage),
    [members, habits, checkins, reactions, anchor, weekStart],
  );

  const allDone =
    members.length > 1 &&
    habits.length > 0 &&
    members.every((m) =>
      habits.every((h) => groupDayState(h, latestGroupLog(checkins, h.id, m.user_id, dateKey()), dateKey()) === 'Tamamlandı'),
    );

  const send = async (preset) => {
    if (!choice || busy) return;
    setBusy(true);
    setNotice(null);
    const cleanText = String(preset.text || '').replace(/!/g, '.');
    try {
      const r = await api.sendGroupReaction(group.id, {
        target_user_id: choice.member.user_id,
        reaction_type: choice.type,
        emoji: '',
        message: cleanText,
        habit_date: dateKey(),
      });
      if (!r?.reaction?.id) throw new Error('Gönderim sunucu tarafından doğrulanamadı.');
      gamification?.addXp?.(choice.type === 'cheer' ? 10 : 5, 'group-reaction');
      setNotice({ text: choice.type === 'cheer' ? 'Tebrik gönderildi.' : 'Hatırlatma gönderildi.' });
      setChoice(null);
      await onRefresh?.();
      await onSocialRefresh?.();
    } catch (e) {
      setNotice({ error: true, text: e.message || 'Tepki gönderilemedi. Yeniden dene.' });
    } finally {
      setBusy(false);
    }
  };

  const toggleChoice = (member, type) => {
    if (busy || !user) return;
    setNotice(null);
    setChoice((prev) => (prev?.member.user_id === member.user_id && prev?.type === type ? null : { member, type }));
  };

  return (
    <section aria-labelledby="group-social-title">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-3)',
        }}
      >
        <div>
          <h3 id="group-social-title" style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
            Ortak İlerleme
          </h3>
          <p className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)', marginTop: 'var(--space-1)' }}>
            Geçen planlı günlere göre hesaplanır. Üye başına günlük en fazla 3 tepki.
          </p>
        </div>
      </div>

      {notice && <InlineFeedback message={notice.text} tone={notice.error ? 'danger' : 'signal'} />}
      {allDone && <InlineFeedback message="Tüm üyeler bugünün ortak hedeflerini tamamladı." tone="signal" />}

      <div style={{ border: '1px solid var(--border)', marginTop: 'var(--space-3)' }}>
        {rows.map((row) => {
          const isCurrent = row.member.user_id === user?.id;
          const isExpanded = choice?.member.user_id === row.member.user_id;
          const presets = choice?.type === 'cheer' ? CHEER_PRESETS : NUDGE_PRESETS;
          return (
            <div key={row.member.user_id}>
              <GroupMemberRow
                name={row.member.display_name || 'Üye'}
                role={`${row.done}/${row.total} (%${row.percentage})`}
                status={row.percentage >= 100 ? 'done' : 'missed'}
                isCurrentUser={isCurrent}
                streak={row.cheers}
              />
              {!isCurrent && (
                <div
                  style={{
                    display: 'grid',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-2) var(--space-4)',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-1)',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    <Reaction
                      label="TEBRİK"
                      count={row.cheers}
                      onClick={() => toggleChoice(row.member, 'cheer')}
                    />
                    <Button
                      variant={isExpanded && choice?.type === 'nudge' ? 'secondary' : 'tertiary'}
                      size="sm"
                      disabled={busy || !user}
                      aria-expanded={isExpanded && choice?.type === 'nudge'}
                      aria-label={`${row.member.display_name || 'Üye'} kullanıcısına hatırlatma gönder`}
                      onClick={() => toggleChoice(row.member, 'nudge')}
                    >
                      Hatırlat
                    </Button>
                  </div>

                  {isExpanded && (
                    <div
                      style={{
                        border: '1px solid var(--border-strong)',
                        backgroundColor: 'var(--surface-2)',
                        padding: 'var(--space-3)',
                        display: 'grid',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                          {choice.type === 'cheer' ? 'Tebrik mesajı seç' : 'Hatırlatma mesajı seç'}
                        </span>
                        <Button variant="tertiary" size="sm" disabled={busy} onClick={() => setChoice(null)}>
                          Kapat
                        </Button>
                      </div>
                      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                        {presets.map((p) => {
                          const cleanText = String(p.text || '').replace(/!/g, '.');
                          return (
                            <Button
                              key={p.text}
                              variant="secondary"
                              size="sm"
                              disabled={busy}
                              onClick={() => send(p)}
                              style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                            >
                              {cleanText}
                            </Button>
                          );
                        })}
                      </div>
                      {busy && <InlineFeedback message="Gönderiliyor…" tone="neutral" />}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {reactions.length > 0 && (
        <details style={{ marginTop: 'var(--space-4)', border: '1px solid var(--border)', backgroundColor: 'var(--surface-1)' }}>
          <summary className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: '12px', cursor: 'pointer', textTransform: 'uppercase' }}>
            Son grup hareketleri ({reactions.slice(0, 10).length})
          </summary>
          <div>
            {reactions.slice(0, 10).map((r) => (
              <ActivityItem
                key={r.id}
                actor={r.reaction_type === 'cheer' ? 'TEBRİK' : 'HATIRLATMA'}
                summary={String(r.message || 'Grup tepkisi').replace(/!/g, '.')}
                timestamp={r.habit_date}
              />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

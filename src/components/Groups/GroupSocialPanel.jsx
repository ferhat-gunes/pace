import React, { useEffect, useMemo, useState } from 'react';
import * as api from '../../lib/api.js';
import { NUDGE_PRESETS } from '../../lib/notifications.js';
import { dateKey } from '../../lib/rules.js';
import { groupWeekSummary, groupDayState, latestGroupLog } from '../../lib/group-ui.js';
import {
  Button,
  GroupMemberRow,
  InlineFeedback,
  Modal,
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

  const share = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 220 + Math.min(rows.length, 6) * 54;
      const c = canvas.getContext('2d');
      if (!c) throw new Error('Görsel oluşturulamadı.');

      c.fillStyle = '#0E0E0E';
      c.fillRect(0, 0, canvas.width, canvas.height);

      c.strokeStyle = '#373737';
      c.lineWidth = 2;
      c.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

      c.fillStyle = '#F2F0EA';
      c.font = 'bold 28px monospace';
      c.fillText(`PACE / ${group.name}`.slice(0, 45), 32, 54);

      c.fillStyle = '#9A9891';
      c.font = '14px monospace';
      c.fillText('HAFTALIK ORTAK ALIŞKANLIK İLERLEMESİ', 32, 86);

      rows.slice(0, 6).forEach((r, i) => {
        const y = 120 + i * 54;
        const isCurrent = r.member.user_id === user?.id;
        c.fillStyle = '#171717';
        c.fillRect(32, y, 656, 42);
        c.strokeStyle = isCurrent ? '#C8FF2E' : '#373737';
        c.lineWidth = isCurrent ? 2 : 1;
        c.strokeRect(32, y, 656, 42);

        c.fillStyle = isCurrent ? '#C8FF2E' : '#F2F0EA';
        c.font = '16px monospace';
        c.fillText(`${r.member.display_name || 'Üye'}: ${r.done}/${r.total} (%${r.percentage})`, 46, y + 26);
      });

      const a = document.createElement('a');
      a.download = `pace-grup-${dateKey()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      setNotice({ text: 'Grup özeti PNG olarak indirildi.' });
    } catch (e) {
      setNotice({ error: true, text: e.message });
    }
  };

  const presets = choice?.type === 'cheer' ? CHEER_PRESETS : NUDGE_PRESETS;

  return (
    <section style={{ marginTop: 'var(--space-6)' }} aria-labelledby="group-social-title">
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
          <h3 id="group-social-title" style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Ortak İlerleme
          </h3>
          <p className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)', marginTop: 'var(--space-1)' }}>
            Geçen planlı günlere göre hesaplanır. Üye başına günlük en fazla 3 tepki.
          </p>
        </div>
        <Button variant="secondary" onClick={share}>
          PNG özet indir
        </Button>
      </div>

      {notice && <InlineFeedback message={notice.text} tone={notice.error ? 'danger' : 'neutral'} />}
      {allDone && <InlineFeedback message="Tüm üyeler bugünün ortak hedeflerini tamamladı." tone="signal" />}

      <div style={{ border: '1px solid var(--border)', marginTop: 'var(--space-3)' }}>
        {rows.map((row) => {
          const isCurrent = row.member.user_id === user?.id;
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
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-2) var(--space-4)',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-1)',
                  }}
                >
                  <Reaction
                    label="TEBRİK"
                    count={row.cheers}
                    onClick={() => {
                      if (!busy && user) {
                        setChoice({ member: row.member, type: 'cheer' });
                        setNotice(null);
                      }
                    }}
                  />
                  <Button
                    variant="tertiary"
                    disabled={busy || !user}
                    aria-label={`${row.member.display_name || 'Üye'} kullanıcısına hatırlatma gönder`}
                    onClick={() => {
                      setChoice({ member: row.member, type: 'nudge' });
                      setNotice(null);
                    }}
                  >
                    Hatırlat
                  </Button>
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

      <Modal
        open={Boolean(choice)}
        title={
          choice
            ? `${choice.type === 'cheer' ? 'Tebrik' : 'Hatırlatma'}: ${choice.member.display_name || 'Üye'}`
            : ''
        }
        onClose={() => !busy && setChoice(null)}
        footer={
          <Button variant="secondary" disabled={busy} onClick={() => setChoice(null)}>
            İptal
          </Button>
        }
      >
        {notice?.error && <InlineFeedback message={notice.text} tone="danger" />}
        <p className="mono" style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: 'var(--space-3)' }}>
          Göndermek için bir mesaj seç.
        </p>
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          {presets.map((p) => {
            const cleanText = String(p.text || '').replace(/!/g, '.');
            return (
              <Button
                key={p.text}
                variant="secondary"
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
      </Modal>
    </section>
  );
}

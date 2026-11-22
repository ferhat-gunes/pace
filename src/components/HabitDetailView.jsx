import React, { useMemo, useState } from 'react';
import { ArrowLeft, Pencil, Pause, Play, Archive, RotateCcw, UserPlus, UserMinus, LogOut, Trash2, Users } from 'lucide-react';
import { addDays, dateKey, formatNumber, formatTarget, isPlannedOn, latestCheckins, recordFor, settingsAt, stateFor } from '../lib/rules.js';
import { describeHabitRules } from '../lib/habit-form.js';
import { dailyCompletion, habitStatistics, habitStreak } from '../lib/statistics.js';
import { Button, IconButton, StatBlock, StatusMarker, EmptyState, InlineFeedback, Confirmation } from './ui/index.js';

const shortDay = (day) => new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(new Date(day + 'T12:00:00'));

export default function HabitDetailView({
  habit,
  checkins = [],
  participantCheckins = [],
  user = null,
  guestMode = false,
  weekStart = 1,
  onBack,
  onEdit,
  onTogglePause,
  onArchiveHabit,
  onRestoreHabit,
  onDeleteHabit,
  onLeaveHabit,
  onRemoveParticipant,
  onInviteHabit,
}) {
  const todayIso = dateKey();
  const normalized = useMemo(() => latestCheckins(checkins), [checkins]);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

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
  const isOwner = !habit.role || habit.role === 'owner';
  const participants = Array.isArray(habit.participants) ? habit.participants : [];
  const isSoleParticipant = participants.length <= 1;
  const canInvite = Boolean(user && !guestMode && !effective.archived_at && typeof onInviteHabit === 'function');

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

  const runAction = async (key, fn, { goBack = false } = {}) => {
    if (busy) return;
    setBusy(key);
    setActionError('');
    try {
      await fn?.();
      if (goBack) onBack?.();
    } catch (err) {
      if (err?.code === 'REQUIRES_DELETE') {
        setConfirmLeave(false);
        setConfirmDelete(true);
      } else {
        setActionError(err.message || 'İşlem tamamlanamadı.');
      }
    } finally {
      setBusy('');
    }
  };

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

        {isOwner && (
          <IconButton
            label={`${effective.name} alışkanlığını düzenle`}
            onClick={() => onEdit?.(habit)}
          >
            <Pencil size={18} strokeWidth={1.5} aria-hidden="true" />
          </IconButton>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 680 }}>
        {actionError && (
          <InlineFeedback tone="error" role="alert">
            {actionError}
          </InlineFeedback>
        )}

        <header style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
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
          {isOwner && (
            <Button type="button" variant="secondary" size="sm" onClick={() => onEdit?.(habit)}>
              <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
              <span>Düzenle</span>
            </Button>
          )}
        </section>

        {(participants.length > 0 || canInvite) && (
          <section
            aria-label="Katılımcılar"
            style={{
              border: '1px solid var(--border)',
              background: 'var(--surface-1)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <div className="mono" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Users size={14} strokeWidth={1.75} aria-hidden="true" />
                <span>Katılımcılar ({participants.length || 1})</span>
              </div>
              {canInvite && (
                <Button type="button" variant="secondary" size="sm" disabled={Boolean(busy)} onClick={() => onInviteHabit?.(habit)}>
                  <UserPlus size={14} strokeWidth={1.5} aria-hidden="true" />
                  <span>Arkadaş Davet Et</span>
                </Button>
              )}
            </div>

            {participants.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {participants.map((p) => {
                  const isMe = Boolean(p.is_me || (user?.id && p.user_id === user.id));
                  let pDone = false;
                  let pLabel = 'Bekliyor';
                  if (isMe) {
                    pDone = todayState.status === 'done';
                    pLabel = pDone ? 'Tamamlandı' : 'Bekliyor';
                  } else {
                    const pc = participantCheckins.find(
                      (c) => c.habit_id === habit.id && c.user_id === p.user_id && c.habit_date === todayIso
                    );
                    const pVal = Number(pc?.value || 0);
                    const target = Number(effective.target || 1);
                    pDone = effective.tracking === 'check'
                      ? pVal >= 1
                      : effective.direction === 'at_most'
                        ? Boolean(pc) && pVal <= target
                        : pVal >= target;
                    pLabel = pDone
                      ? 'Tamamlandı'
                      : effective.tracking === 'quantity' && pc
                        ? `${formatNumber(pVal)} / ${formatNumber(target)} ${effective.unit || ''}`.trim()
                        : 'Bekliyor';
                  }

                  return (
                    <div
                      key={p.user_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-2) var(--space-3)',
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <StatusMarker status={pDone ? 'done' : 'missed'} size={10} />
                        <strong className="mono" style={{ fontSize: '13px' }}>
                          @{p.username || 'uye'}{isMe ? ' (Sen)' : ''}
                        </strong>
                        {p.role === 'owner' && (
                          <span className="mono" style={{ fontSize: '10px', padding: '1px 5px', border: '1px solid var(--border)', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                            Sahip
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span className="mono" style={{ fontSize: '12px', color: pDone ? 'var(--signal-text)' : 'var(--fg-muted)' }}>
                          {pLabel}
                        </span>
                        {isOwner && !isMe && (
                          <Button
                            type="button"
                            variant="tertiary"
                            size="sm"
                            disabled={Boolean(busy)}
                            onClick={() => setRemoveTarget(p)}
                          >
                            <UserMinus size={14} strokeWidth={1.5} aria-hidden="true" />
                            <span>Çıkar</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

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

        <section
          aria-label="Alışkanlık yönetimi"
          style={{
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div className="mono" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
            Yönetim
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {isOwner && !effective.archived_at && onTogglePause && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={Boolean(busy)}
                loading={busy === 'pause'}
                onClick={() => runAction('pause', () => onTogglePause({ ...effective, id: habit.id }))}
              >
                {effective.paused ? <Play size={14} strokeWidth={1.5} aria-hidden="true" /> : <Pause size={14} strokeWidth={1.5} aria-hidden="true" />}
                <span>{effective.paused ? 'Sürdür' : 'Duraklat'}</span>
              </Button>
            )}

            {isOwner && !effective.archived_at && onArchiveHabit && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={Boolean(busy)}
                loading={busy === 'archive'}
                onClick={() => runAction('archive', () => onArchiveHabit(habit.id), { goBack: true })}
              >
                <Archive size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>Arşivle</span>
              </Button>
            )}

            {isOwner && effective.archived_at && onRestoreHabit && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={Boolean(busy)}
                loading={busy === 'restore'}
                onClick={() => runAction('restore', () => onRestoreHabit(habit.id))}
              >
                <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>Geri Yükle</span>
              </Button>
            )}

            {user && !guestMode && onLeaveHabit && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={Boolean(busy)}
                onClick={() => {
                  if (isSoleParticipant && isOwner) {
                    setConfirmDelete(true);
                  } else {
                    setConfirmLeave(true);
                  }
                }}
              >
                <LogOut size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>Alışkanlıktan Ayrıl</span>
              </Button>
            )}

            {isOwner && onDeleteHabit && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={Boolean(busy)}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>Kalıcı Sil</span>
              </Button>
            )}
          </div>
        </section>
      </div>

      <Confirmation
        open={Boolean(removeTarget)}
        title="Katılımcıyı çıkar"
        message={`@${removeTarget?.username || 'uye'} kullanıcısını bu alışkanlıktan çıkarmak istediğine emin misin?`}
        confirmLabel="Evet, Çıkar"
        cancelLabel="Vazgeç"
        destructive
        onConfirm={() => {
          const targetId = removeTarget?.user_id;
          setRemoveTarget(null);
          if (targetId) runAction('remove', () => onRemoveParticipant?.(habit.id, targetId));
        }}
        onCancel={() => setRemoveTarget(null)}
      />

      <Confirmation
        open={confirmLeave}
        title="Alışkanlıktan ayrıl"
        message={
          isOwner
            ? 'Bu alışkanlıktan ayrıldığında sahiplik en eski katılımcıya devredilir ve kendi kayıtların silinir. Devam etmek istiyor musun?'
            : 'Bu alışkanlıktan ayrıldığında kendi günlük kayıtların silinir. Devam etmek istiyor musun?'
        }
        confirmLabel="Evet, Ayrıl"
        cancelLabel="Vazgeç"
        destructive
        onConfirm={() => {
          setConfirmLeave(false);
          runAction('leave', () => onLeaveHabit?.(habit.id), { goBack: true });
        }}
        onCancel={() => setConfirmLeave(false)}
      />

      <Confirmation
        open={confirmDelete}
        title="Alışkanlığı kalıcı olarak sil"
        message={`"${effective.name}" ve tüm kayıtları geri döndürülemez şekilde silinecek. Devam etmek istiyor musun?`}
        confirmLabel="Evet, Kalıcı Sil"
        cancelLabel="Vazgeç"
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          runAction('delete', () => onDeleteHabit?.(habit.id), { goBack: true });
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </section>
  );
}


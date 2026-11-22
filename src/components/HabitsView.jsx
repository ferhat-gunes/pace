import { settingsAt, dateKey } from '../lib/rules.js';
import React, { useMemo, useRef, useState } from 'react';
import { Archive, RotateCcw, Pause, Plus, ChevronRight, Users } from 'lucide-react';
import { describeHabitRules } from '../lib/habit-form.js';
import { Button, SearchInput, EmptyState, InlineFeedback } from './ui/index.js';
import './HabitForm.css';

function rulesDescription(habit) {
  try {
    return describeHabitRules({
      ...habit,
      schedule: habit.schedule || { type: 'daily' },
      progression: habit.progression || { enabled: false },
      debt: habit.debt || { enabled: false },
    });
  } catch {
    return 'Plan ayrıntılarını düzenleyerek gözden geçirebilirsin.';
  }
}

export default function HabitsView({
  habits = [],
  onOpenAddModal,
  onOpenHabitDetail,
  restoreHabit,
  lastArchivedHabit,
  setLastArchivedHabit,
}) {
  const [pendingId, setPendingId] = useState(null);
  const actionLock = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const effectiveHabits = habits.map((h) => ({
    ...settingsAt(h, dateKey()),
    id: h.id,
    versions: h.versions,
    participants: h.participants,
  }));
  const current = effectiveHabits.filter((h) => !h.archived_at);
  const archived = effectiveHabits.filter((h) => Boolean(h.archived_at));
  const activeCount = current.filter((h) => !h.paused).length;
  const pausedCount = current.length - activeCount;
  const sharedCount = current.filter((h) => (h.participants?.length || 0) > 1).length;
  const showFilterChips = pausedCount > 0 || sharedCount > 0;

  const matching = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return (h) => !query || h.name.toLocaleLowerCase('tr-TR').includes(query);
  }, [search]);

  const shownCurrent = current.filter((h) => {
    if (!matching(h)) return false;
    if (statusFilter === 'active') return !h.paused;
    if (statusFilter === 'paused') return Boolean(h.paused);
    if (statusFilter === 'shared') return (h.participants?.length || 0) > 1;
    return true;
  });
  const shownArchived = archived.filter(matching);

  const act = async (id, action, success) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setPendingId(id);
    setError('');
    setMessage('');
    try {
      if (typeof action !== 'function') throw new Error('Bu işlem şu anda kullanılamıyor. Lütfen yeniden dene.');
      const result = await action();
      if (result === false || result?.success === false) throw new Error(result?.error || 'İşlem tamamlanamadı.');
      setMessage(success);
    } catch (err) {
      setError(err.message || 'İşlem tamamlanamadı. Lütfen yeniden dene.');
    } finally {
      actionLock.current = false;
      setPendingId(null);
    }
  };

  const row = (habit, isArchived = false) => {
    const participantCount = habit.participants?.length || 0;
    return (
      <article
        key={habit.id}
        className="habit-row habit-management-row"
        aria-busy={pendingId === habit.id}
        style={{ padding: 0 }}
      >
        <button
          type="button"
          onClick={() => {
            setError('');
            onOpenHabitDetail?.(habit);
          }}
          aria-label={`${habit.name} detaylarını aç`}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            padding: 'var(--space-4)',
            background: 'transparent',
            border: 0,
            color: 'inherit',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <div className="habit-main">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <strong className="habit-name">{habit.name}</strong>
              {participantCount > 1 && (
                <span
                  className="mono"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--fg)',
                  }}
                >
                  <Users size={12} strokeWidth={1.75} aria-hidden="true" />
                  {participantCount}
                </span>
              )}
            </div>
            <span className="habit-rule-description">{rulesDescription(habit)}</span>
            {(isArchived || habit.paused) && (
              <span className="habit-status-label mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: '12px' }}>
                {isArchived ? (
                  <>
                    <Archive size={14} strokeWidth={1.5} aria-hidden="true" />
                    Arşivlendi
                  </>
                ) : (
                  <>
                    <Pause size={14} strokeWidth={1.5} aria-hidden="true" />
                    Duraklatıldı — yeniden başlatana kadar planlanmaz
                  </>
                )}
              </span>
            )}
          </div>
          <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--fg-muted)' }} />
        </button>
      </article>
    );
  };

  return (
    <section className="page-view" id="view-habits" aria-labelledby="habits-title">
      <div
        className="page-heading"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-6)',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div>
          <h1 id="habits-title" style={{ margin: 0 }}>Alışkanlıklar</h1>
          <p className="section-subtitle mono" style={{ margin: 'var(--space-1) 0 0' }}>
            {activeCount} aktif alışkanlık{pausedCount > 0 ? ` · ${pausedCount} duraklatılmış` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Button variant="primary" size="md" aria-label="Yeni alışkanlık ekle" onClick={onOpenAddModal}>
            <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>Alışkanlık Ekle</span>
          </Button>
        </div>
      </div>

      {error && (
        <InlineFeedback
          tone="error"
          role="alert"
          action={<Button variant="tertiary" size="sm" onClick={() => setError('')}>Mesajı kapat</Button>}
        >
          {error}
        </InlineFeedback>
      )}

      {message && !lastArchivedHabit && (
        <InlineFeedback tone="neutral" role="status" aria-live="polite">
          {message}
        </InlineFeedback>
      )}

      {lastArchivedHabit && (
        <InlineFeedback
          tone="neutral"
          role="status"
          aria-live="polite"
          action={
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                variant="secondary"
                size="sm"
                disabled={Boolean(pendingId)}
                onClick={() => act(lastArchivedHabit.id, () => restoreHabit?.(lastArchivedHabit.id), 'Son arşivleme işlemi geri alındı.')}
              >
                <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>Geri Al</span>
              </Button>
              {setLastArchivedHabit && (
                <Button variant="tertiary" size="sm" aria-label="Arşivleme bildirimini kapat" onClick={() => setLastArchivedHabit(null)}>
                  Kapat
                </Button>
              )}
            </div>
          }
        >
          <strong>{lastArchivedHabit.name}</strong> arşive kaldırıldı. Geçmiş kayıtların korunur.
        </InlineFeedback>
      )}

      {habits.length > 5 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <SearchInput
            id="habit-search"
            label="Alışkanlıklarında ara"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder="Alışkanlık adı"
          />
        </div>
      )}

      {showFilterChips && (
        <div className="segmented-control" role="group" aria-label="Alışkanlık durum filtresi" style={{ marginBottom: 'var(--space-4)' }}>
          {[
            ['all', 'Tümü'],
            ['active', 'Aktif'],
            ...(sharedCount > 0 ? [['shared', 'Ortak']] : []),
            ...(pausedCount > 0 ? [['paused', 'Duraklatılmış']] : []),
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`segmented-item ${statusFilter === value ? 'is-selected' : ''}`}
              aria-pressed={statusFilter === value}
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {search.trim() && (
        <p className="sr-only" role="status" aria-live="polite">
          {shownCurrent.length} aktif veya duraklatılmış, {shownArchived.length} arşivlenmiş alışkanlık bulundu.
        </p>
      )}

      {current.length === 0 ? (
        <EmptyState
          title={archived.length ? 'Alışkanlıkların arşivde' : 'İlk küçük adımını seç'}
          description={
            archived.length
              ? 'Aşağıdaki arşivden bir alışkanlığı yeniden başlatabilir veya yeni bir alışkanlık ekleyebilirsin.'
              : 'Kendine uygun bir hedef belirle; zaman içinde düzenleyip kendi düzenini kurabilirsin.'
          }
          action={
            <Button variant="primary" onClick={onOpenAddModal}>
              {archived.length ? 'Yeni alışkanlık ekle' : 'İlk Alışkanlığını Ekle'}
            </Button>
          }
        />
      ) : shownCurrent.length === 0 ? (
        <EmptyState
          title="Eşleşen alışkanlık yok"
          description={
            search.trim()
              ? `"${search}" için aktif veya duraklatılmış alışkanlık bulunamadı.`
              : 'Seçili filtrede alışkanlık bulunamadı.'
          }
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
            >
              Filtreyi temizle
            </Button>
          }
        />
      ) : (
        <div id="all-habits-list" className="habit-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {shownCurrent.map((habit) => row(habit))}
        </div>
      )}

      {archived.length > 0 && (
        <details id="archived-habits" className="archive-section" style={{ marginTop: 'var(--space-8)' }}>
          <summary className="mono" style={{ cursor: 'pointer', fontWeight: 600 }}>
            Arşivlenenler ({archived.length})
          </summary>
          <p className="habit-rule-description" style={{ marginTop: 'var(--space-2)' }}>
            Arşivlemek eski kayıtları silmez. Bir alışkanlığı arşivden çıkararak yeniden planlayabilirsin.
          </p>
          <div id="archive-list" className="habit-list" style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {shownArchived.length ? shownArchived.map((habit) => row(habit, true)) : <p>Arşivde bu aramayla eşleşen alışkanlık yok.</p>}
          </div>
        </details>
      )}
    </section>
  );
}

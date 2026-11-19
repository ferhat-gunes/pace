import { settingsAt, dateKey } from '../lib/rules.js';
import React, { useMemo, useRef, useState } from 'react';
import { Archive, RotateCcw, Pause, Play, Plus, Compass, ChevronRight } from 'lucide-react';
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
  onOpenDiscover,
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

  const effectiveHabits = habits.map((h) => ({ ...settingsAt(h, dateKey()), id: h.id, versions: h.versions }));
  const current = effectiveHabits.filter((h) => !h.archived_at);
  const archived = effectiveHabits.filter((h) => Boolean(h.archived_at));
  const activeCount = current.filter((h) => !h.paused).length;
  const pausedCount = current.length - activeCount;

  const matching = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return (h) => !query || h.name.toLocaleLowerCase('tr-TR').includes(query);
  }, [search]);

  const shownCurrent = current.filter(matching);
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

  const row = (habit, isArchived = false) => (
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
          <strong className="habit-name">{habit.name}</strong>
          <span className="habit-rule-description">{rulesDescription(habit)}</span>
          <span className="habit-status-label mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: '12px' }}>
            {isArchived ? (
              <>
                <Archive size={14} strokeWidth={1.5} aria-hidden="true" />
                Arşivlendi
              </>
            ) : habit.paused ? (
              <>
                <Pause size={14} strokeWidth={1.5} aria-hidden="true" />
                Duraklatıldı — yeniden başlatana kadar planlanmaz
              </>
            ) : (
              <>
                <Play size={14} strokeWidth={1.5} aria-hidden="true" />
                Aktif
              </>
            )}
          </span>
        </div>
        <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--fg-muted)' }} />
      </button>
    </article>
  );

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
            {activeCount} aktif rutin{pausedCount > 0 ? ` · ${pausedCount} duraklatılmış` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {onOpenDiscover && (
            <Button variant="secondary" size="md" aria-label="Rutin şablonlarını keşfet" onClick={onOpenDiscover}>
              <Compass size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>Keşfet</span>
            </Button>
          )}
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

      {habits.length > 0 && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
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

      {search.trim() && (
        <p className="sr-only" role="status" aria-live="polite">
          {shownCurrent.length} aktif veya duraklatılmış, {shownArchived.length} arşivlenmiş alışkanlık bulundu.
        </p>
      )}

      {current.length === 0 ? (
        <EmptyState
          title={archived.length ? 'Rutinlerin arşivde' : 'İlk küçük adımını seç'}
          description={
            archived.length
              ? 'Aşağıdaki arşivden bir rutini yeniden başlatabilir veya yeni bir alışkanlık ekleyebilirsin.'
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
          description={`"${search}" için aktif veya duraklatılmış alışkanlık bulunamadı.`}
          action={
            <Button variant="secondary" onClick={() => setSearch('')}>
              Aramayı temizle
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
            Arşivlemek eski kayıtları silmez. Bir rutini arşivden çıkararak yeniden planlayabilirsin.
          </p>
          <div id="archive-list" className="habit-list" style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {shownArchived.length ? shownArchived.map((habit) => row(habit, true)) : <p>Arşivde bu aramayla eşleşen alışkanlık yok.</p>}
          </div>
        </details>
      )}
    </section>
  );
}

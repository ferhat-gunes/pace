import React, { useState } from 'react';
import { Plus, Archive, RotateCcw, AlertCircle } from 'lucide-react';
import { formatTarget } from '../lib/rules';

export default function HabitsView({
  habits = [],
  onOpenAddModal,
  archiveHabit,
  restoreHabit,
  lastArchivedHabit,
  setLastArchivedHabit,
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [confirmArchiveId, setConfirmArchiveId] = useState(null);

  const activeHabits = habits.filter((h) => !h.archived_at);
  const archivedHabits = habits.filter((h) => Boolean(h.archived_at));

  const handleArchiveConfirm = (id) => {
    archiveHabit?.(id);
    setConfirmArchiveId(null);
  };

  return (
    <section className="page-view" id="view-habits" aria-labelledby="habits-title">
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 id="habits-title" style={{ margin: 0, fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--forest)' }}>
            Alışkanlıklar
          </h1>
          <p className="section-subtitle" style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0' }}>
            {activeHabits.length} aktif rutin
          </p>
        </div>
        <button
          type="button"
          className="button button-primary add-habit-trigger"
          aria-label="Yeni alışkanlık ekle"
          style={{ minHeight: '44px', padding: '0 20px', fontSize: '14px' }}
          onClick={onOpenAddModal}
        >
          Alışkanlık Ekle +
        </button>
      </div>

      {/* Undo Toast Notification */}
      {lastArchivedHabit && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--forest-soft)',
            border: '1px solid var(--forest-border)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: 'var(--forest-dark)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <Archive size={16} />
            <span><strong>{lastArchivedHabit.name}</strong> arşive kaldırıldı.</span>
          </div>
          <button
            type="button"
            className="button button-quiet"
            style={{ fontWeight: 700, color: 'var(--forest-dark)', minHeight: '40px' }}
            onClick={() => restoreHabit?.(lastArchivedHabit.id)}
          >
            <RotateCcw size={14} style={{ marginRight: '6px' }} />
            Geri Al
          </button>
        </div>
      )}

      {/* Active Habits List */}
      {activeHabits.length === 0 ? (
        <div className="empty-state panel-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--forest-soft)', color: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            📋
          </div>
          <h2 style={{ fontSize: '18px', color: 'var(--forest)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
            Henüz aktif bir alışkanlık yok
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>
            Kendine küçük ve sakin bir hedef belirleyerek başla.
          </p>
          <button
            type="button"
            className="button button-primary add-habit-trigger"
            style={{ minHeight: '48px', padding: '0 24px' }}
            onClick={onOpenAddModal}
          >
            İlk Alışkanlığını Ekle +
          </button>
        </div>
      ) : (
        <div id="all-habits-list" className="habit-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activeHabits.map((h) => (
            <div
              key={h.id}
              className="habit-row"
              style={{
                minHeight: '64px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              <div className="habit-main">
                <strong className="habit-name" style={{ fontSize: '15px', color: 'var(--ink)' }}>{h.name}</strong>
                <span className="habit-meta" style={{ color: 'var(--muted)', fontSize: '12px', display: 'block', marginTop: '2px' }}>
                  {formatTarget(h)}
                </span>
              </div>
              <div className="habit-actions">
                {confirmArchiveId === h.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Emin misin?</span>
                    <button
                      type="button"
                      className="button button-quiet"
                      style={{ fontSize: '13px', padding: '0 12px', minHeight: '44px' }}
                      onClick={() => setConfirmArchiveId(null)}
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      className="button button-danger-quiet"
                      style={{ fontSize: '13px', padding: '0 14px', minHeight: '44px' }}
                      onClick={() => handleArchiveConfirm(h.id)}
                    >
                      Evet, Arşivle
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="button button-quiet"
                    style={{ fontSize: '13px', padding: '0 16px', minHeight: '44px' }}
                    aria-label={`${h.name} alışkanlığını arşivle`}
                    onClick={() => setConfirmArchiveId(h.id)}
                  >
                    Arşivle
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archived Section with Restore */}
      {archivedHabits.length > 0 && (
        <details
          id="archived-habits"
          className="archive-section"
          open={showArchived}
          onToggle={(e) => setShowArchived(e.target.open)}
          style={{ marginTop: '32px' }}
        >
          <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--muted)', padding: '8px 0' }}>
            Arşivlenenler ({archivedHabits.length})
          </summary>
          <div id="archive-list" className="habit-list" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {archivedHabits.map((h) => (
              <div
                key={h.id}
                className="habit-row"
                style={{
                  opacity: 0.85,
                  background: 'var(--surface-alt)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div className="habit-main">
                  <strong className="habit-name" style={{ fontSize: '14px' }}>{h.name}</strong>
                  <span className="habit-meta" style={{ color: 'var(--muted)', fontSize: '12px', display: 'block', marginTop: '2px' }}>
                    {formatTarget(h)} • Arşivlendi
                  </span>
                </div>
                <div className="habit-actions">
                  <button
                    type="button"
                    className="button button-quiet"
                    style={{
                      fontSize: '13px',
                      padding: '0 14px',
                      minHeight: '44px',
                      color: 'var(--forest)',
                      fontWeight: 600,
                    }}
                    aria-label={`${h.name} alışkanlığını arşivden çıkar ve geri yükle`}
                    onClick={() => restoreHabit?.(h.id)}
                  >
                    <RotateCcw size={14} style={{ marginRight: '6px' }} />
                    Geri Yükle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

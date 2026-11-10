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
      <div className="page-heading">
        <div>
          <h1 id="habits-title">Alışkanlıklar</h1>
          <p className="section-subtitle">{activeHabits.length} aktif rutin</p>
        </div>
        <button
          type="button"
          className="button button-primary add-habit-trigger"
          aria-label="Yeni alışkanlık ekle"
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
            style={{ fontWeight: 700, color: 'var(--forest-dark)' }}
            onClick={() => restoreHabit?.(lastArchivedHabit.id)}
          >
            <RotateCcw size={14} style={{ marginRight: '4px' }} />
            Geri Al
          </button>
        </div>
      )}

      {/* Active Habits List */}
      {activeHabits.length === 0 ? (
        <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', color: 'var(--forest)', marginBottom: '8px' }}>
            Henüz aktif bir alışkanlık yok
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>
            Kendine küçük bir hedef koyarak başla.
          </p>
          <button
            type="button"
            className="button button-primary add-habit-trigger"
            onClick={onOpenAddModal}
          >
            İlk Alışkanlığını Ekle +
          </button>
        </div>
      ) : (
        <div id="all-habits-list" className="habit-list">
          {activeHabits.map((h) => (
            <div key={h.id} className="habit-row" style={{ minHeight: '64px' }}>
              <div className="habit-main">
                <strong className="habit-name" style={{ fontSize: '16px' }}>{h.name}</strong>
                <span className="habit-meta" style={{ color: 'var(--muted)', fontSize: '13px' }}>
                  {formatTarget(h)}
                </span>
              </div>
              <div className="habit-actions">
                {confirmArchiveId === h.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Emin misin?</span>
                    <button
                      type="button"
                      className="button button-quiet"
                      style={{ fontSize: '12px', padding: '4px 8px', height: '36px' }}
                      onClick={() => setConfirmArchiveId(null)}
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      className="button"
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        height: '36px',
                        background: 'var(--red-soft)',
                        color: 'var(--red)',
                        borderColor: 'var(--red)',
                      }}
                      onClick={() => handleArchiveConfirm(h.id)}
                    >
                      Evet, Arşivle
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="button button-quiet"
                    style={{ fontSize: '13px', padding: '8px 14px', height: '40px' }}
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
          <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--muted)' }}>
            Arşivlenenler ({archivedHabits.length})
          </summary>
          <div id="archive-list" className="habit-list" style={{ marginTop: '12px' }}>
            {archivedHabits.map((h) => (
              <div
                key={h.id}
                className="habit-row"
                style={{ opacity: 0.85, background: 'var(--surface-alt)' }}
              >
                <div className="habit-main">
                  <strong className="habit-name">{h.name}</strong>
                  <span className="habit-meta">{formatTarget(h)} • Arşivlendi</span>
                </div>
                <div className="habit-actions">
                  <button
                    type="button"
                    className="button button-quiet"
                    style={{
                      fontSize: '13px',
                      padding: '8px 12px',
                      height: '40px',
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

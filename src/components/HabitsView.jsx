import React, { useState } from 'react';
import { Plus, Archive, RotateCcw, AlertCircle, Pencil, Pause, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { playPop, playSuccess } from '../lib/soundFx';
import { formatTarget } from '../lib/rules';

export default function HabitsView({
  habits = [],
  onOpenAddModal,
  onEditHabit,
  togglePauseHabit,
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
    playPop();
    archiveHabit?.(id);
    setConfirmArchiveId(null);
  };

  return (
    <section className="page-view" id="view-habits" aria-labelledby="habits-title">
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 id="habits-title" style={{ margin: 0, fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--ink)', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Alışkanlıklar
          </h1>
          <p className="section-subtitle" style={{ color: 'var(--muted)', fontSize: '13px', margin: '4px 0 0' }}>
            {activeHabits.length} aktif rutin
          </p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95, y: 2 }}
          className="btn-3d btn-3d-green"
          aria-label="Yeni alışkanlık ekle"
          style={{ minHeight: '44px', padding: '0 18px', fontSize: '14px', borderRadius: '14px' }}
          onClick={() => {
            playPop();
            onOpenAddModal();
          }}
        >
          Alışkanlık Ekle +
        </motion.button>
      </div>

      {/* Undo Toast Notification */}
      {lastArchivedHabit && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          role="status"
          aria-live="polite"
          className="card-chunky"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
            background: 'var(--green-soft)',
            borderColor: 'var(--green-soft)',
            borderBottomColor: 'var(--green)',
            marginBottom: '16px',
            color: 'var(--green-dark)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <Archive size={16} />
            <span><strong>{lastArchivedHabit.name}</strong> arşive kaldırıldı.</span>
          </div>
          <button
            type="button"
            className="btn-3d btn-3d-gray"
            style={{ fontWeight: 700, color: 'var(--green-dark)', minHeight: '44px', padding: '0 14px', borderRadius: '12px' }}
            onClick={() => {
              playSuccess();
              restoreHabit?.(lastArchivedHabit.id);
            }}
          >
            <RotateCcw size={14} style={{ marginRight: '6px' }} />
            Geri Al
          </button>
        </motion.div>
      )}

      {/* Active Habits List */}
      {activeHabits.length === 0 ? (
        <div className="empty-state card-chunky" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: '54px', height: '54px', borderRadius: '18px', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '26px' }}>
            📋
          </div>
          <h2 style={{ fontSize: '20px', color: 'var(--ink)', marginBottom: '8px', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Henüz aktif bir alışkanlık yok
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
            Kendine küçük ve sakin bir hedef belirleyerek başla.
          </p>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95, y: 2 }}
            className="btn-3d btn-3d-green"
            style={{ minHeight: '48px', padding: '0 24px', borderRadius: '16px' }}
            onClick={() => {
              playPop();
              onOpenAddModal();
            }}
          >
            İlk Alışkanlığını Ekle +
          </motion.button>
        </div>
      ) : (
        <div id="all-habits-list" className="habit-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeHabits.map((h) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="habit-row card-chunky"
              style={{
                minHeight: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                opacity: h.paused ? 0.72 : 1,
              }}
            >
              <div className="habit-main" style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <strong className="habit-name" style={{ fontSize: '16px', color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>{h.name}</strong>
                  {h.paused && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '8px',
                        background: 'var(--orange-soft)',
                        color: 'var(--orange-dark)',
                      }}
                    >
                      Duraklatıldı
                    </span>
                  )}
                </div>
                <span className="habit-meta" style={{ color: 'var(--muted)', fontSize: '12px', display: 'block', marginTop: '2px', fontWeight: 600 }}>
                  {formatTarget(h)}
                </span>
              </div>
              <div className="habit-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {confirmArchiveId === h.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Emin misin?</span>
                    <button
                      type="button"
                      className="btn-3d btn-3d-gray"
                      style={{ fontSize: '12px', padding: '0 14px', minHeight: '44px', borderRadius: '12px' }}
                      onClick={() => setConfirmArchiveId(null)}
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      className="btn-3d btn-3d-danger"
                      style={{ fontSize: '12px', padding: '0 14px', minHeight: '44px', borderRadius: '12px' }}
                      onClick={() => handleArchiveConfirm(h.id)}
                    >
                      Evet, Arşivle
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-3d btn-3d-gray"
                      style={{ fontSize: '12px', padding: '0 14px', minHeight: '44px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      aria-label={`${h.name} alışkanlığını düzenle`}
                      onClick={() => {
                        playPop();
                        onEditHabit?.(h);
                      }}
                    >
                      <Pencil size={13} aria-hidden="true" />
                      <span>Düzenle</span>
                    </button>
                    <button
                      type="button"
                      className="btn-3d btn-3d-gray"
                      style={{ fontSize: '12px', padding: '0 14px', minHeight: '44px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      aria-label={h.paused ? `${h.name} alışkanlığını devam ettir` : `${h.name} alışkanlığını duraklat`}
                      onClick={() => {
                        playPop();
                        togglePauseHabit?.(h.id);
                      }}
                    >
                      {h.paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
                      <span>{h.paused ? 'Devam Et' : 'Duraklat'}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-3d btn-3d-gray"
                      style={{ fontSize: '12px', padding: '0 14px', minHeight: '44px', borderRadius: '12px' }}
                      aria-label={`${h.name} alışkanlığını arşivle`}
                      onClick={() => {
                        playPop();
                        setConfirmArchiveId(h.id);
                      }}
                    >
                      Arşivle
                    </button>
                  </>
                )}
              </div>
            </motion.div>
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
          <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--muted)', padding: '12px 0' }}>
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
                  flexWrap: 'wrap',
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
                    className="btn-3d btn-3d-gray"
                    style={{
                      fontSize: '13px',
                      padding: '0 14px',
                      minHeight: '44px',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      borderRadius: '12px',
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

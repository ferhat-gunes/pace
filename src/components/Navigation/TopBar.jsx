import React, { useState } from 'react';
import { Flame, Gem, Zap } from 'lucide-react';
import { playPop } from '../../lib/soundFx';

export default function TopBar({
  setView,
  user,
  onOpenAuth,
  syncState,
  streak = 1,
  streakFreezes = 2,
  isStreakFrozenToday = false,
  buyStreakFreeze,
  gems = 35,
  level = 1,
  xp = 0,
}) {
  const initial = user?.email ? user.email[0].toUpperCase() : 'P';
  const [showShieldModal, setShowShieldModal] = useState(false);
  const [shieldFeedback, setShieldFeedback] = useState(null);

  return (
    <header className="topbar" role="banner" style={{ flexWrap: 'wrap', gap: '8px 12px' }}>
      <button
        type="button"
        className="mobile-brand"
        data-view="today"
        aria-label="PACE ana sayfa"
        onClick={() => {
          playPop();
          setView?.('today');
        }}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #58CC02 0%, #1CB0F6 100%)',
            boxShadow: '0 3px 0 #1899D6',
            color: '#FFFFFF',
            fontSize: '18px',
            fontWeight: 900,
          }}
          aria-hidden="true"
        >
          ⚡
        </span>
        <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.8px', color: 'var(--ink)' }}>
          pace
        </span>
      </button>

      {/* Gamification Stats Bar */}
      <div
        className="gamify-stats-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        role="group"
        aria-label="Oyun İstatistikleri"
      >
        {/* Streak Flame */}
        <div
          className="gamify-badge flame-badge"
          title={`${streak} gün aralıksız seri! Kalkan detayları için dokun.`}
          aria-label={`${streak} günlük seri`}
          onClick={() => {
            playPop();
            setShowShieldModal(true);
          }}
          style={{ cursor: 'pointer' }}
        >
          <span className="flame-icon-pulse" aria-hidden="true">🔥</span>
          <span>{streak}</span>
        </div>

        {/* Streak Freeze Shield Badge */}
        <div
          className={`gamify-badge shield-badge ${isStreakFrozenToday ? 'shield-badge-active' : ''}`}
          title={`${streakFreezes} Seri Kalkanı mevcut. Detaylar ve satın almak için dokun.`}
          aria-label={`${streakFreezes} seri kalkanı`}
          onClick={() => {
            playPop();
            setShowShieldModal(true);
          }}
          style={{
            cursor: 'pointer',
            background: isStreakFrozenToday ? 'var(--blue-soft, #E0F2FE)' : 'var(--surface-alt)',
            border: isStreakFrozenToday ? '1px solid var(--blue, #0284C7)' : '1px solid var(--border)',
          }}
        >
          <span aria-hidden="true">{isStreakFrozenToday ? '❄️' : '🛡️'}</span>
          <span style={{ fontWeight: 800, color: isStreakFrozenToday ? 'var(--blue-dark, #0369A1)' : 'inherit' }}>
            {streakFreezes}
          </span>
        </div>

        {/* Gems */}
        <div
          className="gamify-badge gem-badge"
          title={`${gems} Elmas`}
          aria-label={`${gems} elmas`}
          onClick={playPop}
        >
          <span aria-hidden="true">💎</span>
          <span>{gems}</span>
        </div>

        {/* Level & XP */}
        <div
          className="gamify-badge xp-badge"
          title={`Seviye ${level} (${xp} XP)`}
          aria-label={`Seviye ${level}`}
          onClick={playPop}
        >
          <span aria-hidden="true">⚡</span>
          <span>L{level}</span>
        </div>
      </div>

      {/* Streak Shield Modal */}
      {showShieldModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shield-modal-title"
          onClick={() => setShowShieldModal(false)}
        >
          <div
            className="dialog-sheet card-chunky"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', margin: 'auto' }}
          >
            <div className="sheet-handle" aria-hidden="true"></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <h2 id="shield-modal-title" style={{ margin: 0, fontSize: '18px', color: 'var(--ink)' }}>
                  Seri Kurtarma Kalkanı
                </h2>
              </div>
              <button
                type="button"
                className="button-icon icon-button"
                aria-label="Kapat"
                onClick={() => setShowShieldModal(false)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 16px' }}>
              Yoğun bir günde veya seyahatte check-in yapmayı unuttuğunda serin sıfırlanmaz! Kalkanın otomatik olarak devreye girerek serini dondurur ve korur.
            </p>

            {isStreakFrozenToday && (
              <div
                style={{
                  background: 'var(--blue-soft, #E0F2FE)',
                  border: '1.5px solid var(--blue, #38BDF8)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '22px' }}>❄️</span>
                <div style={{ fontSize: '13px', color: 'var(--blue-dark, #0369A1)', fontWeight: 600 }}>
                  <strong>Kalkan Devrede!</strong> Dün kaçırdığın gün için serin korundu. Bugün hedeflerini tamamlayarak serini büyütmeye devam et!
                </div>
              </div>
            )}

            <div
              style={{
                background: 'var(--surface-alt)',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', display: 'block' }}>
                  Mevcut Kalkan Sayısı
                </span>
                <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--ink)' }}>
                  {streakFreezes} Adet
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', display: 'block' }}>
                  Mevcut Bakiye
                </span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--blue)' }}>
                  💎 {gems}
                </span>
              </div>
            </div>

            {shieldFeedback && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: shieldFeedback.type === 'success' ? 'var(--green-soft)' : 'var(--red-soft, #FEE2E2)',
                  color: shieldFeedback.type === 'success' ? 'var(--green-dark)' : 'var(--red-dark, #B91C1C)',
                }}
              >
                {shieldFeedback.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-3d btn-3d-gray"
                style={{ minHeight: '44px', padding: '0 16px', fontSize: '13px' }}
                onClick={() => setShowShieldModal(false)}
              >
                Kapat
              </button>
              <button
                type="button"
                className="btn-3d btn-3d-green"
                style={{ minHeight: '44px', padding: '0 20px', fontSize: '14px' }}
                onClick={() => {
                  const res = buyStreakFreeze?.(25);
                  if (res) {
                    setShieldFeedback({ type: res.success ? 'success' : 'error', message: res.message });
                    setTimeout(() => setShieldFeedback(null), 3000);
                  }
                }}
              >
                🛡️ Kalkan Satın Al (25 💎)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {syncState && (
          <span
            className="mobile-sync-badge"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '8px',
              background: syncState === 'Kaydedildi' ? 'var(--green-soft)' : 'var(--orange-soft)',
              color: syncState === 'Kaydedildi' ? 'var(--green-dark)' : 'var(--orange-dark)',
            }}
            aria-live="polite"
          >
            {syncState}
          </span>
        )}

        {/* User avatar */}
        <button
          type="button"
          className="avatar-button"
          id="account-button"
          aria-label={user?.email ? `Hesap ayarları (${user.email})` : 'Giriş yap veya hesap oluştur'}
          onClick={() => {
            playPop();
            if (user?.email && user.email !== 'demo@pace.app') {
              setView?.('settings');
            } else {
              onOpenAuth?.();
            }
          }}
        >
          {initial}
        </button>
      </div>
    </header>
  );
}

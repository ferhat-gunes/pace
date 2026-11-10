import React from 'react';

export default function TopBar({ setView, user, onOpenAuth, syncState }) {
  const initial = user?.email ? user.email[0].toUpperCase() : 'P';

  return (
    <header className="topbar" role="banner">
      <button
        type="button"
        className="mobile-brand"
        data-view="today"
        aria-label="PACE ana sayfa"
        onClick={() => setView?.('today')}
      >
        <span>pace</span>
      </button>

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {syncState && (
          <span
            className="mobile-sync-badge"
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '10px',
              background: syncState === 'Kaydedildi' ? 'var(--forest-soft)' : 'var(--orange-soft)',
              color: syncState === 'Kaydedildi' ? 'var(--forest)' : 'var(--orange-dark)',
            }}
            aria-live="polite"
          >
            {syncState}
          </span>
        )}

        <button
          type="button"
          className="avatar-button"
          id="account-button"
          aria-label={user?.email ? `Hesap ayarları (${user.email})` : 'Giriş yap veya hesap oluştur'}
          onClick={() => {
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

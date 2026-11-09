import React from 'react';

export default function TopBar({ setView, user, onOpenAuth }) {
  const initial = user?.email ? user.email[0].toUpperCase() : 'P';

  return (
    <header className="topbar">
      <button
        type="button"
        className="mobile-brand"
        data-view="today"
        aria-label="PACE ana sayfa"
        onClick={() => setView?.('today')}
      >
        <span>pace</span>
      </button>

      <span id="topbar-date" className="sr-only" aria-hidden="true"></span>

      <div className="topbar-actions">
        <button
          type="button"
          className="avatar-button"
          id="account-button"
          aria-label="Hesap ayarları"
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

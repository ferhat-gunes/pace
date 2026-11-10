import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function TopBar({ setView, user, onOpenAuth, syncState }) {
  const initial = user?.email ? user.email[0].toUpperCase() : 'P';
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('pace_theme');
      if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        setIsDark(true);
      } else if (savedTheme === 'light') {
        document.documentElement.removeAttribute('data-theme');
        setIsDark(false);
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
        setIsDark(true);
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('pace_theme', 'dark'); } catch {}
    } else {
      document.documentElement.removeAttribute('data-theme');
      try { localStorage.setItem('pace_theme', 'light'); } catch {}
    }
  };

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

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          className="theme-toggle-btn"
          aria-label={isDark ? 'Açık temaya geç' : 'Karanlık temaya geç'}
          title={isDark ? 'Açık temaya geç' : 'Karanlık temaya geç'}
          onClick={toggleTheme}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

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

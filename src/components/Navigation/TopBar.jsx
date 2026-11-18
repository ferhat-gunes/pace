import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider.jsx';
import * as api from '../../lib/api.js';
import { IconButton } from '../ui/index.js';

export default function TopBar({ setView, user, onOpenAuth, syncState, streak = 0 }) {
  const initial = user?.email ? user.email[0].toLocaleUpperCase('tr-TR') : 'P';
  const { mode, setPreference } = useTheme();
  const isDark = mode === 'dark';
  const isDemo = api.demoMode;
  const isSynced = syncState === 'Kaydedildi' || syncState === 'Güncel';

  return (
    <header className="topbar" role="banner">
      <button
        type="button"
        className="mobile-brand"
        data-view="today"
        aria-label="PACE ana sayfa"
        onClick={() => setView?.('today')}
      >
        <span>PACE</span>
      </button>

      <span className="topbar-note mono">
        {streak > 0 ? (
          <>
            SERİ: <strong style={{ color: 'var(--signal-text)' }}>{streak}</strong> GÜN
          </>
        ) : (
          'GÜNLÜK TAKİP'
        )}
      </span>

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {syncState && (
          <span
            className="mobile-sync-badge mono"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            title={syncState}
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: 'var(--space-1) var(--space-2)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: isSynced ? 'var(--signal-text)' : 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {syncState}
          </span>
        )}

        <IconButton
          label={isDark ? 'Açık temaya geç' : 'Karanlık temaya geç'}
          onClick={() => setPreference(isDark ? 'light' : 'dark')}
        >
          {isDark ? <Sun size={18} strokeWidth={1.5} aria-hidden="true" /> : <Moon size={18} strokeWidth={1.5} aria-hidden="true" />}
        </IconButton>

        <button
          type="button"
          className="avatar-button mono"
          id="account-button"
          aria-label={
            isDemo
              ? 'Demodan çık ve kendi hesabına giriş yap'
              : user?.email
                ? `Hesap ayarları (${user.email})`
                : 'Giriş yap veya hesap oluştur'
          }
          onClick={() => {
            if (isDemo) api.exitDemo();
            else if (user?.email) setView?.('settings');
            else onOpenAuth?.();
          }}
        >
          {initial}
        </button>
      </div>
    </header>
  );
}

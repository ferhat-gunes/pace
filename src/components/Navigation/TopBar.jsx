import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider.jsx';
import * as api from '../../lib/api.js';

export default function TopBar({ setView, user, onOpenAuth, syncState }) {
  const initial = user?.email ? user.email[0].toLocaleUpperCase('tr-TR') : 'P';
  const { mode, setPreference } = useTheme();
  const isDark = mode === 'dark';
  const isDemo = api.demoMode;
  const successful = syncState === 'Kaydedildi' || syncState === 'Güncel';
  return (
    <header className="topbar" role="banner">
      <button type="button" className="mobile-brand" data-view="today" aria-label="PACE ana sayfa" onClick={() => setView?.('today')}><span>pace</span></button>
      <span className="topbar-note">Küçük adımlar, güzel alışkanlıklar.</span>
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {syncState && <span className="mobile-sync-badge" role="status" aria-live="polite" aria-atomic="true" title={syncState} style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: successful ? 'var(--forest-soft)' : 'var(--orange-soft)', color: successful ? 'var(--forest)' : 'var(--orange-dark)' }}>{syncState}</span>}
        <button type="button" className="theme-toggle-btn" aria-label={isDark ? 'Açık temaya geç' : 'Karanlık temaya geç'} title={isDark ? 'Açık temaya geç' : 'Karanlık temaya geç'} onClick={() => setPreference(isDark ? 'light' : 'dark')}>{isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}</button>
        <button type="button" className="avatar-button" id="account-button" aria-label={isDemo ? 'Demodan çık ve kendi hesabına giriş yap' : user?.email ? `Hesap ayarları (${user.email})` : 'Giriş yap veya hesap oluştur'} onClick={() => {
          if (isDemo) api.exitDemo();
          else if (user?.email) setView?.('settings');
          else onOpenAuth?.();
        }}>{initial}</button>
      </div>
    </header>
  );
}

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Flame, Gem, Zap, Volume2, VolumeX } from 'lucide-react';
import { isSoundEnabled, toggleSound, playPop } from '../../lib/soundFx';

export default function TopBar({
  setView,
  user,
  onOpenAuth,
  syncState,
  streak = 1,
  gems = 35,
  level = 1,
  xp = 0,
}) {
  const initial = user?.email ? user.email[0].toUpperCase() : 'P';
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
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
    playPop();
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

  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundOn(next);
  };

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
      >
        <span>pace</span>
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
          title={`${streak} gün aralıksız seri!`}
          aria-label={`${streak} günlük seri`}
          onClick={playPop}
        >
          <span className="flame-icon-pulse" aria-hidden="true">🔥</span>
          <span>{streak}</span>
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

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {syncState && (
          <span
            className="mobile-sync-badge"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '8px',
              background: syncState === 'Kaydedildi' ? 'var(--forest-soft)' : 'var(--orange-soft)',
              color: syncState === 'Kaydedildi' ? 'var(--forest)' : 'var(--orange-dark)',
            }}
            aria-live="polite"
          >
            {syncState}
          </span>
        )}

        {/* Sound toggle button */}
        <button
          type="button"
          className="sound-toggle-btn"
          aria-label={soundOn ? 'Sesi Kapat' : 'Sesi Aç'}
          title={soundOn ? 'Sesi Kapat' : 'Sesi Aç'}
          onClick={handleToggleSound}
        >
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        {/* Theme toggle button */}
        <button
          type="button"
          className="theme-toggle-btn"
          aria-label={isDark ? 'Açık temaya geç' : 'Karanlık temaya geç'}
          title={isDark ? 'Açık temaya geç' : 'Karanlık temaya geç'}
          onClick={toggleTheme}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

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

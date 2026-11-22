import React from 'react';
import { CalendarDays, ListChecks, Compass, ChartNoAxesColumnIncreasing, Settings, LogIn, UserCheck } from 'lucide-react';
import * as api from '../../lib/api';
import { isFeatureEnabled } from '../../lib/telemetry';
import { Button } from '../ui/index.js';

export default function Sidebar({ currentView = 'today', setView, syncState = 'Bağlantı hazır', user = null, onOpenAuth }) {
  const items = [
    { id: 'today', label: 'Bugün', icon: CalendarDays },
    { id: 'habits', label: 'Alışkanlıklar', icon: ListChecks },
    ...(isFeatureEnabled('discover_rhythm_trials') ? [{ id: 'discover', label: 'Keşfet', icon: Compass }] : []),
    { id: 'progress', label: 'İlerleme', icon: ChartNoAxesColumnIncreasing },
  ];

  const isDemo = api.isDemo();
  const isAuthenticated = Boolean(user && !isDemo);
  const syncAttr = syncState === 'Kaydedildi' ? 'saved' : syncState === 'Hata' || syncState === 'Çakışma' ? 'error' : 'local';

  return (
    <aside className="sidebar" aria-label="Ana gezinme">
      <a
        className="brand"
        href="#today"
        onClick={(e) => { e.preventDefault(); setView?.('today'); }}
        aria-label="PACE ana sayfa"
      >
        <span>PACE</span>
      </a>

      <p className="sidebar-caption mono">her gün, net bir düzenle</p>
      <nav className="nav-list">
        {items.map((item) => {
          const NavIcon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${isActive ? 'is-active' : ''}`}
              data-view={item.id}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setView?.(item.id)}
            >
              <span className="nav-icon"><NavIcon size={18} strokeWidth={1.5} aria-hidden="true" /></span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <span className="sync-indicator mono" id="sync-indicator" data-state={syncAttr}>
          <i aria-hidden="true" />
          <span>{syncState}</span>
        </span>

        {!isAuthenticated && (
          <Button
            variant="primary"
            size="md"
            onClick={() => onOpenAuth?.('login')}
            style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 'var(--space-2)' }}
          >
            <LogIn size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>{isDemo ? 'Demo’dan Çık & Giriş Yap' : 'Giriş Yap / Kayıt Ol'}</span>
          </Button>
        )}

        {isAuthenticated && (
          <button
            type="button"
            className="nav-item"
            onClick={() => setView?.('settings')}
            title={user.username ? `@${user.username} (${user.email})` : user.email}
            style={{ marginBottom: 'var(--space-1)', color: 'var(--fg)' }}
          >
            <span className="nav-icon" style={{ color: 'var(--signal-text)' }}>
              <UserCheck size={18} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px' }}>
              {user.username ? `@${user.username}` : user.email}
            </span>
          </button>
        )}

        <button
          type="button"
          className={`nav-item settings-link ${currentView === 'settings' ? 'is-active' : ''}`}
          data-view="settings"
          aria-current={currentView === 'settings' ? 'page' : undefined}
          onClick={() => setView?.('settings')}
        >
          <span className="nav-icon"><Settings size={18} strokeWidth={1.5} aria-hidden="true" /></span>
          <span>Ayarlar</span>
        </button>
      </div>
    </aside>
  );
}

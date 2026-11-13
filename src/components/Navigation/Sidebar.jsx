import React from 'react';
import { CalendarDays, ListChecks, ChartNoAxesColumnIncreasing, Users, Settings, LogIn, UserCheck } from 'lucide-react';
import * as api from '../../lib/api';

export default function Sidebar({ currentView = 'today', setView, syncState = 'Bağlantı hazır', user = null, onOpenAuth }) {
  const items = [
    { id: 'today', label: 'Bugün', icon: CalendarDays },
    { id: 'habits', label: 'Alışkanlıklar', icon: ListChecks },
    { id: 'progress', label: 'İlerleme', icon: ChartNoAxesColumnIncreasing },
    { id: 'groups', label: 'Gruplar', icon: Users },
  ];

  const isDemo = api.isDemo();
  const isAuthenticated = Boolean(user && !isDemo);
  const syncAttr = syncState === 'Kaydedildi' ? 'saved' : syncState === 'Hata' || syncState === 'Çakışma' ? 'error' : 'local';

  return (
    <aside className="sidebar astryx-side-nav" data-astryx-component="side-nav" aria-label="Ana gezinme">
      <a
        className="brand"
        href="#today"
        onClick={(e) => { e.preventDefault(); setView?.('today'); }}
        aria-label="PACE ana sayfa"
      >
        <span>pace</span>
      </a>

      <nav className="nav-list">
        {items.map((item) => {
          const Icon = item.icon;
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
              <span className="nav-icon"><Icon aria-hidden="true" /></span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <span className="sync-indicator" id="sync-indicator" data-state={syncAttr}>
          <i></i>
          <span>{syncState}</span>
        </span>

        {!isAuthenticated && (
          <button
            type="button"
            className="nav-item sidebar-auth-cta"
            onClick={() => onOpenAuth?.('login')}
            style={{
              marginBottom: '8px',
              background: 'var(--primary-soft)',
              color: 'var(--primary-dark)',
              borderColor: 'rgba(28, 176, 246, 0.35)',
              fontWeight: 800,
            }}
          >
            <span className="nav-icon"><LogIn aria-hidden="true" /></span>
            <span>{isDemo ? 'Demo’dan Çık & Giriş Yap' : 'Giriş Yap / Kayıt Ol'}</span>
          </button>
        )}

        {isAuthenticated && (
          <button
            type="button"
            className="nav-item"
            onClick={() => setView?.('settings')}
            title={user.email}
            style={{ marginBottom: '4px', color: 'var(--ink)' }}
          >
            <span className="nav-icon" style={{ color: 'var(--green)' }}><UserCheck aria-hidden="true" /></span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>
              {user.email}
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
          <span className="nav-icon"><Settings aria-hidden="true" /></span>
          <span>Ayarlar</span>
        </button>
      </div>
    </aside>
  );
}

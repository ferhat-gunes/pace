import React from 'react';
import { CalendarDays, ListChecks, ChartNoAxesColumnIncreasing, Users, Settings } from 'lucide-react';

export default function Sidebar({ currentView = 'today', setView, syncState = 'Bağlantı hazır' }) {
  const items = [
    { id: 'today', label: 'Bugün', icon: CalendarDays },
    { id: 'habits', label: 'Alışkanlıklar', icon: ListChecks },
    { id: 'progress', label: 'İlerleme', icon: ChartNoAxesColumnIncreasing },
    { id: 'groups', label: 'Gruplar', icon: Users },
  ];

  return (
    <aside className="sidebar astryx-side-nav" data-astryx-component="side-nav" aria-label="Ana gezinme">
      <a
        className="brand"
        href="#today"
        onClick={(e) => { e.preventDefault(); setView?.('today'); }}
        aria-label="PACE ana sayfa"
        style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #58CC02 0%, #1CB0F6 100%)',
            boxShadow: '0 3px 0 #1899D6',
            color: '#FFFFFF',
            fontSize: '20px',
            fontWeight: 900,
          }}
          aria-hidden="true"
        >
          ⚡
        </span>
        <span style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', color: 'var(--ink)' }}>
          pace
        </span>
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
        <span className="sync-indicator" id="sync-indicator">
          <i></i>
          <span>{syncState}</span>
        </span>
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

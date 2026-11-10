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
      <a className="brand" href="#today" onClick={(e) => { e.preventDefault(); setView?.('today'); }} aria-label="PACE ana sayfa">
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

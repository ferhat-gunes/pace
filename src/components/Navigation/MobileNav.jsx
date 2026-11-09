import React from 'react';
import { CalendarDays, ListChecks, ChartNoAxesColumnIncreasing, Users, Settings } from 'lucide-react';

export default function MobileNav({ currentView = 'today', setView }) {
  const items = [
    { id: 'today', label: 'Bugün', icon: CalendarDays },
    { id: 'habits', label: 'Alışkanlıklar', icon: ListChecks },
    { id: 'progress', label: 'İlerleme', icon: ChartNoAxesColumnIncreasing },
    { id: 'groups', label: 'Gruplar', icon: Users },
    { id: 'settings', label: 'Ayarlar', icon: Settings },
  ];

  return (
    <nav className="mobile-nav astryx-mobile-nav" data-astryx-component="mobile-nav" aria-label="Ana gezinme">
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
  );
}

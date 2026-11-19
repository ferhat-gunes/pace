import React from 'react';
import { CalendarDays, ListChecks, ChartNoAxesColumnIncreasing, Users } from 'lucide-react';

export default function MobileNav({ currentView = 'today', setView }) {
  const items = [
    { id: 'today', label: 'Bugün', icon: CalendarDays },
    { id: 'habits', label: 'Alışkanlıklar', icon: ListChecks },
    { id: 'progress', label: 'İlerleme', icon: ChartNoAxesColumnIncreasing },
    { id: 'groups', label: 'Gruplar', icon: Users },
  ];

  return (
    <nav
      className="mobile-nav"
      aria-label="Ana gezinme"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map(({ id, label, icon: NavIcon }) => {
        const isActive = currentView === id || (id === 'habits' && currentView === 'discover');
        return (
          <button
            key={id}
            type="button"
            className={`nav-item ${isActive ? 'is-active' : ''}`}
            data-view={id}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => setView?.(id)}
          >
            <span className="nav-icon">
              <NavIcon size={18} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

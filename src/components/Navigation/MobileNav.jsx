import React from 'react';
import { CalendarDays, ListChecks, ChartNoAxesColumnIncreasing } from 'lucide-react';

export default function MobileNav({ currentView = 'today', activeParentView = 'today', setView }) {
  const items = [
    { id: 'today', label: 'Bugün', icon: CalendarDays },
    { id: 'habits', label: 'Alışkanlıklar', icon: ListChecks },
    { id: 'progress', label: 'İlerleme', icon: ChartNoAxesColumnIncreasing },
  ];

  const resolvedParent = ['today', 'habits', 'progress'].includes(activeParentView)
    ? activeParentView
    : 'habits';

  return (
    <nav
      className="mobile-nav"
      aria-label="Ana gezinme"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map(({ id, label, icon: NavIcon }) => {
        const isSubView = currentView === 'habit-detail' || currentView === 'habit-form';
        const isActive =
          currentView === id ||
          (id === 'habits' && currentView === 'discover') ||
          (isSubView && resolvedParent === id);
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
              <NavIcon size={20} strokeWidth={isActive ? 2.25 : 1.5} aria-hidden="true" />
            </span>
            <span className="nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

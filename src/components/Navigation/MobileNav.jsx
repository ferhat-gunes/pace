import React from 'react';
import { CalendarDays, ListChecks, ChartNoAxesColumnIncreasing, Users, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { playPop } from '../../lib/soundFx';
import { triggerHaptic } from '../../lib/celebration';

export default function MobileNav({ currentView = 'today', setView }) {
  const items = [
    { id: 'today', label: 'Bugün', icon: CalendarDays },
    { id: 'habits', label: 'Alışkanlıklar', icon: ListChecks },
    { id: 'progress', label: 'İlerleme', icon: ChartNoAxesColumnIncreasing },
    { id: 'groups', label: 'Gruplar', icon: Users },
    { id: 'settings', label: 'Ayarlar', icon: Settings },
  ];

  return (
    <nav className="mobile-nav" aria-label="Ana gezinme">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <motion.button
            key={item.id}
            type="button"
            className={`nav-item ${isActive ? 'is-active' : ''}`}
            data-view={item.id}
            aria-current={isActive ? 'page' : undefined}
            whileTap={{ scale: 0.92, y: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            onClick={() => {
              playPop();
              triggerHaptic('light');
              setView?.(item.id);
            }}
          >
            {isActive && (
              <motion.div
                layoutId="active-pill-bubble"
                className="nav-active-pill"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              />
            )}
            <motion.span
              className="nav-icon"
              animate={isActive ? { scale: [1, 1.22, 1], rotate: [0, -6, 6, 0] } : { scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <Icon aria-hidden="true" size={22} />
            </motion.span>
            <span className="nav-label">{item.label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
}

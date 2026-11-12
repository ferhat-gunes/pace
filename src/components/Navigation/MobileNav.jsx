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
    <nav className="mobile-nav astryx-mobile-nav" data-astryx-component="mobile-nav" aria-label="Ana gezinme">
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
            whileTap={{ scale: 0.88 }}
            onClick={() => {
              playPop();
              triggerHaptic('light');
              setView?.(item.id);
            }}
          >
            <motion.span
              className="nav-icon"
              animate={isActive ? { scale: [1, 1.25, 1], rotate: [0, -6, 6, 0] } : { scale: 1 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <Icon aria-hidden="true" />
            </motion.span>
            <span>{item.label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
}

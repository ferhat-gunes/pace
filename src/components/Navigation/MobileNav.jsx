import React from 'react';
import { CalendarDays, ListChecks, Compass, ChartNoAxesColumnIncreasing, Users, Settings } from 'lucide-react';
import { playPop } from '../../lib/soundFx';
import { triggerHaptic } from '../../lib/celebration';
import { isFeatureEnabled } from '../../lib/telemetry';

export default function MobileNav({ currentView = 'today', setView }) {
  const items = [
    { id: 'today', label: 'Bugün', icon: CalendarDays },
    { id: 'habits', label: 'Rutinler', icon: ListChecks },
    ...(isFeatureEnabled('discover_rhythm_trials') ? [{ id: 'discover', label: 'Keşfet', icon: Compass }] : []),
    { id: 'progress', label: 'İlerleme', icon: ChartNoAxesColumnIncreasing },
    { id: 'groups', label: 'Gruplar', icon: Users },
    { id: 'settings', label: 'Ayarlar', icon: Settings },
  ];
  return <nav className="mobile-nav astryx-mobile-nav" aria-label="Ana gezinme" style={{gridTemplateColumns:`repeat(${items.length},minmax(0,1fr))`}}>
    {items.map(({id,label,icon:Icon})=><button key={id} type="button" className={`nav-item ${currentView===id?'is-active':''}`} data-view={id} aria-current={currentView===id?'page':undefined} onClick={()=>{playPop();triggerHaptic('light');setView?.(id)}}><span className="nav-icon"><Icon aria-hidden="true" /></span><span className="nav-label">{label}</span></button>)}
  </nav>;
}

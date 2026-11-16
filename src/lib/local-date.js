import { useEffect, useState } from 'react';
import { dateKey } from './rules.js';

export function resolveRolloverSelection(selected, previousToday, nextToday) {
  return selected === previousToday ? nextToday : selected;
}

/** Refresh local calendar identity at midnight and after focus/time-zone changes. */
export function useLocalDate() {
  const [today, setToday] = useState(dateKey);
  useEffect(() => {
    let timer;
    const refresh = () => {
      setToday(dateKey());
      clearTimeout(timer);
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refresh, Math.min(60000, Math.max(100, midnight - now + 30)));
    };
    refresh();
    const visible = () => { if (!document.hidden) refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => { clearTimeout(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visible); };
  }, []);
  return today;
}

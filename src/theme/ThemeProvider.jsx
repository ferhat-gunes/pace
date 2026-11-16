import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Theme } from '@astryxdesign/core';
import { matchaTheme } from '@astryxdesign/theme-matcha/built';
import { THEME_STORAGE_KEY, normalizeThemePreference, readThemePreference, resolveThemeMode } from './theme-state.js';
import '../../assets/astryx-matcha.css';
import '../styles/foundation.css';
import '../styles/scrapbook.css';

const ThemeContext = createContext(null);
const browserPreference = () => {
  try { return readThemePreference(window.localStorage); } catch { return 'system'; }
};
const systemIsDark = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme, ThemeProvider içinde kullanılmalı.');
  return value;
}

export default function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(browserPreference);
  const [systemDark, setSystemDark] = useState(systemIsDark);
  const mode = resolveThemeMode(preference, systemDark);
  const setPreference = useCallback(value => {
    const next = normalizeThemePreference(value);
    try {
      if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch { /* The current session can still change its theme without storage. */ }
    setPreferenceState(next);
    setSystemDark(systemIsDark());
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = event => setSystemDark(event.matches);
    const onStorage = event => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        setPreferenceState(browserPreference());
        setSystemDark(media.matches);
      }
    };
    media.addEventListener('change', onSystemChange);
    window.addEventListener('storage', onStorage);
    return () => {
      media.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    if (mode === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const value = useMemo(() => ({ preference, mode, setPreference }), [preference, mode, setPreference]);
  return <ThemeContext.Provider value={value}><Theme theme={matchaTheme} mode={mode}>{children}</Theme></ThemeContext.Provider>;
}

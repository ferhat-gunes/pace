import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { THEME_STORAGE_KEY, normalizeThemePreference, readThemePreference } from './theme-state.js';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';

const ThemeContext = createContext(null);

const browserPreference = () => {
  try {
    const stored = readThemePreference(window.localStorage);
    return stored === 'light' || stored === 'dark' ? stored : 'dark';
  } catch {
    return 'dark';
  }
};

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider.');
  return value;
}

export default function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(browserPreference);
  const mode = preference === 'light' ? 'light' : 'dark';

  const setPreference = useCallback((value) => {
    const next = normalizeThemePreference(value);
    const resolved = next === 'light' ? 'light' : 'dark';
    try {
      localStorage.setItem(THEME_STORAGE_KEY, resolved);
    } catch {
      /* Storage unavailable; keep in-memory preference. */
    }
    setPreferenceState(resolved);
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        setPreferenceState(browserPreference());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const value = useMemo(() => ({ preference, mode, setPreference }), [preference, mode, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

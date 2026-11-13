import React, { useState, useEffect } from 'react';
import { Theme } from '@astryxdesign/core';
import { matchaTheme } from '@astryxdesign/theme-matcha/built';
import '../../assets/astryx-matcha.css';
import '../styles/brand.css';

export default function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem('pace_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const current = document.documentElement.getAttribute('data-theme');
      setMode(current === 'dark' ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', mode === 'dark' ? '#0F172A' : '#F8FAFD');
    }
  }, [mode]);

  return (
    <Theme theme={matchaTheme} mode={mode}>
      {children}
    </Theme>
  );
}

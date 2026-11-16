import {createRoot} from 'react-dom/client';
import ThemeProvider from './theme/ThemeProvider.jsx';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<ThemeProvider><App /></ThemeProvider>);

if ('serviceWorker' in navigator && import.meta.env.PROD && !window.location.search.includes('noworker')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      const ready = () => window.dispatchEvent(new CustomEvent('pace:update-ready', { detail: registration }));
      if (registration.waiting) ready();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) ready();
        });
      });
      window.addEventListener('online', () => registration.update().catch(() => {}));
    }).catch(err => console.warn('SW registration failed:', err));
  });
}

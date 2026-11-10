import {createRoot} from 'react-dom/client';
import ThemeProvider from './theme/ThemeProvider.jsx';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<ThemeProvider><App /></ThemeProvider>);

if ('serviceWorker' in navigator && !window.location.search.includes('noworker')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

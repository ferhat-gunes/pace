import React, { useState, useEffect } from 'react';
import { Download, Share, X } from 'lucide-react';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Check if already standalone PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Check dismissal cooldown (14 days)
    try {
      const lastDismissed = localStorage.getItem('pace_pwa_dismissed');
      if (lastDismissed && Date.now() - Number(lastDismissed) < 14 * 86400000) {
        return;
      }
    } catch {}

    // Check iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(ua) && !window.MSStream;
    setIsIos(iosDevice);

    // Android/Desktop Chrome install event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (iosDevice) {
      setDismissed(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('pace_pwa_dismissed', Date.now().toString());
    } catch {}
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDismissed(true);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone || dismissed) return null;

  return (
    <aside
      className="pwa-install-banner"
      role="region"
      aria-label="Uygulamayı Yükle"
    >
      <div className="pwa-banner-icon" aria-hidden="true">
        {isIos ? <Share size={20} /> : <Download size={20} />}
      </div>

      <div className="pwa-banner-content">
        <strong className="pwa-banner-title">PACE'i Ana Ekranına Ekle</strong>
        <p className="pwa-banner-subtitle">
          {isIos ? (
            <span>
              Safari'de <strong>Paylaş</strong> simgesine, ardından <strong>"Ana Ekrana Ekle"</strong>ye dokunun.
            </span>
          ) : (
            <span>Hızlı erişim ve çevrimdışı kullanım için cihazına yükle.</span>
          )}
        </p>
      </div>

      <div className="pwa-banner-actions">
        {!isIos && deferredPrompt && (
          <button
            type="button"
            className="button button-primary pwa-btn-install"
            style={{ minHeight: '44px' }}
            onClick={handleInstallClick}
          >
            Yükle
          </button>
        )}
        <button
          type="button"
          className="button button-quiet pwa-btn-dismiss"
          aria-label="Kapat"
          style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          onClick={handleDismiss}
        >
          <X size={22} strokeWidth={2.5} />
        </button>
      </div>
    </aside>
  );
}

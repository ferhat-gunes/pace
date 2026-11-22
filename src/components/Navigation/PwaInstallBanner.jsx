import React, { useState, useEffect } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button, IconButton } from '../ui/index.js';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [installError, setInstallError] = useState('');
  const [installing, setInstalling] = useState(false);

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
    const iosDevice = (/iphone|ipad|ipod/.test(ua) || navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1) && !window.MSStream;
    setIsIos(iosDevice);

    // Android/Desktop Chrome install event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setDismissed(false);
    };

    const installed=()=>{setIsStandalone(true);setDeferredPrompt(null);setDismissed(true);};
    window.addEventListener('appinstalled', installed);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    let visitCount = 1;
    try {
      visitCount = (Number(localStorage.getItem('pace_visit_count')) || 0) + 1;
      localStorage.setItem('pace_visit_count', String(visitCount));
    } catch {}

    if (iosDevice && visitCount >= 2) {
      setDismissed(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('pace_pwa_dismissed', Date.now().toString());
    } catch {}
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt || installing) return;
    setInstalling(true);setInstallError('');
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDismissed(true);
      else setInstallError('Kurulum iptal edildi. Daha sonra tarayıcı menüsünden uygulamayı yükleyebilirsin.');
    } catch { setInstallError('Kurulum başlatılamadı. Tarayıcı menüsündeki yükleme seçeneğini kullanabilirsin.'); }
    finally { setDeferredPrompt(null);setInstalling(false); }
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

      {installError && <p role="status" className="pwa-banner-subtitle">{installError}</p>}
      <div className="pwa-banner-actions">
        {!isIos && deferredPrompt && (
          <Button
            variant="primary"
            size="sm"
            className="pwa-btn-install"
            disabled={installing}
            onClick={handleInstallClick}
          >
            Yükle
          </Button>
        )}
        <IconButton
          icon={X}
          label="Kapat"
          className="pwa-btn-dismiss"
          onClick={handleDismiss}
        />
      </div>
    </aside>
  );
}

import React, { useState } from 'react';
import { Download, Upload, LogOut, Trash2, Calendar, Globe, CheckCircle2, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';
import { isSoundEnabled, toggleSound, playPop } from '../lib/soundFx';
import * as api from '../lib/api';

export default function SettingsView({
  user,
  habits = [],
  checkins = [],
  weekStart = 1,
  updateWeekStart,
  importBackup,
  onSignOut,
}) {
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [soundActive, setSoundActive] = useState(() => isSoundEnabled());
  const [themePreference, setThemePreference] = useState(() => {
    try {
      return localStorage.getItem('pace_theme') || 'system';
    } catch {
      return 'system';
    }
  });

  const handleSoundToggle = () => {
    const nextState = toggleSound();
    setSoundActive(nextState);
    showNotification(nextState ? 'Ses efektleri açıldı.' : 'Ses efektleri kapatıldı.');
  };

  const handleThemeChange = (newTheme) => {
    playPop();
    setThemePreference(newTheme);
    try {
      if (newTheme === 'dark') {
        localStorage.setItem('pace_theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else if (newTheme === 'light') {
        localStorage.setItem('pace_theme', 'light');
        document.documentElement.removeAttribute('data-theme');
      } else {
        localStorage.removeItem('pace_theme');
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }
      showNotification('Tema tercihi güncellendi.');
    } catch {}
  };

  const showNotification = (text, error = false) => {
    setMsg(text);
    setIsError(error);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleExport = () => {
    playPop();
    const data = {
      exported_at: new Date().toISOString(),
      user,
      week_start: weekStart,
      habits,
      checkins,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pace-yedek-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Yedek JSON dosyası olarak başarıyla indirildi.');
  };

  const handleImportFile = (e) => {
    playPop();
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result);
        if (json && Array.isArray(json.habits)) {
          const res = await importBackup?.(json);
          if (res?.success) {
            showNotification(`Yedek başarıyla yüklendi! (${res.count} alışkanlık eşitlendi)`);
          } else {
            showNotification(res?.error || 'Yedek yükleme başarısız.', true);
          }
        } else {
          showNotification('Geçersiz dosya: "habits" listesi bulunamadı.', true);
        }
      } catch {
        showNotification('Dosya okunamadı. Geçerli bir JSON seçin.', true);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleDeleteAccount = async () => {
    try {
      await api.request('account', { method: 'DELETE' }).catch(() => null);
      showNotification('Hesabınız silindi.');
      setTimeout(() => onSignOut?.(), 1000);
    } catch (err) {
      showNotification('Hesap silme başarısız: ' + err.message, true);
    }
  };

  return (
    <section className="page-view" id="view-settings" aria-labelledby="settings-title">
      <div className="page-heading">
        <div>
          <h1 id="settings-title" style={{ fontFamily: 'var(--font-heading)', fontWeight: 800 }}>Ayarlar</h1>
          <p className="section-subtitle">Hesap, sesler, tercihler ve veri güvenliği</p>
        </div>
      </div>

      {msg && (
        <motion.div
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          role="status"
          aria-live="polite"
          className="card-chunky"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: isError ? 'var(--red-soft)' : 'var(--green-soft)',
            borderColor: isError ? 'var(--red)' : 'var(--green-soft)',
            borderBottomColor: isError ? 'var(--red-dark)' : 'var(--green)',
            marginBottom: '20px',
            color: isError ? 'var(--red-dark)' : 'var(--green-dark)',
            fontWeight: 700,
            fontSize: '14px',
          }}
        >
          {isError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{msg}</span>
        </motion.div>
      )}

      <div className="settings-layout" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <section className="settings-section card-chunky">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, margin: '0 0 16px', fontSize: '18px' }}>Hesap Bilgileri</h2>
          <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong id="account-email" style={{ fontSize: '15px' }}>
                {user?.email || 'Örnek Kullanıcı (Çevrimdışı)'}
              </strong>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                {user?.email && user.email !== 'demo@pace.app' ? 'Giriş yapıldı' : 'Verileriniz bu cihazda saklanıyor'}
              </p>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95, y: 2 }}
              className="btn-3d btn-3d-gray"
              style={{ minHeight: '40px', padding: '0 16px', borderRadius: '12px', fontSize: '13px' }}
              onClick={() => {
                playPop();
                onSignOut();
              }}
            >
              <LogOut size={15} style={{ marginRight: '6px' }} />
              Çıkış yap
            </motion.button>
          </div>
        </section>

        <section className="settings-section card-chunky">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, margin: '0 0 16px', fontSize: '18px' }}>Tercihler & Deneyim</h2>

          <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {soundActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
                Dokunsal Oyun Sesleri
              </strong>
              <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                Tamamlama, sandık açma ve buton dokunma sesleri.
              </p>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94, y: 2 }}
              className={`btn-3d ${soundActive ? 'btn-3d-green' : 'btn-3d-gray'}`}
              style={{ minHeight: '40px', padding: '0 16px', borderRadius: '12px', fontSize: '13px' }}
              onClick={handleSoundToggle}
            >
              {soundActive ? 'Açık 🔊' : 'Kapalı 🔇'}
            </motion.button>
          </div>
          <label className="settings-row" htmlFor="week-start-select">
            <div>
              <strong>Haftanın ilk günü</strong>
              <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                Takvim şeridinin ve haftalık hedeflerin başladığı gün.
              </p>
            </div>
            <select
              id="week-start-select"
              value={weekStart}
              onChange={(e) => updateWeekStart?.(Number(e.target.value))}
              style={{
                height: '40px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontWeight: 600,
              }}
            >
              <option value="1">Pazartesi</option>
              <option value="0">Pazar</option>
            </select>
          </label>

          <label className="settings-row" htmlFor="theme-select">
            <div>
              <strong>Görünüm Teması</strong>
              <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                Açık krem, koyu gece veya sistem tercihi.
              </p>
            </div>
            <select
              id="theme-select"
              value={themePreference}
              onChange={(e) => handleThemeChange(e.target.value)}
              style={{
                height: '40px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontWeight: 600,
              }}
            >
              <option value="light">Açık (Krem)</option>
              <option value="dark">Koyu (Gece)</option>
              <option value="system">Sistem</option>
            </select>
          </label>

          <div className="settings-row">
            <div>
              <strong>Saat dilimi</strong>
              <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                Cihaz saat dilimine göre otomatik ayarlanır.
              </p>
            </div>
            <span id="device-timezone" style={{ fontWeight: 600, color: 'var(--ink)' }}>
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </span>
          </div>
        </section>

        <section className="settings-section card-chunky">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, margin: '0 0 16px', fontSize: '18px' }}>Verilerin ve Yedekleme</h2>
          <div className="settings-row">
            <div>
              <strong>Yedekleme & Geri Yükleme</strong>
              <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                Alışkanlıklarını ve kayıt geçmişini JSON dosyası olarak indir veya geri yükle.
              </p>
            </div>
            <div className="heading-actions" style={{ display: 'flex', gap: '8px' }}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95, y: 2 }}
                className="btn-3d btn-3d-gray"
                style={{ minHeight: '44px', padding: '0 16px', borderRadius: '12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={handleExport}
                aria-label="Yedeği JSON olarak dışa aktar"
              >
                <Download size={16} />
                Dışa aktar
              </motion.button>
              <label
                htmlFor="backup-upload-input"
                className="btn-3d btn-3d-gray"
                style={{ cursor: 'pointer', minHeight: '44px', padding: '0 16px', borderRadius: '12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                aria-label="JSON yedeğini yükle"
              >
                <Upload size={16} />
                <span>Yedeği yükle</span>
                <input
                  id="backup-upload-input"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportFile}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px 0', borderTop: '1px solid var(--border)' }}>
            <div>
              <strong style={{ color: 'var(--red)' }}>Hesabı ve Verileri Sil</strong>
              <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                Tüm alışkanlıklarını, kayıtlarını ve oturumlarını kalıcı olarak siler.
              </p>
            </div>
            {confirmDelete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-3d btn-3d-gray"
                  style={{ minHeight: '40px', padding: '0 14px', borderRadius: '12px', fontSize: '13px' }}
                  onClick={() => setConfirmDelete(false)}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  className="btn-3d btn-3d-danger"
                  style={{ minHeight: '40px', padding: '0 16px', borderRadius: '12px', fontSize: '13px' }}
                  onClick={handleDeleteAccount}
                >
                  Evet, Kalıcı Olarak Sil
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-3d btn-3d-danger"
                style={{ minHeight: '40px', padding: '0 16px', borderRadius: '12px', fontSize: '13px' }}
                onClick={() => setConfirmDelete(true)}
              >
                Hesabı Sil
              </button>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

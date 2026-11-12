import React, { useState } from 'react';
import { Download, Upload, LogOut, Trash2, Calendar, Globe, CheckCircle2, AlertTriangle, Volume2, VolumeX, Bell, BellOff, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { isSoundEnabled, toggleSound, playPop } from '../lib/soundFx';
import {
  getNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermission,
  sendLocalNotification,
  isNotificationSupported,
} from '../lib/notifications';
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
  const [notifSettings, setNotifSettings] = useState(() => getNotificationSettings());
  const [themePreference, setThemePreference] = useState(() => {
    try {
      return localStorage.getItem('pace_theme') || 'system';
    } catch {
      return 'system';
    }
  });

  const handleRequestPermission = async () => {
    playPop();
    const perm = await requestNotificationPermission();
    const updated = getNotificationSettings();
    setNotifSettings(updated);
    if (perm === 'granted') {
      showNotification('Bildirim izni verildi! Günlük hatırlatmalar aktif.');
      sendLocalNotification('🎯 PACE Bildirimleri Aktif!', {
        body: 'Alışkanlıklarını tamamlaman için sana her gün hatırlatacağız.',
      });
    } else if (perm === 'denied') {
      showNotification('Bildirim izni reddedildi. Tarayıcı ayarlarından açabilirsiniz.', true);
    }
  };

  const handleToggleNotifications = () => {
    playPop();
    if (notifSettings.permission !== 'granted') {
      handleRequestPermission();
      return;
    }
    const nextEnabled = !notifSettings.enabled;
    saveNotificationSettings({ enabled: nextEnabled });
    setNotifSettings((prev) => ({ ...prev, enabled: nextEnabled }));
    showNotification(nextEnabled ? 'Günlük hatırlatma bildirimleri açıldı.' : 'Hatırlatma bildirimleri kapatıldı.');
  };

  const handleChangeReminderTime = (time) => {
    playPop();
    saveNotificationSettings({ reminderTime: time });
    setNotifSettings((prev) => ({ ...prev, reminderTime: time }));
    showNotification(`Hatırlatma saati ${time} olarak ayarlandı.`);
  };

  const handleTestNotification = async () => {
    playPop();
    if (notifSettings.permission !== 'granted') {
      await handleRequestPermission();
      return;
    }
    const success = await sendLocalNotification('🎯 PACE: Test Bildirimi!', {
      body: 'Harika! Hatırlatma bildirimleri sorunsuz çalışıyor. Ritim bozulmasın!',
      tag: 'pace-test-notification',
    });
    if (success) {
      showNotification('Test bildirimi başarıyla gönderildi! 🔔');
    } else {
      showNotification('Bildirim gönderilemedi. Lütfen tarayıcı izinlerini kontrol edin.', true);
    }
  };

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

          <div className="settings-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '10px', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <strong style={{ fontSize: '15px' }}>Görünüm Teması</strong>
              <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                Akıcı renk geçişiyle açık mod, koyu gece veya sistem modu.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' }}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94, y: 2 }}
                className={`btn-3d ${themePreference === 'light' ? 'btn-3d-green' : 'btn-3d-gray'}`}
                style={{ minHeight: '44px', padding: '8px 4px', fontSize: '13px', borderRadius: '12px' }}
                onClick={() => handleThemeChange('light')}
              >
                ☀️ Açık
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94, y: 2 }}
                className={`btn-3d ${themePreference === 'dark' ? 'btn-3d-green' : 'btn-3d-gray'}`}
                style={{ minHeight: '44px', padding: '8px 4px', fontSize: '13px', borderRadius: '12px' }}
                onClick={() => handleThemeChange('dark')}
              >
                🌙 Koyu
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94, y: 2 }}
                className={`btn-3d ${themePreference === 'system' ? 'btn-3d-green' : 'btn-3d-gray'}`}
                style={{ minHeight: '44px', padding: '8px 4px', fontSize: '13px', borderRadius: '12px' }}
                onClick={() => handleThemeChange('system')}
              >
                ⚙️ Otomatik
              </motion.button>
            </div>
          </div>

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

        {/* Hatırlatıcı & Bildirimler */}
        <section className="settings-section card-chunky">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={20} color="var(--orange)" />
              Hatırlatıcı & Bildirimler
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '8px',
                background: notifSettings.permission === 'granted' && notifSettings.enabled ? 'var(--green-soft)' : 'var(--border)',
                color: notifSettings.permission === 'granted' && notifSettings.enabled ? 'var(--green-dark)' : 'var(--muted)',
              }}
            >
              {notifSettings.permission === 'granted' && notifSettings.enabled ? 'Aktif 🔔' : 'Pasif 🔕'}
            </span>
          </div>

          {/* Permission State Banner if not granted */}
          {notifSettings.permission !== 'granted' && (
            <div
              style={{
                background: notifSettings.permission === 'denied' ? 'var(--red-soft)' : 'var(--orange-soft)',
                border: `1.5px solid ${notifSettings.permission === 'denied' ? 'var(--red)' : 'var(--orange)'}`,
                borderRadius: '14px',
                padding: '12px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                {notifSettings.permission === 'denied' ? <BellOff size={18} color="var(--red)" /> : <Bell size={18} color="var(--orange)" />}
                <p style={{ margin: 0, fontSize: '13px', color: notifSettings.permission === 'denied' ? 'var(--red-dark)' : 'var(--orange-dark)', fontWeight: 600 }}>
                  {notifSettings.permission === 'denied'
                    ? 'Tarayıcı bildirim izni engellendi. Adres çubuğundaki kilit simgesinden izin verebilirsiniz.'
                    : 'Günlük hedeflerini kaçırmamak ve arkadaşlarının dürtmelerini almak için bildirimleri aç.'}
                </p>
              </div>
              {notifSettings.permission !== 'denied' && (
                <button
                  type="button"
                  className="btn-3d btn-3d-orange"
                  style={{ minHeight: '38px', padding: '0 14px', fontSize: '12px', borderRadius: '10px' }}
                  onClick={handleRequestPermission}
                >
                  Bildirimleri Aç 🔔
                </button>
              )}
            </div>
          )}

          {/* Notification Toggle Row */}
          <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bell size={18} />
                Günlük Alışkanlık Hatırlatıcısı
              </strong>
              <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                Günün belirlediğin saatinde tamamlanmamış hedeflerin varsa seni uyarır.
              </p>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94, y: 2 }}
              className={`btn-3d ${notifSettings.enabled && notifSettings.permission === 'granted' ? 'btn-3d-green' : 'btn-3d-gray'}`}
              style={{ minHeight: '40px', padding: '0 16px', borderRadius: '12px', fontSize: '13px' }}
              onClick={handleToggleNotifications}
            >
              {notifSettings.enabled && notifSettings.permission === 'granted' ? 'Açık 🔔' : 'Kapalı 🔕'}
            </motion.button>
          </div>

          {/* Reminder Time Picker & Presets */}
          <div className="settings-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '10px', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={17} />
                  Hatırlatma Saati
                </strong>
                <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                  Günün hangi saatinde bildirim almak istersin?
                </p>
              </div>
              <input
                type="time"
                value={notifSettings.reminderTime}
                onChange={(e) => handleChangeReminderTime(e.target.value)}
                style={{
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  fontWeight: 700,
                  fontSize: '15px',
                }}
              />
            </div>

            {/* Quick Preset Time Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              {['19:00', '20:00', '21:00', '22:00'].map((time) => {
                const isSelected = notifSettings.reminderTime === time;
                return (
                  <button
                    key={time}
                    type="button"
                    className={`btn-3d ${isSelected ? 'btn-3d-orange' : 'btn-3d-gray'}`}
                    style={{ minHeight: '34px', padding: '0 12px', fontSize: '12px', borderRadius: '10px' }}
                    onClick={() => handleChangeReminderTime(time)}
                  >
                    ⏰ {time}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test Notification Row */}
          <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <div>
              <strong>Bildirimleri Test Et</strong>
              <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                Cihazında bildirim ve ses uyarısının çalıştığını anında doğrula.
              </p>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94, y: 2 }}
              className="btn-3d btn-3d-blue"
              style={{ minHeight: '40px', padding: '0 16px', borderRadius: '12px', fontSize: '13px' }}
              onClick={handleTestNotification}
            >
              🔔 Test Gönder
            </motion.button>
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

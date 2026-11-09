import React, { useState } from 'react';
import { Download, Upload, LogOut, Trash2, Calendar, Globe } from 'lucide-react';

export default function SettingsView({ user, habits = [], checkins = [], onSignOut }) {
  const [weekStart, setWeekStart] = useState('1');
  const [msg, setMsg] = useState('');

  const handleExport = () => {
    const data = {
      exported_at: new Date().toISOString(),
      user,
      habits,
      checkins,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pace-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Yedek JSON olarak indirildi');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result);
        if (json.habits && Array.isArray(json.habits)) {
          setMsg('Yedek başarıyla yüklendi! Sayfayı yenileyebilirsiniz.');
        } else {
          setMsg('Geçersiz yedek formatı');
        }
      } catch {
        setMsg('Dosya okuma hatası');
      }
    };
    reader.readAsText(file);
  };

  return (
    <section className="page-view" id="view-settings" aria-labelledby="settings-title">
      <div className="page-heading">
        <div>
          <h1 id="settings-title">Ayarlar</h1>
          <p className="section-subtitle">Hesap, tercihler ve veri güvenliği</p>
        </div>
      </div>

      {msg && (
        <div className="habit-row" style={{ background: 'var(--sage-soft)', borderColor: 'var(--sage)', marginBottom: '16px' }}>
          <strong style={{ color: 'var(--forest)' }}>{msg}</strong>
        </div>
      )}

      <div className="settings-layout">
        <section className="settings-section">
          <h2>Hesap</h2>
          <div className="settings-row">
            <div>
              <strong id="account-email">{user?.email || 'Demo Görünümü'}</strong>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '12px' }}>
                Kullanıcı: @{user?.username || 'demo'}
              </p>
            </div>
            <button type="button" className="button button-quiet" onClick={onSignOut}>
              Çıkış yap
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h2>Tercihler</h2>
          <label className="settings-row">
            <span><strong>Haftanın ilk günü</strong></span>
            <select id="week-start" value={weekStart} onChange={(e) => setWeekStart(e.target.value)}>
              <option value="1">Pazartesi</option>
              <option value="0">Pazar</option>
            </select>
          </label>
          <div className="settings-row">
            <span><strong>Saat dilimi</strong></span>
            <span id="device-timezone">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
          </div>
        </section>

        <section className="settings-section">
          <h2>Verilerin ve Yedekleme</h2>
          <div className="settings-row">
            <div>
              <strong>Yedeğini al ve geri yükle</strong>
              <p>Alışkanlıkların ve kayıtların JSON dosyası olarak iner veya geri yüklenir.</p>
            </div>
            <div className="heading-actions" style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="button button-quiet" onClick={handleExport}>
                Dışa aktar
              </button>
              <label className="button button-quiet" style={{ cursor: 'pointer' }}>
                Yedeği yükle
                <input type="file" accept=".json,application/json" onChange={handleImport} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <strong>Hesabını sil</strong>
              <p>Bu işlem verilerini ve oturumlarını kaldırır.</p>
            </div>
            <button
              type="button"
              className="text-button danger-text"
              onClick={() => {
                if (window.confirm('Tüm verilerini silmek istediğine emin misin?')) onSignOut?.();
              }}
            >
              Hesabı sil
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

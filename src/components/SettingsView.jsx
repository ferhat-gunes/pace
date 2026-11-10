import React, { useState } from 'react';
import { Download, Upload, LogOut, Trash2, Calendar, Globe, CheckCircle2, AlertTriangle } from 'lucide-react';
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

  const showNotification = (text, error = false) => {
    setMsg(text);
    setIsError(error);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleExport = () => {
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
          <h1 id="settings-title">Ayarlar</h1>
          <p className="section-subtitle">Hesap, tercihler ve veri güvenliği</p>
        </div>
      </div>

      {msg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: isError ? 'var(--red-soft)' : 'var(--forest-soft)',
            border: `1px solid ${isError ? 'var(--red)' : 'var(--forest-border)'}`,
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: isError ? 'var(--red)' : 'var(--forest-dark)',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          {isError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{msg}</span>
        </div>
      )}

      <div className="settings-layout">
        <section className="settings-section">
          <h2>Hesap Bilgileri</h2>
          <div className="settings-row">
            <div>
              <strong id="account-email" style={{ fontSize: '15px' }}>
                {user?.email || 'Örnek Kullanıcı (Çevrimdışı)'}
              </strong>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                {user?.email && user.email !== 'demo@pace.app' ? 'Giriş yapıldı' : 'Verileriniz bu cihazda saklanıyor'}
              </p>
            </div>
            <button
              type="button"
              className="button button-quiet"
              style={{ minHeight: '40px' }}
              onClick={onSignOut}
            >
              <LogOut size={16} style={{ marginRight: '6px' }} />
              Çıkış yap
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h2>Tercihler</h2>
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

        <section className="settings-section">
          <h2>Verilerin ve Yedekleme</h2>
          <div className="settings-row">
            <div>
              <strong>Yedekleme & Geri Yükleme</strong>
              <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                Alışkanlıklarını ve kayıt geçmişini JSON dosyası olarak indir veya geri yükle.
              </p>
            </div>
            <div className="heading-actions" style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="button button-quiet"
                style={{ minHeight: '44px', padding: '0 16px' }}
                onClick={handleExport}
                aria-label="Yedeği JSON olarak dışa aktar"
              >
                <Download size={16} style={{ marginRight: '6px' }} />
                Dışa aktar
              </button>
              <label
                htmlFor="backup-upload-input"
                className="button button-quiet"
                style={{ cursor: 'pointer', minHeight: '44px', padding: '0 16px', display: 'inline-flex', alignItems: 'center' }}
                aria-label="JSON yedeğini yükle"
              >
                <Upload size={16} style={{ marginRight: '6px' }} />
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

          <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px 0' }}>
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
                  className="button button-quiet"
                  style={{ minHeight: '44px', padding: '0 14px' }}
                  onClick={() => setConfirmDelete(false)}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  className="button button-danger"
                  style={{ minHeight: '44px', padding: '0 16px' }}
                  onClick={handleDeleteAccount}
                >
                  Evet, Kalıcı Olarak Sil
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="button button-danger-quiet"
                style={{ minHeight: '44px', padding: '0 16px' }}
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

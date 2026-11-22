import React, { useState } from 'react';
import { Download, Upload, LogOut } from 'lucide-react';
import * as api from '../lib/api';
import { BACKUP_LIMITS, backupPreview, buildPersonalBackup } from '../lib/backup.js';
import { dateKey } from '../lib/rules.js';
import AccountSecuritySettings from './Settings/AccountSecuritySettings.jsx';
import NotificationSettings from './Settings/NotificationSettings.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';
import {
  Button,
  Confirmation,
  FormField,
  Header,
  InlineFeedback,
  Select,
  StatBlock,
  TextInput,
} from './ui/index.js';

export default function SettingsView({
  user,
  habits = [],
  checkins = [],
  pendingEntries = [],
  weekStart = 1,
  updateWeekStart,
  updateUsername,
  importBackup,
  onSignOut,
  onClearLocalData,
  setUser,
  guestMode = false,
  guestBackup = null,
  onOpenAuth = null,
  pushEnabled = false,
}) {
  const { preference, setPreference } = useTheme();
  const [notice, setNotice] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [usernameInput, setUsernameInput] = useState(user?.username || '');
  const [editingUsername, setEditingUsername] = useState(false);
  const isDemo = api.demoMode;
  const authorized = Boolean(user?.id) && !isDemo && !guestMode;
  const personalAvailable = authorized || isDemo || guestMode;
  const pendingCount = pendingEntries.length;
  const sharedCount = habits.filter((h) => (h.participants?.length || 0) > 1).length;
  const inform = (message, error = false) => setNotice({ message, error });

  const handleExport = async () => {
    if (busy) return;
    setBusy('export');
    try {
      const source = guestMode
        ? (typeof guestBackup === 'function' ? guestBackup() : guestBackup) || {
            user: null,
            habits,
            checkins,
            week_start: weekStart,
          }
        : await api.exportData();
      const data = buildPersonalBackup({
        user: source.user || user,
        habits: source.habits,
        checkins: source.checkins,
        weekStart: source.week_start ?? weekStart,
        pendingCount,
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      if (blob.size > BACKUP_LIMITS.bytes) {
        throw new Error('Bu yedek desteklenen 2 MiB sınırını aşıyor; içe aktarılabilir bir dosya oluşturulamadı.');
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pace-yedek-${dateKey()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      inform('Yedek indirmesi başlatıldı. Dosyayı sakladığını kontrol et.');
    } catch (err) {
      inform('Yedek oluşturulamadı: ' + err.message, true);
    } finally {
      setBusy('');
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || busy) return;
    setBusy('read');
    setPreview(null);
    try {
      if (file.size > BACKUP_LIMITS.bytes) throw new Error('Dosya en fazla 2 MiB olabilir.');
      const text = await file.text();
      const result = backupPreview(JSON.parse(text), habits);
      setPreview({ ...result, filename: file.name });
      setNotice(null);
    } catch (err) {
      inform('Dosya içe aktarmaya hazır değil: ' + err.message, true);
    } finally {
      setBusy('');
    }
  };

  const confirmImport = async () => {
    if (!preview || busy) return;
    setBusy('import');
    try {
      const result = await importBackup(preview.data);
      if (!result?.success) throw new Error(result?.error || 'Sunucu işlemi doğrulamadı.');
      inform(`${preview.habits} alışkanlık ve ${preview.records} günlük kayıt içe aktarıldı. Dosyadaki geçmiş kurallar korundu.`);
      setPreview(null);
    } catch (err) {
      inform('Yedek içe aktarılamadı: ' + err.message, true);
    } finally {
      setBusy('');
    }
  };

  const handleDeleteAccount = async () => {
    if (!authorized || busy || deletePhrase !== 'SİL') return;
    setBusy('delete');
    try {
      const result = await api.request('account', { method: 'DELETE' });
      if (result?.ok !== true) throw new Error('Sunucu silme işlemini doğrulamadı.');
      inform('Hesabın ve ona bağlı veriler silindi.');
      setConfirmDelete(false);
      await onSignOut?.({ accountDeleted: true });
    } catch (err) {
      inform('Hesap silme başarısız: ' + err.message, true);
    } finally {
      setBusy('');
    }
  };

  const saveWeekStart = async (value) => {
    setBusy('preferences');
    try {
      await updateWeekStart?.(Number(value));
      inform('Haftanın ilk günü kaydedildi.');
    } catch (err) {
      inform('Tercih kaydedilemedi: ' + err.message, true);
    } finally {
      setBusy('');
    }
  };

  const clearLocal = async () => {
    if (!onClearLocalData || busy) return;
    setBusy('clear');
    try {
      await onClearLocalData();
      setConfirmClear(false);
      inform('Bu cihazdaki hesap kopyası temizlendi. Sunucu kayıtların silinmedi.');
    } catch (err) {
      inform('Yerel kopya temizlenemedi: ' + err.message, true);
    } finally {
      setBusy('');
    }
  };

  const sectionStyle = {
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface-1)',
    padding: 'var(--space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-4)',
    paddingTop: 'var(--space-3)',
    borderTop: '1px solid var(--border)',
    flexWrap: 'wrap',
  };

  return (
    <section id="view-settings" aria-labelledby="settings-title" style={{ display: 'flex', flexDirection: 'column' }}>
      <Header title="Ayarlar" subtitle="Görünüm, bildirimler, hesap ve veri yönetimi" />

      <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {notice && (
          <InlineFeedback
            message={notice.message}
            tone={notice.error ? 'danger' : 'signal'}
            action={
              <Button variant="tertiary" size="sm" aria-label="Bildirimi kapat" onClick={() => setNotice(null)}>
                Kapat
              </Button>
            }
          />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-2)' }}>
          <StatBlock label="Alışkanlık" value={habits.length} />
          <StatBlock label="Ortak" value={sharedCount} />
          <StatBlock label="Bekleyen" value={pendingCount} highlight={pendingCount > 0} />
        </div>

        {/* 1. Görünüm & Takvim */}
        <section style={sectionStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Görünüm ve takvim</h2>
          <div style={rowStyle}>
            <div>
              <strong style={{ fontSize: '14px' }}>Görünüm teması</strong>
              <p style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
                Açık, koyu veya sistem tercihi.
              </p>
            </div>
            <div style={{ minWidth: '160px' }}>
              <FormField label="Tema" htmlFor="theme-select">
                <Select
                  id="theme-select"
                  value={preference}
                  onChange={(e) => {
                    setPreference(e.target.value);
                    inform('Tema tercihi güncellendi.');
                  }}
                  options={[
                    { value: 'light', label: 'Açık' },
                    { value: 'dark', label: 'Koyu' },
                    { value: 'system', label: 'Sistem' },
                  ]}
                />
              </FormField>
            </div>
          </div>

          <div style={rowStyle}>
            <div>
              <strong style={{ fontSize: '14px' }}>Haftanın ilk günü</strong>
              <p style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
                Takvim ve haftalık hedeflerin başlangıç günü.
              </p>
            </div>
            <div style={{ minWidth: '160px' }}>
              <FormField label="Gün" htmlFor="week-start-select">
                <Select
                  id="week-start-select"
                  value={weekStart}
                  disabled={Boolean(busy) || !personalAvailable}
                  onChange={(e) => saveWeekStart(e.target.value)}
                  options={[
                    { value: '1', label: 'Pazartesi' },
                    { value: '0', label: 'Pazar' },
                  ]}
                />
              </FormField>
            </div>
          </div>

          <div style={rowStyle}>
            <div>
              <strong style={{ fontSize: '14px' }}>Saat dilimi</strong>
              <p style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
                Kayıtlar cihazının yerel takvimini kullanır.
              </p>
            </div>
            <span id="device-timezone" className="mono" style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </span>
          </div>
        </section>

        {/* 2. Bildirimler & Ses */}
        <NotificationSettings authorized={authorized} pushEnabled={pushEnabled} />

        {/* 3. Hesap & Güvenlik */}
        <section style={sectionStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Hesap ve oturum</h2>
          <div style={rowStyle}>
            <div>
              <strong id="account-email" style={{ fontSize: '14px' }}>
                {isDemo
                  ? 'Örnek hesap (Demo)'
                  : guestMode
                    ? 'Misafir oturumu (yalnızca bu cihaz)'
                    : user?.email || 'Giriş yapılmadı'}
              </strong>
              <p style={{ fontSize: '12px', color: 'var(--fg-muted)', marginTop: 'var(--space-1)' }}>
                {isDemo
                  ? 'Demo verileri yalnızca bu tarayıcıda tutulur.'
                  : guestMode
                    ? 'Rutinlerini cihazlar arasında eşitlemek için hesap oluşturabilir veya giriş yapabilirsin.'
                    : authorized
                      ? 'Verilerin hesabında güvenle eşitlenir.'
                      : 'Kayıtlarını eşitlemek için giriş yap.'}
              </p>
            </div>
            {(authorized || isDemo) && (
              <Button
                variant="secondary"
                disabled={Boolean(busy)}
                onClick={async () => {
                  try {
                    await onSignOut?.();
                  } catch (err) {
                    inform('Çıkış yapılamadı: ' + err.message, true);
                  }
                }}
              >
                <LogOut size={16} aria-hidden="true" />
                {isDemo ? 'Demodan çık' : 'Çıkış yap'}
              </Button>
            )}
          </div>

          {authorized && (
            <div style={rowStyle}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <strong style={{ fontSize: '14px' }}>@kullanıcıadı</strong>
                <p style={{ fontSize: '12px', color: 'var(--fg-muted)', marginTop: 'var(--space-1)' }}>
                  {user?.username
                    ? `Ortak alışkanlıklarda @${user.username} olarak görünürsün.`
                    : 'Henüz belirlenmedi. Arkadaş davet etmek için bir @kullanıcıadı seçebilirsin.'}
                </p>
              </div>
              {editingUsername ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (busy) return;
                    const cleaned = usernameInput.trim().replace(/^@+/, '').toLowerCase();
                    if (!/^[a-z0-9._]{3,24}$/.test(cleaned)) {
                      inform('Kullanıcı adı 3–24 karakter olmalı; yalnızca küçük harf, rakam, nokta ve alt çizgi kullanılabilir.', true);
                      return;
                    }
                    setBusy('username');
                    try {
                      await updateUsername?.(cleaned);
                      setEditingUsername(false);
                      inform(`Kullanıcı adın @${cleaned} olarak kaydedildi.`);
                    } catch (err) {
                      inform(err.message || 'Kullanıcı adı kaydedilemedi.', true);
                    } finally {
                      setBusy('');
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}
                >
                  <TextInput
                    id="settings-username-input"
                    aria-label="Kullanıcı adı"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="ornek.kullanici"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={25}
                    disabled={Boolean(busy)}
                  />
                  <Button type="submit" variant="primary" size="sm" disabled={Boolean(busy)} loading={busy === 'username'}>
                    Kaydet
                  </Button>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    disabled={Boolean(busy)}
                    onClick={() => {
                      setEditingUsername(false);
                      setUsernameInput(user?.username || '');
                    }}
                  >
                    Vazgeç
                  </Button>
                </form>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span className="mono" style={{ fontSize: '13px', fontWeight: 700 }}>
                    {user?.username ? `@${user.username}` : '—'}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={Boolean(busy)}
                    onClick={() => {
                      setUsernameInput(user?.username || '');
                      setEditingUsername(true);
                    }}
                  >
                    {user?.username ? 'Değiştir' : 'Belirle'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {guestMode && onOpenAuth && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', paddingTop: 'var(--space-1)' }}>
              <Button variant="primary" onClick={() => onOpenAuth('register')}>
                Hesap oluştur
              </Button>
              <Button variant="secondary" onClick={() => onOpenAuth('login')}>
                Giriş yap
              </Button>
            </div>
          )}
        </section>

        {authorized && <AccountSecuritySettings user={user} setUser={setUser} />}

        {/* 4. Veri, Yedekleme & Gelişmiş */}
        <section style={sectionStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Veri ve yedekleme</h2>
          <div style={rowStyle}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <strong style={{ fontSize: '14px' }}>Kişisel yedek (JSON)</strong>
              <p style={{ fontSize: '12px', color: 'var(--fg-muted)', marginTop: 'var(--space-1)' }}>
                Alışkanlıklarını ve günlük kayıtlarını dışa aktar veya mevcut bir yedeği geri yükle.
                {pendingCount > 0 ? ` (${pendingCount} bekleyen taslak dahil edilmez.)` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <Button
                variant="secondary"
                disabled={Boolean(busy) || !personalAvailable}
                onClick={handleExport}
                aria-label="Yedeği JSON olarak dışa aktar"
              >
                <Download size={16} aria-hidden="true" />
                {busy === 'export' ? 'Yedek hazırlanıyor…' : 'Dışa aktar'}
              </Button>
              <label
                htmlFor="backup-upload-input"
                className="db-btn db-btn--secondary"
                style={{ cursor: busy || !personalAvailable ? 'not-allowed' : 'pointer' }}
              >
                <Upload size={16} aria-hidden="true" />
                <span>Yedeği yükle</span>
                <input
                  id="backup-upload-input"
                  type="file"
                  accept=".json,application/json"
                  disabled={Boolean(busy) || !personalAvailable}
                  onChange={handleImportFile}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <p className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
            En fazla 2 MiB, 500 alışkanlık. İçe aktarma öncesi önizleme gösterilir.
          </p>

          {busy === 'read' && <InlineFeedback message="Dosya okunuyor ve doğrulanıyor…" tone="neutral" />}

          {preview && (
            <section
              aria-labelledby="backup-preview-title"
              style={{
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--surface-2)',
                padding: 'var(--space-3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <h3 id="backup-preview-title" style={{ fontSize: '14px', fontWeight: 700 }}>
                Yedeği içe aktarmadan önce
              </h3>
              <p className="mono" style={{ fontSize: '12px' }}>
                {preview.filename}: {preview.habits} alışkanlık, {preview.records} günlük kayıt ve {preview.versions} geçmiş kural.
              </p>
              <p style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
                {preview.matchingHabits} eşleşen alışkanlık güncellenir; yedekte olmayan kayıtlar silinmez.
              </p>
              {pendingCount > 0 && (
                <InlineFeedback
                  message={`Önce ${pendingCount} bekleyen taslağı eşitle veya yerel kopyayı temizle.`}
                  tone="danger"
                />
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', paddingTop: 'var(--space-2)' }}>
                <Button variant="secondary" disabled={Boolean(busy)} onClick={() => setPreview(null)}>
                  İçe aktarmaktan vazgeç
                </Button>
                <Button
                  variant="primary"
                  disabled={Boolean(busy) || pendingCount > 0}
                  loading={busy === 'import'}
                  onClick={confirmImport}
                >
                  {busy === 'import' ? 'İçe aktarılıyor…' : 'Onayla ve içe aktar'}
                </Button>
              </div>
            </section>
          )}

          {authorized && (
            <details style={{ marginTop: 'var(--space-2)', border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>
              <summary className="mono" style={{ padding: 'var(--space-3)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
                Gelişmiş ve Tehlikeli İşlemler
              </summary>
              <div style={{ padding: '0 var(--space-3) var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {onClearLocalData && (
                  <div style={rowStyle}>
                    <div>
                      <strong style={{ fontSize: '14px' }}>Cihazdaki yerel kopya</strong>
                      <p style={{ fontSize: '12px', color: 'var(--fg-muted)', marginTop: 'var(--space-1)' }}>
                        Sunucudaki veriler korunur, yalnızca bu cihazdaki önbellek temizlenir.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      disabled={Boolean(busy) || pendingCount > 0}
                      onClick={() => setConfirmClear(true)}
                    >
                      Yerel kopyayı temizle
                    </Button>
                  </div>
                )}

                <div style={{ ...rowStyle, borderTopColor: 'var(--danger)' }}>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--danger)' }}>Hesabı kalıcı olarak sil</strong>
                    <p style={{ fontSize: '12px', color: 'var(--fg-muted)', marginTop: 'var(--space-1)' }}>
                      Tüm kişisel alışkanlıkların, kayıtların ve lideri olduğun gruplar geri döndürülemez şekilde silinir.
                    </p>
                  </div>
                  {!confirmDelete && (
                    <Button
                      variant="destructive"
                      disabled={Boolean(busy)}
                      onClick={() => setConfirmDelete(true)}
                    >
                      Hesabı Sil
                    </Button>
                  )}
                </div>

                {confirmDelete && (
                  <div
                    style={{
                      border: '1px solid var(--danger)',
                      backgroundColor: 'var(--surface-2)',
                      padding: 'var(--space-3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <FormField label="Kalıcı silmeyi onaylamak için SİL yaz" htmlFor="delete-phrase">
                      <TextInput
                        id="delete-phrase"
                        value={deletePhrase}
                        onChange={(e) => setDeletePhrase(e.target.value)}
                        disabled={Boolean(busy)}
                        autoComplete="off"
                      />
                    </FormField>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      <Button
                        variant="secondary"
                        disabled={Boolean(busy)}
                        onClick={() => {
                          setConfirmDelete(false);
                          setDeletePhrase('');
                        }}
                      >
                        Vazgeç
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={Boolean(busy) || deletePhrase !== 'SİL'}
                        loading={busy === 'delete'}
                        onClick={handleDeleteAccount}
                      >
                        {busy === 'delete' ? 'Siliniyor…' : 'Evet, Kalıcı Olarak Sil'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </details>
          )}
        </section>

        <Confirmation
          open={confirmClear}
          title="Yerel kopyayı temizle"
          message="Sunucudaki kayıtlar korunur. Bu cihazdaki kopyayı temizlemek istiyor musun?"
          confirmLabel="Evet, yerel kopyayı temizle"
          cancelLabel="Vazgeç"
          destructive
          onConfirm={clearLocal}
          onCancel={() => setConfirmClear(false)}
        />
      </div>
    </section>
  );
}

import React, { useState } from 'react';
import { Download, Upload, LogOut, CheckCircle2, AlertTriangle } from 'lucide-react';
import * as api from '../lib/api';
import { BACKUP_LIMITS, backupPreview, buildPersonalBackup } from '../lib/backup.js';
import { dateKey } from '../lib/rules.js';
import { useTheme } from '../theme/ThemeProvider.jsx';

export default function SettingsView({ user, habits = [], checkins = [], groups = [], pendingEntries = [], weekStart = 1, updateWeekStart, importBackup, onSignOut, onClearLocalData }) {
  const { preference, setPreference } = useTheme();
  const [notice, setNotice] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const isDemo = api.demoMode;
  const authorized = Boolean(user?.id) && !isDemo;
  const ownedGroups = groups.filter(g => g.role === 'owner' || g.owner_id === user?.id).length;
  const pendingCount = pendingEntries.length;
  const inform = (message, error = false) => setNotice({ message, error });

  const handleExport = async () => {
    if (busy) return;
    setBusy('export');
    try {
      const source = await api.exportData();
      const data = buildPersonalBackup({ user: source.user || user, habits: source.habits, checkins: source.checkins, weekStart: source.week_start ?? weekStart, pendingCount });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      if (blob.size > BACKUP_LIMITS.bytes) throw new Error('Bu yedek desteklenen 2 MiB sınırını aşıyor; içe aktarılabilir bir dosya oluşturulamadı.');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pace-yedek-${dateKey()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      inform('Yedek indirmesi başlatıldı. Dosyayı sakladığını kontrol et.');
    } catch (err) { inform('Yedek oluşturulamadı: ' + err.message, true); }
    finally { setBusy(''); }
  };

  const handleImportFile = async e => {
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
    } catch (err) { inform('Dosya içe aktarmaya hazır değil: ' + err.message, true); }
    finally { setBusy(''); }
  };

  const confirmImport = async () => {
    if (!preview || busy) return;
    setBusy('import');
    try {
      const result = await importBackup(preview.data);
      if (!result?.success) throw new Error(result?.error || 'Sunucu işlemi doğrulamadı.');
      inform(`${preview.habits} alışkanlık ve ${preview.records} günlük kayıt içe aktarıldı. Dosyadaki geçmiş kurallar korundu.`);
      setPreview(null);
    } catch (err) { inform('Yedek içe aktarılamadı: ' + err.message, true); }
    finally { setBusy(''); }
  };

  const handleDeleteAccount = async () => {
    if (!authorized || busy || deletePhrase !== 'SİL') return;
    setBusy('delete');
    try {
      const result = await api.request('account', { method: 'DELETE' });
      if (result?.ok !== true) throw new Error('Sunucu silme işlemini doğrulamadı.');
      inform('Hesabın ve ona bağlı veriler silindi.');
      setConfirmDelete(false);
      // The account deletion endpoint also revokes the session. The parent owns local cleanup.
      await onSignOut?.({ accountDeleted: true });
    } catch (err) { inform('Hesap silme başarısız: ' + err.message, true); }
    finally { setBusy(''); }
  };

  const saveWeekStart = async value => {
    setBusy('preferences');
    try { await updateWeekStart?.(Number(value)); inform('Haftanın ilk günü kaydedildi.'); }
    catch (err) { inform('Tercih kaydedilemedi: ' + err.message, true); }
    finally { setBusy(''); }
  };

  const clearLocal = async () => {
    if (!onClearLocalData || busy) return;
    setBusy('clear');
    try { await onClearLocalData(); setConfirmClear(false); inform('Bu cihazdaki hesap kopyası temizlendi. Sunucu kayıtların silinmedi.'); }
    catch (err) { inform('Yerel kopya temizlenemedi: ' + err.message, true); }
    finally { setBusy(''); }
  };

  return (
    <section className="page-view" id="view-settings" aria-labelledby="settings-title">
      <div className="page-heading"><div><h1 id="settings-title">Ayarlar</h1><p className="section-subtitle">Hesap, tercihler ve veri güvenliği</p></div></div>
      {notice && <div className={`inline-message ${notice.error ? 'is-error' : 'is-success'}`} role={notice.error ? 'alert' : 'status'} aria-atomic="true">
        {notice.error ? <AlertTriangle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />} <span>{notice.message}</span>
        <button type="button" className="button button-quiet" aria-label="Bildirimi kapat" onClick={() => setNotice(null)}>Kapat</button>
      </div>}
      <div className="settings-layout">
        <section className="settings-section">
          <h2>Hesap bilgileri</h2>
          <div className="settings-row"><div><strong id="account-email">{isDemo ? 'Örnek hesap' : user?.email || 'Giriş yapılmadı'}</strong>
            <p>{isDemo ? 'Demo kayıtları yalnızca bu tarayıcıda saklanır; gerçek hesabına aktarılmaz.' : authorized ? 'Kayıtların hesabında, çevrimdışı kopyan ve bekleyen taslakların bu cihazda saklanır.' : 'Kayıtlarını eşitlemek için giriş yap.'}</p></div>
            {(authorized || isDemo) && <button type="button" className="button button-quiet" disabled={Boolean(busy)} onClick={async () => { try { await onSignOut?.(); } catch (err) { inform('Çıkış yapılamadı: ' + err.message, true); } }}><LogOut size={16} aria-hidden="true" /> {isDemo ? 'Demodan çık' : 'Çıkış yap'}</button>}
          </div>
          {authorized && onClearLocalData && <div className="settings-row"><div><strong>Cihazdaki yerel kopya</strong><p>Hesabını silmeden bu cihazdaki önbelleği temizleyebilirsin. Bekleyen taslaklar varsa önce eşitle veya geri al.</p></div>
            {!confirmClear ? <button type="button" className="button button-quiet" disabled={Boolean(busy) || pendingCount > 0} onClick={() => setConfirmClear(true)}>Yerel kopyayı temizle</button> : <div className="inline-message"><p>Sunucudaki kayıtlar korunur. Bu cihazdaki kopyayı temizlemek istiyor musun?</p><div className="heading-actions"><button type="button" className="button button-quiet" disabled={Boolean(busy)} onClick={() => setConfirmClear(false)}>Vazgeç</button><button type="button" className="button button-danger-quiet" disabled={Boolean(busy)} onClick={clearLocal}>Evet, yerel kopyayı temizle</button></div></div>}
          </div>}
        </section>
        <section className="settings-section">
          <h2>Tercihler</h2>
          <label className="settings-row" htmlFor="week-start-select"><div><strong>Haftanın ilk günü</strong><p>Takvimin ve haftalık hedeflerin başladığı gün.</p></div><select id="week-start-select" value={weekStart} disabled={Boolean(busy) || (!authorized && !isDemo)} onChange={e => saveWeekStart(e.target.value)}><option value="1">Pazartesi</option><option value="0">Pazar</option></select></label>
          <label className="settings-row" htmlFor="theme-select"><div><strong>Görünüm teması</strong><p>Açık, koyu veya cihazının tema tercihi.</p></div><select id="theme-select" value={preference} onChange={e => { setPreference(e.target.value); inform('Tema tercihi güncellendi.'); }}><option value="light">Açık (Krem)</option><option value="dark">Koyu (Gece)</option><option value="system">Sistem</option></select></label>
          <div className="settings-row"><div><strong>Saat dilimi</strong><p>Kayıt günleri cihazının yerel takvimini kullanır.</p></div><span id="device-timezone">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span></div>
        </section>
        <section className="settings-section">
          <h2>Verilerin ve yedekleme</h2>
          <div className="settings-row"><div><strong>Kişisel yedek</strong><p>E-posta adresini, kişisel alışkanlıklarını, tarihsel kurallarını ve günlük kayıtlarını içerir. Grup verileri, parolalar ve kurtarma kodları dahil değildir.</p><p>Sunucuda doğrulanmış kayıtlar dışa aktarılır. {pendingCount ? `${pendingCount} eşitlenmemiş taslak bu yedeğe dahil edilmez.` : 'Eşitlenmemiş değişiklikler yedeğe dahil edilmez.'} Dosyanı özel bir yerde sakla.</p></div><div className="heading-actions"><button type="button" className="button button-quiet" disabled={Boolean(busy) || (!authorized && !isDemo)} onClick={handleExport} aria-label="Yedeği JSON olarak dışa aktar"><Download size={16} aria-hidden="true" /> {busy === 'export' ? 'Yedek hazırlanıyor…' : 'Dışa aktar'}</button><label htmlFor="backup-upload-input" className="button button-quiet"><Upload size={16} aria-hidden="true" /><span>Yedeği yükle</span><input id="backup-upload-input" type="file" accept=".json,application/json" disabled={Boolean(busy) || (!authorized && !isDemo)} onChange={handleImportFile} className="sr-only" /></label></div></div>
          <p className="table-hint">En fazla 2 MiB, 500 alışkanlık ve 10.000 günlük kayıt. Dosya seçimi hesabını değiştirmez; önce önizleme gösterilir.</p>
          {busy === 'read' && <p role="status">Dosya okunuyor ve doğrulanıyor…</p>}
          {preview && <section className="inline-message" aria-labelledby="backup-preview-title"><h3 id="backup-preview-title">Yedeği içe aktarmadan önce</h3><p>{preview.filename}: {preview.habits} alışkanlık, {preview.records} günlük kayıt ve {preview.versions} geçmiş kural.</p><p>{preview.matchingHabits} alışkanlığın mevcut kimliği eşleşiyor: bunların ayarları ve geçmiş kuralları yedektekiyle değiştirilecek. Aynı alışkanlık/gündeki kayıtlar yedekteki değerle güncellenir. Yedekte olmayan alışkanlık ve kayıtlar silinmez; grup verileri değişmez.</p><p>Dosyadaki hafta başlangıcı tercihi de uygulanır. Başka hesaba ait kimlik çakışmaları yeni kimliklerle aktarılır.</p>{pendingCount > 0 && <p role="alert">Önce {pendingCount} bekleyen taslağı eşitle veya yerel kopyayı temizle. İçe aktarma bekleyen değerlerin üzerine yazmamalı.</p>}<div className="heading-actions"><button type="button" className="button button-quiet" disabled={Boolean(busy)} onClick={() => setPreview(null)}>İçe aktarmaktan vazgeç</button><button type="button" className="button button-primary" disabled={Boolean(busy) || pendingCount > 0} onClick={confirmImport}>{busy === 'import' ? 'İçe aktarılıyor…' : 'Onayla ve içe aktar'}</button></div></section>}
        </section>
        <section className="settings-section">
          <h2>Hesabı silme</h2>
          <p>Tüm kişisel alışkanlıkların, günlük kayıtların ve oturumların kalıcı olarak silinir. Lideri olduğun tüm gruplar ve bu grupların tüm üyelerine ait ortak kayıtlar da silinir. Diğer gruplardaki üyeliğin ve kendi ortak kayıtların kaldırılır.</p>
          <p>Bu işlem geri alınamaz. Devam etmeden önce kişisel yedeğini dışa aktarabilirsin; bu yedek grup verilerini kapsamaz.</p>
          {!authorized && <p className="table-hint">Hesap silme yalnızca giriş yapılmış gerçek hesaplarda kullanılabilir.</p>}
          {confirmDelete ? <div className="inline-message"><label className="field" htmlFor="delete-phrase">Kalıcı silmeyi onaylamak için SİL yaz<input id="delete-phrase" className="form-input" value={deletePhrase} onChange={e => setDeletePhrase(e.target.value)} disabled={Boolean(busy)} autoComplete="off" /></label><div className="heading-actions"><button type="button" className="button button-quiet" disabled={Boolean(busy)} onClick={() => { setConfirmDelete(false); setDeletePhrase(''); }}>Vazgeç</button><button type="button" className="button button-danger" disabled={Boolean(busy) || deletePhrase !== 'SİL'} onClick={handleDeleteAccount}>{busy === 'delete' ? 'Siliniyor…' : 'Evet, Kalıcı Olarak Sil'}</button></div></div> : <button type="button" className="button button-danger-quiet" disabled={!authorized || Boolean(busy)} onClick={() => setConfirmDelete(true)}>Hesabı Sil</button>}
        </section>
      </div>
    </section>
  );
}

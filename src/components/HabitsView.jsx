import { settingsAt, dateKey } from '../lib/rules.js';
import React, { useMemo, useRef, useState } from 'react';
import { Archive, RotateCcw, Pause, Play, Pencil } from 'lucide-react';
import { describeHabitRules } from '../lib/habit-form.js';
import './HabitForm.css';

function rulesDescription(habit) {
  try {
    return describeHabitRules({ ...habit, schedule: habit.schedule || { type: 'daily' }, progression: habit.progression || { enabled: false }, debt: habit.debt || { enabled: false } });
  } catch { return 'Plan ayrıntılarını düzenleyerek gözden geçirebilirsin.'; }
}

export default function HabitsView({ habits = [], onOpenAddModal, onEditHabit, onTogglePause, archiveHabit, restoreHabit, lastArchivedHabit, setLastArchivedHabit }) {
  const [confirmArchiveId, setConfirmArchiveId] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const actionLock = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const effectiveHabits=habits.map(h=>({...settingsAt(h,dateKey()),id:h.id,versions:h.versions}));
  const current = effectiveHabits.filter(h => !h.archived_at);
  const archived = effectiveHabits.filter(h => Boolean(h.archived_at));
  const activeCount = current.filter(h => !h.paused).length;
  const pausedCount = current.length - activeCount;
  const matching = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return h => !query || h.name.toLocaleLowerCase('tr-TR').includes(query);
  }, [search]);
  const shownCurrent = current.filter(matching);
  const shownArchived = archived.filter(matching);

  const act = async (id, action, success) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setPendingId(id); setError(''); setMessage('');
    try {
      if (typeof action !== 'function') throw new Error('Bu işlem şu anda kullanılamıyor. Lütfen yeniden dene.');
      const result = await action();
      if (result === false || result?.success === false) throw new Error(result?.error || 'İşlem tamamlanamadı.');
      setConfirmArchiveId(null);
      setMessage(success);
    } catch (err) { setError(err.message || 'İşlem tamamlanamadı. Lütfen yeniden dene.'); }
    finally { actionLock.current = false; setPendingId(null); }
  };

  const row = (habit, isArchived = false) => <article key={habit.id} className="habit-row habit-management-row" aria-busy={pendingId === habit.id}>
    <div className="habit-main">
      <strong className="habit-name">{habit.name}</strong>
      <span className="habit-rule-description">{rulesDescription(habit)}</span>
      <span className="habit-status-label">{isArchived ? <><Archive size={14} aria-hidden="true" />Arşivlendi</> : habit.paused ? <><Pause size={14} aria-hidden="true" />Duraklatıldı — yeniden başlatana kadar planlanmaz</> : <><Play size={14} aria-hidden="true" />Aktif</>}</span>
    </div>
    <div className="habit-actions habit-management-actions">
      {isArchived ? <button type="button" className="button button-quiet" disabled={Boolean(pendingId)} aria-label={`${habit.name} alışkanlığını arşivden çıkar`} onClick={() => act(habit.id, () => restoreHabit?.(habit.id), `${habit.name} arşivden çıkarıldı.`)}><RotateCcw size={15} aria-hidden="true" />{pendingId === habit.id ? 'İşleniyor…' : 'Arşivden çıkar'}</button> : confirmArchiveId === habit.id ? <div className="habit-management-notice">
        <p><strong>{habit.name}</strong> arşive kaldırılsın mı? Geçmiş kayıtların korunur; istediğinde arşivden çıkarabilirsin.</p>
        <div className="habit-management-actions"><button type="button" className="button button-quiet" disabled={Boolean(pendingId)} onClick={() => setConfirmArchiveId(null)}>Vazgeç</button><button type="button" className="button button-danger-quiet" disabled={Boolean(pendingId)} onClick={() => act(habit.id, () => archiveHabit?.(habit.id), `${habit.name} arşive kaldırıldı.`)}>{pendingId === habit.id ? 'Arşivleniyor…' : 'Evet, Arşivle'}</button></div>
      </div> : <>
        <button type="button" className="button button-quiet" disabled={Boolean(pendingId)} aria-label={`${habit.name} alışkanlığını düzenle`} onClick={() => { setError(''); onEditHabit?.(habit); }}><Pencil size={15} aria-hidden="true" />Düzenle</button>
        <button type="button" className="button button-quiet" disabled={Boolean(pendingId)} aria-label={`${habit.name} alışkanlığını ${habit.paused ? 'devam ettir' : 'duraklat'}`} onClick={() => act(habit.id, () => onTogglePause?.(habit), `${habit.name} ${habit.paused ? 'yeniden başlatıldı' : 'duraklatıldı'}.`)}>{habit.paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}{pendingId === habit.id ? 'İşleniyor…' : habit.paused ? 'Devam et' : 'Duraklat'}</button>
        <button type="button" className="button button-quiet" disabled={Boolean(pendingId)} aria-label={`${habit.name} alışkanlığını arşivle`} onClick={() => { setError(''); setConfirmArchiveId(habit.id); }}><Archive size={15} aria-hidden="true" />Arşivle</button>
      </>}
    </div>
  </article>;

  return <section className="page-view" id="view-habits" aria-labelledby="habits-title">
    <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}><div><h1 id="habits-title">Alışkanlıklar</h1><p className="section-subtitle">{activeCount} aktif rutin{pausedCount > 0 ? ` · ${pausedCount} duraklatılmış` : ''}</p></div><button type="button" className="button button-primary add-habit-trigger" aria-label="Yeni alışkanlık ekle" onClick={onOpenAddModal}>Alışkanlık Ekle +</button></div>
    {error && <div className="habit-management-notice" role="alert"><p>{error}</p><button type="button" className="button button-quiet" onClick={() => setError('')}>Mesajı kapat</button></div>}
    {message && !lastArchivedHabit && <p className="habit-management-notice" role="status" aria-live="polite">{message}</p>}
    {lastArchivedHabit && <div className="habit-management-notice" role="status" aria-live="polite"><p><strong>{lastArchivedHabit.name}</strong> arşive kaldırıldı. Geçmiş kayıtların korunur.</p><div className="habit-management-actions"><button type="button" className="button button-quiet" disabled={Boolean(pendingId)} onClick={() => act(lastArchivedHabit.id, () => restoreHabit?.(lastArchivedHabit.id), 'Son arşivleme işlemi geri alındı.')}><RotateCcw size={15} aria-hidden="true" />Geri Al</button>{setLastArchivedHabit && <button type="button" className="button button-quiet" aria-label="Arşivleme bildirimini kapat" onClick={() => setLastArchivedHabit(null)}>Kapat</button>}</div></div>}
    {habits.length > 0 && <label className="field" htmlFor="habit-search" style={{ display: 'block', marginBottom: '20px' }}><span style={{ display: 'block', fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Alışkanlıklarında ara</span><input id="habit-search" type="search" className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Alışkanlık adı" style={{ width: '100%', padding: '10px 12px' }} /></label>}
    {search.trim() && <p className="sr-only" role="status" aria-live="polite">{shownCurrent.length} aktif veya duraklatılmış, {shownArchived.length} arşivlenmiş alışkanlık bulundu.</p>}
    {current.length === 0 ? <div className="empty-state panel-card" style={{ padding: '40px 24px', textAlign: 'center' }}><h2>{archived.length ? 'Rutinlerin arşivde' : 'İlk küçük adımını seç'}</h2><p>{archived.length ? 'Aşağıdaki arşivden bir rutini yeniden başlatabilir veya yeni bir alışkanlık ekleyebilirsin.' : 'Kendine uygun bir hedef belirle; zaman içinde düzenleyip kendi ritmini bulabilirsin.'}</p><button type="button" className="button button-primary add-habit-trigger" onClick={onOpenAddModal}>{archived.length ? 'Yeni alışkanlık ekle' : 'İlk Alışkanlığını Ekle +'}</button></div> : shownCurrent.length === 0 ? <div className="habit-management-notice"><p>“{search}” için aktif veya duraklatılmış alışkanlık bulunamadı.</p><button type="button" className="button button-quiet" onClick={() => setSearch('')}>Aramayı temizle</button></div> : <div id="all-habits-list" className="habit-list">{shownCurrent.map(habit => row(habit))}</div>}
    {archived.length > 0 && <details id="archived-habits" className="archive-section" style={{ marginTop: '32px' }}><summary>Arşivlenenler ({archived.length})</summary><p className="habit-rule-description">Arşivlemek eski kayıtları silmez. Bir rutini arşivden çıkararak yeniden planlayabilirsin.</p><div id="archive-list" className="habit-list" style={{ marginTop: '16px' }}>{shownArchived.length ? shownArchived.map(habit => row(habit, true)) : <p>Arşivde bu aramayla eşleşen alışkanlık yok.</p>}</div></details>}
  </section>;
}

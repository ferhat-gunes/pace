import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Users, UserPlus, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import * as api from '../lib/api';
import { dateKey, weekDays, addDays } from '../lib/rules.js';
import { dayLabel, latestGroupLog, groupDayState, groupWeekSummary, groupHabitSettings, groupWriteBody, groupSettings, requireGroupDetail, requireGroupSuccess } from '../lib/group-ui.js';

const fieldStyle = { display: 'block', marginBottom: 16 };
const inputStyle = { width: '100%', minHeight: 48, padding: '8px 12px', marginTop: 6, fontSize: 16 };
const actionsStyle = { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' };
const blankHabit = () => ({ name: '', tracking: 'check', target: 1, unit: '', direction: 'at_least' });
const token = () => crypto.randomUUID();

function Field({ label, children }) { return <label className="field" style={fieldStyle}><span style={{ fontWeight: 700 }}>{label}</span>{children}</label>; }
function Sheet({ title, id, children, onClose, busy }) {
  return <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby={id} onClick={() => !busy && onClose()}>
    <div className="dialog-sheet" onClick={e => e.stopPropagation()}>
      <div className="sheet-handle" aria-hidden="true" />
      <div style={{ ...actionsStyle, justifyContent: 'space-between', marginBottom: 18 }}><h2 id={id}>{title}</h2><button type="button" className="button-icon icon-button" aria-label="Kapat" disabled={busy} onClick={onClose}>✕</button></div>
      {children}
    </div>
  </div>;
}
function HabitFields({ draft, setDraft, optional = false }) {
  return <>
    <Field label={optional ? 'Ortak Alışkanlık Adı (İsteğe bağlı)' : 'Alışkanlık Adı'}><input className="form-input" style={inputStyle} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} maxLength={60} placeholder="Örn: 5 km Koşu veya Kitap Okuma" required={!optional} /></Field>
    {(!optional || draft.name.trim()) && <>
      <Field label="Takip biçimi"><select className="form-select" style={inputStyle} value={draft.tracking} onChange={e => setDraft({ ...draft, tracking: e.target.value })}><option value="check">Tamamlandı / tamamlanmadı</option><option value="quantity">Miktar veya süre</option></select></Field>
      {draft.tracking === 'quantity' && <><Field label="Günlük hedef"><input type="number" min="0" max="1000000" step="any" required className="form-input" style={inputStyle} value={draft.target} onChange={e => setDraft({ ...draft, target: e.target.value })} /></Field><Field label="Birim"><input className="form-input" style={inputStyle} maxLength={20} placeholder="Örn: km, dakika, sayfa" value={draft.unit} onChange={e => setDraft({ ...draft, unit: e.target.value })} /></Field><Field label="Hedef yönü"><select className="form-select" style={inputStyle} value={draft.direction} onChange={e => setDraft({ ...draft, direction: e.target.value })}><option value="at_least">En az</option><option value="at_most">En fazla</option></select></Field></>}
    </>}
  </>;
}

export default function GroupsView({ groups = [], loadGroupsError = '', user, loadData, weekStart = 1, initialInviteToken = null, onClearInviteToken = null, onRequireAuth = null }) {
  const contextKey = `pace-group-context:${user?.id || 'guest'}`;
  const readContext = () => { try { return JSON.parse(sessionStorage.getItem(contextKey) || '{}'); } catch { return {}; } };
  const [selected, setSelected] = useState(() => readContext().selected || groups[0]?.id || null);
  const [detail, setDetail] = useState(null), [detailError, setDetailError] = useState(''), [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null), [busy, setBusy] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [name, setName] = useState(''), [description, setDescription] = useState(''), [draft, setDraft] = useState(blankHabit);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [invite, setInvite] = useState(null), [inviteError, setInviteError] = useState(''), [link, setLink] = useState(''), [copied, setCopied] = useState(false);
  const [record, setRecord] = useState(null), [confirmation, setConfirmation] = useState(null), [confirmName, setConfirmName] = useState('');
  const [anchor, setAnchor] = useState(() => readContext().anchor || dateKey());
  const selectedRef = useRef(selected), requestRef = useRef(0), lock = useRef(false), inviteRequestRef = useRef(0);
  selectedRef.current = selected;
  useEffect(() => { const saved = readContext(); setSelected(saved.selected || groups[0]?.id || null); setAnchor(saved.anchor || dateKey()); }, [contextKey]);
  useEffect(() => { try { sessionStorage.setItem(contextKey, JSON.stringify({ selected, anchor })); } catch {} }, [contextKey, selected, anchor]);
  const active = detail?.group?.id === selected ? { ...groups.find(g => g.id === selected), ...detail.group } : groups.find(g => g.id === selected);
  const members = detail?.members || [], habits = detail?.habits || [], checkins = detail?.checkins || [];
  const isOwner = active?.role === 'owner';
  const today = dateKey(), days = weekDays(anchor, weekStart);

  const refresh = useCallback(async (id = selectedRef.current) => {
    if (!id) { setDetail(null); return null; }
    const request = ++requestRef.current;
    setLoading(true); setDetailError('');
    try { const result = requireGroupDetail(await api.getGroup(id), id); if (request === requestRef.current && selectedRef.current === id) setDetail(result); return result; }
    catch (err) { if (request === requestRef.current) setDetailError(err.message || 'Grup bilgileri yüklenemedi.'); return null; }
    finally { if (request === requestRef.current) setLoading(false); }
  }, []);
  useEffect(() => { if (!groups.some(g => g.id === selectedRef.current)) setSelected(groups[0]?.id || null); }, [groups]);
  useEffect(() => { setDetail(null); setNotice(''); refresh(selected); return () => { requestRef.current++; }; }, [selected, refresh]);
  useEffect(() => {
    if (!initialInviteToken) return;
    let current = true; setInviteError('');
    api.getInvitePreview(initialInviteToken).then(res => { if (current && res?.invite) { setInvite({ ...res.invite, token: initialInviteToken }); setModal('accept'); } }).catch(err => { if (current) setInviteError('Davet açılamadı: ' + err.message); });
    return () => { current = false; };
  }, [initialInviteToken, previewAttempt]);
  useEffect(() => { if (user?.id && invite && modal === null) setModal('accept'); }, [user?.id]);
  const close = useCallback(() => { if (lock.current) return; setModal(null); setRecord(null); setConfirmation(null); setError(''); setInvite(null); onClearInviteToken?.(); }, [onClearInviteToken]);
  useEffect(() => { const esc = e => { if (e.key === 'Escape') close(); }; window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc); }, [close]);
  async function run(kind, task) {
    if (lock.current) return;
    lock.current = true; setBusy(kind); setError(''); setNotice('');
    try { await task(); } catch (err) { setError(err.message || 'İşlem tamamlanamadı. Lütfen yeniden dene.'); }
    finally { lock.current = false; setBusy(''); }
  }
  function open(kind) {
    if (kind === 'create' && !user?.id) { setNotice('Grup oluşturmak için hesabına giriş yap.'); onRequireAuth?.(); return; }
    setError(''); setNotice(''); setModal(kind);
  }
  async function createGroup(e) { e.preventDefault(); await run('create', async () => {
    const group = groupSettings({ name, description });
    const settings = draft.name.trim() ? groupHabitSettings(draft) : null;
    const res = await api.createGroup({ ...settings, ...group, habit_name: settings?.name });
    if (!res?.group?.id) throw new Error('Grup oluşturulamadı.');
    await loadData?.(); setSelected(res.group.id); setModal(null); setName(''); setDescription(''); setDraft(blankHabit()); setNotice('Grup oluşturuldu.');
  }); }
  async function inviteLink() { if (!active || lock.current) return; const id = active.id, request = ++inviteRequestRef.current; open('invite'); setLink(''); setCopied(false); await run('invite', async () => {
    const res = await api.createGroupInvite(id, { invite_type: 'link' }); const code = res?.invite?.token || res?.invite?.code;
    if (!code) throw new Error('Davet bağlantısı oluşturulamadı.');
    if (request === inviteRequestRef.current) setLink(`${location.origin}/?join=${encodeURIComponent(code)}`);
  }); }
  async function copyLink() { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setError('Kopyalanamadı. Bağlantı alanını seçerek elle kopyalayabilirsin.'); } }
  async function acceptInvite() { await run('accept', async () => {
    const res = requireGroupSuccess(await api.respondInvite(invite.token, 'accept')); const id = res?.group_id || invite.group_id;
    await loadData?.(); if (id) setSelected(id); setModal(null); setInvite(null); onClearInviteToken?.(); setNotice('Gruba katıldın.');
  }); }
  function openRecord(habit, day) {
    const log = latestGroupLog(checkins, habit.id, user?.id, day);
    setRecord({ habit, day, value: log && !log.deleted ? Number(log.value) : 0, revision: log?.revision || 0, key: token(), deleteKey: token(), hasRecord: Boolean(log && !log.deleted) }); open('record');
  }
  async function refreshRecordVersion() { await run('record-refresh', async () => {
    const updated = await refresh();
    if (!updated) throw new Error('Güncel kayıt yüklenemedi. Bağlantıyı kontrol edip yeniden dene.');
    const latest = latestGroupLog(updated.checkins, record.habit.id, user.id, record.day);
    setRecord(current => ({ ...current, revision: latest?.revision || 0, key: token(), deleteKey: token(), hasRecord: Boolean(latest && !latest.deleted), conflict: false, serverValue: latest && !latest.deleted ? latest.value : null }));
  }); }
  async function saveRecord(e, remove = false) { e?.preventDefault(); await run('record', async () => {
    const body = groupWriteBody(remove ? 0 : record.value, record.revision, remove ? record.deleteKey : record.key);
    try {
      const res = remove
        ? await api.request(`groups/${encodeURIComponent(active.id)}/habits/${encodeURIComponent(record.habit.id)}/check-ins/${record.day}`, { method: 'DELETE', body: JSON.stringify(body) })
        : await api.setGroupCheckin(active.id, record.habit.id, record.day, body);
      if (!res?.checkin || !res.checkin.id || (res.checkin.group_habit_id || res.checkin.habit_id) !== record.habit.id || res.checkin.habit_date !== record.day || !Number.isInteger(res.checkin.revision) || res.checkin.revision <= Number(record.revision)) throw new Error('Sunucu kaydı doğrulamadı.');
      await refresh(); setModal(null); setRecord(null); setNotice(remove ? 'Ortak alışkanlık kaydın kaldırıldı.' : 'Ortak alışkanlık kaydın kaydedildi.');
    } catch (err) {
      if (err.status === 409) {
        const updated = await refresh();
        if (!updated) { setRecord(current => ({ ...current, conflict: true })); throw new Error('Kayıt başka bir cihazda değişti ve güncel sürüm yüklenemedi. Girdiğin değer korundu; önce güncel kaydı yükle.'); }
        const latest = latestGroupLog(updated.checkins, record.habit.id, user.id, record.day);
        setRecord(current => ({ ...current, revision: latest?.revision || 0, key: token(), deleteKey: token(), hasRecord: Boolean(latest && !latest.deleted), conflict: false, serverValue: latest && !latest.deleted ? latest.value : null }));
        throw new Error('Kayıt başka bir cihazda değişti. Girdiğin değer korundu; güncel değeri kontrol ederek yeniden kaydet.');
      }
      throw err;
    }
  }); }
  async function addHabit(e) { e.preventDefault(); await run('habit', async () => { const result = await api.createGroupHabit(active.id, groupHabitSettings(draft)); if (!result?.habit?.id) throw new Error('Sunucu alışkanlığı doğrulamadı.'); await refresh(); await loadData?.(); setModal(null); setDraft(blankHabit()); setNotice('Ortak alışkanlık eklendi.'); }); }
  async function editGroup(e) { e.preventDefault(); await run('edit', async () => { requireGroupSuccess(await api.updateGroup(active.id, groupSettings({ name, description }))); await refresh(); await loadData?.(); setModal(null); setNotice('Grup bilgileri güncellendi.'); }); }
  function confirm(action, target = null) { setConfirmation({ action, target }); setConfirmName(''); open('confirm'); }
  async function confirmAction() { await run('confirm', async () => {
    const id = active.id, action = confirmation.action;
    if (action === 'delete') requireGroupSuccess(await api.deleteGroup(id));
    if (action === 'leave') requireGroupSuccess(await api.leaveGroup(id));
    if (action === 'kick') requireGroupSuccess(await api.kickGroupMember(id, confirmation.target.user_id));
    if (action === 'transfer') requireGroupSuccess(await api.transferGroup(id, confirmation.target.user_id));
    await loadData?.();
    if (action === 'leave' || action === 'delete') { setSelected(null); setDetail(null); } else await refresh(id);
    setModal(null); setConfirmation(null); setNotice('İşlem tamamlandı.');
  }); }
  const confirmText = confirmation?.action === 'delete' ? `“${active?.name}” grubu, ortak alışkanlıkları ve tüm grup kayıtları kalıcı olarak silinecek. Kişisel alışkanlıkların etkilenmez.`
    : confirmation?.action === 'leave' ? isOwner ? members.length <= 1 ? 'Grubun tek üyesisin. Ayrıldığında grup ve bütün ortak kayıtları kalıcı olarak silinecek.' : 'Ayrıldığında liderlik gruba ilk katılan diğer üyeye otomatik geçecek. Gruba yeniden katılmak için davet gerekecek.' : 'Gruptan ayrılacaksın. Yeniden katılmak için davet gerekecek.'
    : confirmation?.action === 'transfer' ? `${confirmation.target.display_name || 'Bu üye'} yeni lider olacak. Sen üye olarak kalacaksın ve liderlik yetkilerini kaybedeceksin.`
    : `${confirmation?.target?.display_name || 'Bu üye'} gruptan çıkarılacak ve gruptaki kayıtları silinecek.`;
  const destructive = confirmation?.action === 'delete' || (confirmation?.action === 'leave' && isOwner && members.length <= 1);

  return <section className="page-view" id="view-groups" aria-labelledby="groups-title">
    <div className="page-heading" style={{ ...actionsStyle, justifyContent: 'space-between', marginBottom: 24 }}><div><h1 id="groups-title">Ortak Takip & Gruplar</h1><p className="section-subtitle">Arkadaşlarınla birbirini teşvik et, ortak ritmini yakala.</p></div><button className="button button-primary" disabled={!!busy} onClick={() => { setName(''); setDescription(''); setDraft(blankHabit()); open('create'); }}>Grup Kur +</button></div>
    {notice && <p className="inline-message" role="status">{notice}</p>}
    {inviteError && <div className="inline-message" role="alert"><p>{inviteError}</p>{initialInviteToken && <button className="button button-quiet" type="button" onClick={() => setPreviewAttempt(n => n + 1)}>Daveti yeniden yükle</button>}</div>}
    {invite && modal === null && <div className="inline-message"><p>Bekleyen grup davetin korunuyor.</p><button type="button" className="button button-quiet" onClick={() => setModal('accept')}>Daveti görüntüle</button></div>}
    {loadGroupsError && <div className="inline-message" role="alert"><p>Gruplar yüklenemedi: {loadGroupsError}</p><button className="button button-quiet" disabled={!!busy} onClick={loadData}>Yeniden dene</button></div>}
    {groups.length > 0 && <div className="segmented-control" role="tablist" aria-label="Grup seç" style={{ display: 'flex', overflowX: 'auto', maxWidth: '100%', marginBottom: 24 }}>{groups.map(group => <button key={group.id} type="button" role="tab" disabled={!!busy} aria-selected={selected === group.id} tabIndex={selected === group.id ? 0 : -1} aria-controls="group-detail-panel" id={`group-tab-${group.id}`} className={`segmented-item ${selected === group.id ? 'is-selected' : ''}`} onClick={() => setSelected(group.id)} style={{ minWidth: 120 }}>{group.name}</button>)}</div>}
    {!groups.length && !loadGroupsError && <div className="empty-state panel-card" style={{ textAlign: 'center' }}><Users aria-hidden="true" /><h2>Henüz bir gruba üye değilsin</h2><p>Birlikte takip etmek istediğin alışkanlıklar için ilk grubunu kur.</p><button className="button button-primary" onClick={() => { setName(''); setDescription(''); setDraft(blankHabit()); open('create'); }}>İlk Grubunu Kur +</button></div>}
    {active && <div className="panel-card" id="group-detail-panel" role="tabpanel" aria-labelledby={`group-tab-${selected}`}>
      <div style={{ ...actionsStyle, justifyContent: 'space-between', marginBottom: 18 }}><div><h2>{active.name}</h2><p>{active.description}</p><span>{loading ? 'Grup bilgileri yükleniyor…' : `${members.length} Üye • ${habits.length} Ortak Alışkanlık`}</span></div><div style={actionsStyle}><button className="button button-quiet" disabled={!!busy || loading} onClick={inviteLink}><UserPlus size={16} aria-hidden="true" /> Arkadaş Davet Et</button><button className="button button-quiet" disabled={!!busy || loading || !detail} onClick={() => confirm('leave')}>Gruptan ayrıl</button></div></div>
      {loading && <p role="status">Grup bilgileri yükleniyor…</p>}
      {detailError && <div className="inline-message" role="alert"><p>{detailError}</p><button className="button button-quiet" disabled={!!busy} onClick={() => refresh()}>Grubu yeniden yükle</button></div>}
      {detail && !loading && <>
        <div style={{ ...actionsStyle, marginBottom: 22 }}><button className="button button-quiet" aria-label="Önceki grup haftası" onClick={() => setAnchor(addDays(anchor, -7))}><ChevronLeft size={18} aria-hidden="true" /></button><strong>{dayLabel(days[0])} – {dayLabel(days[6])}</strong><button className="button button-quiet" aria-label="Sonraki grup haftası" disabled={days[6] >= today} onClick={() => setAnchor(addDays(anchor, 7))}><ChevronRight size={18} aria-hidden="true" /></button><button className="button button-quiet" onClick={() => setAnchor(today)}>Bu hafta</button></div>
        <p className="table-hint">Yalnızca kendi satırındaki geçmiş veya bugünkü güne dokunarak kayıt girebilirsin. Haftalık oran bugün dahil geçen günler üzerinden hesaplanır. Tabloyu yatay kaydırabilirsin.</p>
        {!habits.length && <p className="inline-message">Henüz ortak alışkanlık yok. {isOwner ? 'Aşağıdan ilk ortak alışkanlığı ekleyebilirsin.' : 'Grup lideri ortak alışkanlık ekleyebilir.'}</p>}
        {habits.length > 0 && <div className="table-container" tabIndex={0} role="region" aria-label="Grup haftalık takip matrisi (yatay kaydırılabilir)"><table className="table-standard" style={{ minWidth: 720 }}><thead><tr><th scope="col">Üye</th><th scope="col">Alışkanlık</th>{days.map(day => <th key={day} scope="col">{dayLabel(day)}</th>)}<th scope="col">Geçen günlerde</th></tr></thead><tbody>{members.flatMap(member => habits.map(habit => {
          const summary = groupWeekSummary(habit, checkins, member.user_id, anchor, weekStart, today);
          return <tr key={`${member.user_id}-${habit.id}`}><th scope="row">{member.display_name || 'Üye'}{member.role === 'owner' && ' (Lider)'}</th><td>{habit.name}<small style={{ display: 'block' }}>{habit.tracking === 'quantity' ? `${habit.direction === 'at_most' ? 'En fazla' : 'En az'} ${habit.target} ${habit.unit || ''}` : 'Günde bir kez'}</small></td>{days.map(day => {
            const log = latestGroupLog(checkins, habit.id, member.user_id, day), state = groupDayState(habit, log, day, today), own = member.user_id === user?.id;
            return <td key={day} style={{ textAlign: 'center' }}>{own && day <= today ? <button className={`button ${state === 'Tamamlandı' ? 'button-complete' : 'button-quiet'}`} disabled={!!busy} onClick={() => openRecord(habit, day)} aria-label={`${habit.name}, ${dayLabel(day)}: ${state}. Kaydı düzenle`}>{state === 'Tamamlandı' ? '✓' : log && !log.deleted ? log.value : '+'}</button> : <span aria-label={`${dayLabel(day)}: ${state}`}>{state === 'Tamamlandı' ? '✓' : day > today ? '·' : '—'}<span className="sr-only">{state}</span></span>}</td>;
          })}<td>{summary.elapsed ? `${summary.completed}/${summary.elapsed} · %${summary.percentage}` : 'Henüz başlamadı'}</td></tr>;
        }))}</tbody></table></div>}
        <section style={{ marginTop: 28 }} aria-labelledby="group-members-title"><h3 id="group-members-title">Üyeler ve yönetim</h3><p className="table-hint">{isOwner ? 'Grup lideri olarak üyeleri ve ortak hedefleri yönetebilirsin.' : 'Üye olarak kendi kayıtlarını düzenleyebilirsin. Yönetim işlemleri grup liderine aittir.'}</p>{members.map(member => <div key={member.user_id} className="settings-row" style={{ ...actionsStyle, justifyContent: 'space-between' }}><strong>{member.display_name || 'Üye'} {member.role === 'owner' ? '· Lider' : '· Üye'}</strong>{isOwner && member.user_id !== user?.id && <div style={actionsStyle}><button className="button button-quiet" disabled={!!busy} onClick={() => confirm('transfer', member)}>Liderliği devret</button><button className="button button-danger-quiet" disabled={!!busy} onClick={() => confirm('kick', member)}>Üyeyi çıkar</button></div>}</div>)}{isOwner && <div style={{ ...actionsStyle, marginTop: 20 }}><button className="button button-primary" disabled={!!busy} onClick={() => { setDraft(blankHabit()); open('habit'); }}>Ortak alışkanlık ekle</button><button className="button button-quiet" disabled={!!busy} onClick={() => { setName(active.name); setDescription(active.description || ''); open('edit'); }}>Grubu düzenle</button><button className="button button-danger-quiet" disabled={!!busy} onClick={() => confirm('delete')}>Grubu sil</button></div>}</section>
      </>}
    </div>}
    {(modal === 'create' || modal === 'edit') && <Sheet title={modal === 'create' ? 'Yeni Grup Kur' : 'Grubu düzenle'} id="create-group-title" busy={!!busy} onClose={close}><form onSubmit={modal === 'create' ? createGroup : editGroup} aria-busy={!!busy}><fieldset disabled={!!busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>{error && <p role="alert">{error}</p>}<Field label="Grup Adı"><input className="form-input" style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Örn: Sabah Koşucuları" maxLength={60} required autoFocus /></Field><Field label="Açıklama (İsteğe bağlı)"><input className="form-input" style={inputStyle} value={description} onChange={e => setDescription(e.target.value)} placeholder="Grup hakkında kısa motivasyon" maxLength={280} /></Field>{modal === 'create' && <HabitFields draft={draft} setDraft={setDraft} optional />}<div style={actionsStyle}><button type="button" className="button button-quiet" disabled={!!busy} onClick={close}>İptal</button><button type="submit" className="button button-primary" disabled={!!busy}>{busy ? 'Kaydediliyor…' : modal === 'create' ? 'Grup Oluştur' : 'Değişiklikleri kaydet'}</button></div></fieldset></form></Sheet>}
    {modal === 'habit' && <Sheet title="Ortak alışkanlık ekle" id="group-habit-title" busy={!!busy} onClose={close}><form onSubmit={addHabit} aria-busy={!!busy}><fieldset disabled={!!busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>{error && <p role="alert">{error}</p>}<HabitFields draft={draft} setDraft={setDraft} /><div style={actionsStyle}><button className="button button-primary" disabled={!!busy} type="submit">{busy ? 'Ekleniyor…' : 'Ortak alışkanlığı kaydet'}</button><button className="button button-quiet" disabled={!!busy} type="button" onClick={close}>İptal</button></div></fieldset></form></Sheet>}
    {modal === 'record' && record && <Sheet title={`${record.habit.name} kaydı`} id="group-record-title" busy={!!busy} onClose={close}><form onSubmit={saveRecord} aria-busy={!!busy}><fieldset disabled={!!busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>{error && <p role="alert">{error}</p>}<p>{dayLabel(record.day)} · Yalnızca kendi kaydını değiştiriyorsun.</p>{record.serverValue !== undefined && <p className="inline-message">Sunucudaki güncel değer: {record.serverValue === null ? 'Kayıt yok' : record.serverValue}. Aşağıdaki girdiğin değer korunmuştur.</p>}{record.conflict && <button type="button" className="button button-quiet" onClick={refreshRecordVersion} disabled={!!busy}>Güncel kaydı yükle</button>}{record.habit.tracking === 'check' ? <Field label="Tamamlanma durumu"><select className="form-select" style={inputStyle} value={record.value ? 1 : 0} onChange={e => setRecord({ ...record, value: Number(e.target.value), key: token() })}><option value={0}>Henüz tamamlamadım</option><option value={1}>Tamamladım</option></select></Field> : <Field label={`Kaydedilen miktar (${record.habit.unit || 'birim'})`}><input className="form-input" style={inputStyle} type="text" inputMode="decimal" required value={record.value} onChange={e => setRecord({ ...record, value: e.target.value, key: token() })} /></Field>}<p className="table-hint">{record.habit.direction === 'at_most' ? 'Sıfır dahil, girdiğin miktar hedefin altında veya eşitse tamamlanmış sayılır.' : 'Hedefine ulaştığında gün tamamlanmış sayılır.'}</p><div style={actionsStyle}><button type="submit" className="button button-primary" disabled={!!busy || record.conflict}>{busy ? 'Kaydediliyor…' : 'Grup kaydını kaydet'}</button>{record.hasRecord && <button type="button" className="button button-danger-quiet" disabled={!!busy || record.conflict} onClick={() => saveRecord(null, true)}>Kaydı kaldır</button>}<button type="button" className="button button-quiet" disabled={!!busy} onClick={close}>İptal</button></div></fieldset></form></Sheet>}
    {modal === 'invite' && <Sheet title="Arkadaşlarını Davet Et" id="invite-modal-title" busy={!!busy} onClose={close}><p>Bağlantıyı alan kişi daveti inceleyip grubuna katılabilir. Bağlantı 7 gün geçerlidir.</p>{busy && <p role="status">Davet bağlantısı hazırlanıyor…</p>}{error && <p role="alert">{error}</p>}{error && !link && <button className="button button-quiet" onClick={inviteLink} disabled={!!busy}>Yeniden dene</button>}<div style={{ ...actionsStyle, margin: '18px 0' }}><input className="form-input" aria-label="Davet bağlantısı" readOnly value={link} onFocus={e => e.target.select()} style={{ ...inputStyle, flex: '1 1 180px', minWidth: 0 }} /><button className="button button-primary" disabled={!link || !!busy} onClick={copyLink}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Kopyalandı' : 'Kopyala'}</button></div><p role="status" aria-live="polite">{copied ? 'Davet bağlantısı kopyalandı.' : ''}</p></Sheet>}
    {modal === 'accept' && invite && <Sheet title={`“${invite.group_name}” Grubuna Katıl`} id="join-preview-title" busy={!!busy} onClose={close}><p>{invite.inviter_display || invite.inviter_name || 'Bir arkadaşın'} seni bu gruba davet etti.</p>{invite.group_description && <p>{invite.group_description}</p>}{error && <p role="alert">{error}</p>}{!user && <div className="inline-message"><p>Katılmak için hesabına giriş yap. Davet bağlantın korunur.</p><button type="button" className="button button-primary" disabled={!!busy} onClick={() => { setModal(null); onRequireAuth?.(); }}>Giriş yap</button></div>}<div style={actionsStyle}><button className="button button-primary" disabled={!!busy || !user} onClick={acceptInvite}>{busy ? 'Katılınıyor…' : 'Gruba Katıl'}</button><button className="button button-quiet" disabled={!!busy} onClick={close}>Vazgeç</button></div></Sheet>}
    {modal === 'confirm' && confirmation && <Sheet title={confirmation.action === 'delete' ? 'Grubu kalıcı olarak sil' : confirmation.action === 'leave' ? 'Gruptan ayrıl' : confirmation.action === 'transfer' ? 'Liderliği devret' : 'Üyeyi çıkar'} id="group-confirm-title" busy={!!busy} onClose={close}><p>{confirmText}</p>{error && <p role="alert">{error}</p>}{destructive && <Field label={`Onaylamak için grup adını yaz: ${active?.name}`}><input className="form-input" style={inputStyle} disabled={!!busy} value={confirmName} onChange={e => setConfirmName(e.target.value)} autoComplete="off" /></Field>}<div style={actionsStyle}><button className="button button-quiet" disabled={!!busy} onClick={close}>Vazgeç</button><button className="button button-danger" disabled={!!busy || (destructive && confirmName !== active?.name)} onClick={confirmAction}>{busy ? 'İşleniyor…' : 'Onayla'}</button></div></Sheet>}
  </section>;
}

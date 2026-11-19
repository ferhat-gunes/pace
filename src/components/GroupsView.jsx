import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserPlus, Copy, Check, ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react';
import * as api from '../lib/api';
import { dateKey, weekDays, addDays } from '../lib/rules.js';
import GroupSocialPanel from './Groups/GroupSocialPanel.jsx';
import {
  dayLabel,
  latestGroupLog,
  groupDayState,
  groupWeekSummary,
  groupHabitSettings,
  groupWriteBody,
  groupSettings,
  requireGroupDetail,
  requireGroupSuccess,
} from '../lib/group-ui.js';
import {
  Header,
  Button,
  IconButton,
  Modal,
  FormField,
  TextInput,
  Select,
  StatusMarker,
  EmptyState,
  ErrorState,
  LoadingState,
  InlineFeedback,
  TabNav,
  Icon,
} from './ui/index.js';

const blankHabit = () => ({ name: '', tracking: 'check', target: 1, unit: '', direction: 'at_least' });
const token = () => crypto.randomUUID();

function HabitFields({ draft, setDraft, optional = false }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
      <FormField
        label={optional ? 'Ortak Alışkanlık Adı (İsteğe bağlı)' : 'Alışkanlık Adı'}
        htmlFor="group-habit-name"
      >
        <TextInput
          id="group-habit-name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          maxLength={60}
          placeholder="Örn. 5 km Koşu veya Kitap Okuma"
          required={!optional}
        />
      </FormField>
      {(!optional || draft.name.trim()) && (
        <>
          <FormField label="Takip Türü" htmlFor="group-habit-tracking">
            <Select
              id="group-habit-tracking"
              value={draft.tracking}
              onChange={(e) => setDraft({ ...draft, tracking: e.target.value })}
              options={[
                { value: 'check', label: 'İşaretleme (Yapıldı / Yapılmadı)' },
                { value: 'quantity', label: 'Miktar veya Süre' },
              ]}
            />
          </FormField>
          {draft.tracking === 'quantity' && (
            <>
              <FormField label="Günlük Hedef" htmlFor="group-habit-target">
                <TextInput
                  id="group-habit-target"
                  type="number"
                  min="0"
                  max="1000000"
                  step="any"
                  required
                  value={draft.target}
                  onChange={(e) => setDraft({ ...draft, target: e.target.value })}
                />
              </FormField>
              <FormField label="Birim" htmlFor="group-habit-unit">
                <TextInput
                  id="group-habit-unit"
                  maxLength={20}
                  placeholder="Örn. km, dk, sayfa"
                  value={draft.unit}
                  onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                />
              </FormField>
              <FormField label="Hedef Yönü" htmlFor="group-habit-direction">
                <Select
                  id="group-habit-direction"
                  value={draft.direction}
                  onChange={(e) => setDraft({ ...draft, direction: e.target.value })}
                  options={[
                    { value: 'at_least', label: 'En az' },
                    { value: 'at_most', label: 'En fazla' },
                  ]}
                />
              </FormField>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function GroupsView({
  groups = [],
  loadGroupsError = '',
  user,
  loadData,
  weekStart = 1,
  initialInviteToken = null,
  onClearInviteToken = null,
  onRequireAuth = null,
  gamification = null,
  onSocialRefresh = null,
}) {
  const contextKey = `pace-group-context:${user?.id || 'guest'}`;
  const readContext = () => {
    try {
      return JSON.parse(sessionStorage.getItem(contextKey) || '{}');
    } catch {
      return {};
    }
  };

  const [selected, setSelected] = useState(() => readContext().selected || groups[0]?.id || null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [draft, setDraft] = useState(blankHabit);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [invite, setInvite] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [record, setRecord] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [confirmName, setConfirmName] = useState('');
  const [anchor, setAnchor] = useState(() => readContext().anchor || dateKey());

  const selectedRef = useRef(selected);
  const requestRef = useRef(0);
  const lock = useRef(false);
  const inviteRequestRef = useRef(0);
  selectedRef.current = selected;

  useEffect(() => {
    const saved = readContext();
    setSelected(saved.selected || groups[0]?.id || null);
    setAnchor(saved.anchor || dateKey());
  }, [contextKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(contextKey, JSON.stringify({ selected, anchor }));
    } catch {
      // ignore storage errors
    }
  }, [contextKey, selected, anchor]);

  const active =
    detail?.group?.id === selected
      ? { ...groups.find((g) => g.id === selected), ...detail.group }
      : groups.find((g) => g.id === selected);
  const members = detail?.members || [];
  const habits = detail?.habits || [];
  const checkins = detail?.checkins || [];
  const isOwner = active?.role === 'owner';
  const today = dateKey();
  const days = weekDays(anchor, weekStart);

  const refresh = useCallback(async (id = selectedRef.current) => {
    if (!id) {
      setDetail(null);
      return null;
    }
    const request = ++requestRef.current;
    setLoading(true);
    setDetailError('');
    try {
      const result = requireGroupDetail(await api.getGroup(id), id);
      if (request === requestRef.current && selectedRef.current === id) setDetail(result);
      return result;
    } catch (err) {
      if (request === requestRef.current) setDetailError(err.message || 'Grup ayrıntıları yüklenemedi.');
      return null;
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!groups.some((g) => g.id === selectedRef.current)) setSelected(groups[0]?.id || null);
  }, [groups]);

  useEffect(() => {
    setDetail(null);
    setNotice('');
    refresh(selected);
    return () => {
      requestRef.current++;
    };
  }, [selected, refresh]);

  useEffect(() => {
    if (!initialInviteToken) return;
    let current = true;
    setInviteError('');
    api
      .getInvitePreview(initialInviteToken)
      .then((res) => {
        if (current && res?.invite) {
          setInvite({ ...res.invite, token: initialInviteToken });
          setModal('accept');
        }
      })
      .catch((err) => {
        if (current) setInviteError(`Davet açılamadı: ${err.message}`);
      });
    return () => {
      current = false;
    };
  }, [initialInviteToken, previewAttempt]);

  useEffect(() => {
    if (user?.id && invite && modal === null) setModal('accept');
  }, [user?.id]);

  const close = useCallback(() => {
    if (lock.current) return;
    setModal(null);
    setRecord(null);
    setConfirmation(null);
    setError('');
    setInvite(null);
    onClearInviteToken?.();
  }, [onClearInviteToken]);

  useEffect(() => {
    const esc = (e) => {
      if (e.key === 'Escape' && modal) close();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [close, modal]);

  async function run(kind, task) {
    if (lock.current) return;
    lock.current = true;
    setBusy(kind);
    setError('');
    setNotice('');
    try {
      await task();
    } catch (err) {
      setError(err.message || 'İşlem tamamlanamadı. Yeniden dene.');
    } finally {
      lock.current = false;
      setBusy('');
    }
  }

  function open(kind) {
    if (kind === 'create' && !user?.id) {
      setNotice('Grup oluşturmak için giriş yap.');
      onRequireAuth?.();
      return;
    }
    setError('');
    setNotice('');
    setModal(kind);
  }

  async function createGroup(e) {
    e.preventDefault();
    await run('create', async () => {
      const group = groupSettings({ name, description });
      const settings = draft.name.trim() ? groupHabitSettings(draft) : null;
      const res = await api.createGroup({ ...settings, ...group, habit_name: settings?.name });
      if (!res?.group?.id) throw new Error('Grup oluşturulamadı.');
      await loadData?.();
      setSelected(res.group.id);
      setModal(null);
      setName('');
      setDescription('');
      setDraft(blankHabit());
      setNotice('Grup oluşturuldu.');
    });
  }

  async function inviteLink() {
    if (!active || lock.current) return;
    const id = active.id;
    const request = ++inviteRequestRef.current;
    open('invite');
    setLink('');
    setCopied(false);
    await run('invite', async () => {
      const res = await api.createGroupInvite(id, { invite_type: 'link' });
      const code = res?.invite?.token || res?.invite?.code;
      if (!code) throw new Error('Davet bağlantısı oluşturulamadı.');
      if (request === inviteRequestRef.current) setLink(`${location.origin}/?join=${encodeURIComponent(code)}`);
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError('Kopyalama başarısız oldu. Bağlantı alanını seçip manuel olarak kopyala.');
    }
  }

  async function acceptInvite() {
    await run('accept', async () => {
      const res = requireGroupSuccess(await api.respondInvite(invite.token, 'accept'));
      const id = res?.group_id || invite.group_id;
      await loadData?.();
      if (id) setSelected(id);
      setModal(null);
      setInvite(null);
      onClearInviteToken?.();
      setNotice('Gruba katıldın.');
    });
  }

  function openRecord(habit, day) {
    const log = latestGroupLog(checkins, habit.id, user?.id, day);
    setRecord({
      habit,
      day,
      value: log && !log.deleted ? Number(log.value) : 0,
      revision: log?.revision || 0,
      key: token(),
      deleteKey: token(),
      hasRecord: Boolean(log && !log.deleted),
    });
    open('record');
  }

  async function refreshRecordVersion() {
    await run('record-refresh', async () => {
      const updated = await refresh();
      if (!updated) throw new Error('Güncel kayıt yüklenemedi. Bağlantını kontrol edip yeniden dene.');
      const latest = latestGroupLog(updated.checkins, record.habit.id, user.id, record.day);
      setRecord((current) => ({
        ...current,
        revision: latest?.revision || 0,
        key: token(),
        deleteKey: token(),
        hasRecord: Boolean(latest && !latest.deleted),
        conflict: false,
        serverValue: latest && !latest.deleted ? latest.value : null,
      }));
    });
  }

  async function saveRecord(e, remove = false) {
    e?.preventDefault();
    await run('record', async () => {
      const body = groupWriteBody(
        remove ? 0 : record.value,
        record.revision,
        remove ? record.deleteKey : record.key,
      );
      try {
        const res = remove
          ? await api.request(
              `groups/${encodeURIComponent(active.id)}/habits/${encodeURIComponent(record.habit.id)}/check-ins/${record.day}`,
              { method: 'DELETE', body: JSON.stringify(body) },
            )
          : await api.setGroupCheckin(active.id, record.habit.id, record.day, body);
        if (
          !res?.checkin ||
          !res.checkin.id ||
          (res.checkin.group_habit_id || res.checkin.habit_id) !== record.habit.id ||
          res.checkin.habit_date !== record.day ||
          !Number.isInteger(res.checkin.revision) ||
          res.checkin.revision <= Number(record.revision)
        ) {
          throw new Error('Sunucu kaydı doğrulamadı.');
        }
        await refresh();
        setModal(null);
        setRecord(null);
        setNotice(remove ? 'Ortak alışkanlık kaydı kaldırıldı.' : 'Ortak alışkanlık kaydı kaydedildi.');
      } catch (err) {
        if (err.status === 409) {
          const updated = await refresh();
          if (!updated) {
            setRecord((current) => ({ ...current, conflict: true }));
            throw new Error(
              'Kayıt başka bir cihazda değişti ve güncel sürüm yüklenemedi. Girdiğin değer korunuyor; önce güncel kaydı yükle.',
            );
          }
          const latest = latestGroupLog(updated.checkins, record.habit.id, user.id, record.day);
          setRecord((current) => ({
            ...current,
            revision: latest?.revision || 0,
            key: token(),
            deleteKey: token(),
            hasRecord: Boolean(latest && !latest.deleted),
            conflict: false,
            serverValue: latest && !latest.deleted ? latest.value : null,
          }));
          throw new Error('Kayıt başka bir cihazda değişti. Girdiğin değer korunuyor; sunucu değerini kontrol edip yeniden kaydet.');
        }
        throw err;
      }
    });
  }

  async function addHabit(e) {
    e.preventDefault();
    await run('habit', async () => {
      const result = await api.createGroupHabit(active.id, groupHabitSettings(draft));
      if (!result?.habit?.id) throw new Error('Sunucu alışkanlığı doğrulamadı.');
      await refresh();
      await loadData?.();
      setModal(null);
      setDraft(blankHabit());
      setNotice('Ortak alışkanlık eklendi.');
    });
  }

  async function editGroup(e) {
    e.preventDefault();
    await run('edit', async () => {
      requireGroupSuccess(await api.updateGroup(active.id, groupSettings({ name, description })));
      await refresh();
      await loadData?.();
      setModal(null);
      setNotice('Grup güncellendi.');
    });
  }

  function confirm(action, target = null) {
    setConfirmation({ action, target });
    setConfirmName('');
    open('confirm');
  }

  async function confirmAction() {
    await run('confirm', async () => {
      const id = active.id;
      const action = confirmation.action;
      if (action === 'delete') requireGroupSuccess(await api.deleteGroup(id));
      if (action === 'leave') requireGroupSuccess(await api.leaveGroup(id));
      if (action === 'kick') requireGroupSuccess(await api.kickGroupMember(id, confirmation.target.user_id));
      if (action === 'transfer') requireGroupSuccess(await api.transferGroup(id, confirmation.target.user_id));
      await loadData?.();
      if (action === 'leave' || action === 'delete') {
        setSelected(null);
        setDetail(null);
      } else {
        await refresh(id);
      }
      setModal(null);
      setConfirmation(null);
      setNotice('İşlem tamamlandı.');
    });
  }

  const confirmText =
    confirmation?.action === 'delete'
      ? `"${active?.name}" grubu, ortak alışkanlıkları ve tüm grup kayıtları kalıcı olarak silinecek. Kişisel alışkanlıkların etkilenmez.`
      : confirmation?.action === 'leave'
        ? isOwner
          ? members.length <= 1
            ? 'Gruptaki tek üyesin. Ayrılırsan grup ve tüm ortak kayıtlar kalıcı olarak silinir.'
            : 'Grup sahipliği en eski üyeye devredilecek. Tekrar katılmak için davet gerekir.'
          : 'Bu gruptan ayrılacaksın. Tekrar katılmak için davet gerekir.'
        : confirmation?.action === 'transfer'
          ? `${confirmation.target.display_name || 'Bu üye'} yeni grup sahibi olacak. Sen üye olarak kalmaya devam edeceksin.`
          : `${confirmation?.target?.display_name || 'Bu üye'} gruptan çıkarılacak ve grup kayıtları silinecek.`;

  const destructive =
    confirmation?.action === 'delete' || (confirmation?.action === 'leave' && isOwner && members.length <= 1);

  return (
    <section id="view-groups" aria-labelledby="groups-title" style={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
      <Header
        title="Gruplar"
        subtitle="Ortak sorumluluk ve haftalık takip"
        actions={
          <Button
            variant="primary"
            disabled={!!busy}
            onClick={() => {
              setName('');
              setDescription('');
              setDraft(blankHabit());
              open('create');
            }}
          >
            <Icon icon={Plus} size={16} />
            Grup oluştur
          </Button>
        }
      />

      <div style={{ padding: 'var(--space-4)', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'var(--space-4)', width: '100%', minWidth: 0, maxWidth: '100%' }}>
        {notice && <InlineFeedback message={notice} tone="signal" />}

        {inviteError && (
          <ErrorState
            title="DAVET HATASI"
            message={inviteError}
            onRetry={initialInviteToken ? () => setPreviewAttempt((n) => n + 1) : undefined}
          />
        )}

        {invite && modal === null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-1)',
            }}
          >
            <span className="mono" style={{ fontSize: '12px' }}>Bekleyen grup daveti</span>
            <Button variant="secondary" onClick={() => setModal('accept')}>
              Daveti gör
            </Button>
          </div>
        )}

        {loadGroupsError && (
          <ErrorState title="YÜKLEME HATASI" message={`Gruplar yüklenemedi: ${loadGroupsError}`} onRetry={loadData} />
        )}

        {groups.length > 0 && (
          <TabNav
            tabs={groups.map((g) => ({ id: g.id, label: g.name, disabled: !!busy }))}
            activeId={selected}
            onChange={(id) => setSelected(id)}
          />
        )}

        {!groups.length && !loadGroupsError && (
          <EmptyState
            title="GRUP YOK"
            description="Başkalarıyla ortak alışkanlık takip etmek için bir grup oluştur."
            action={
              <Button
                variant="primary"
                onClick={() => {
                  setName('');
                  setDescription('');
                  setDraft(blankHabit());
                  open('create');
                }}
              >
                İlk grubu oluştur
              </Button>
            }
          />
        )}

        {active && (
          <div
            id="group-detail-panel"
            role="tabpanel"
            aria-labelledby={`group-tab-${selected}`}
            style={{
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-1)',
              padding: 'var(--space-4)',
              width: '100%',
              minWidth: 0,
              maxWidth: '100%',
              overflowX: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 'var(--space-3)',
                paddingBottom: 'var(--space-4)',
                borderBottom: '1px solid var(--border)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div>
                <h2 style={{ fontSize: '18px' }}>{active.name}</h2>
                {active.description && (
                  <p style={{ fontSize: '13px', color: 'var(--fg-muted)', marginTop: 'var(--space-1)' }}>
                    {active.description}
                  </p>
                )}
                <p className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)', marginTop: 'var(--space-2)' }}>
                  {loading ? 'YÜKLENİYOR…' : `${members.length} ÜYE / ${habits.length} ORTAK ALIŞKANLIK`}
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <Button variant="secondary" disabled={!!busy || loading} onClick={inviteLink}>
                  <Icon icon={UserPlus} size={16} />
                  Davet et
                </Button>
                <Button variant="tertiary" disabled={!!busy || loading || !detail} onClick={() => confirm('leave')}>
                  Gruptan ayrıl
                </Button>
              </div>
            </div>

            {loading && <LoadingState label="GRUP YÜKLENİYOR…" />}
            {detailError && <ErrorState title="GRUP HATASI" message={detailError} onRetry={() => refresh()} />}

            {detail && !loading && (
              <>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  <IconButton
                    icon={ChevronLeft}
                    label="Önceki hafta"
                    onClick={() => setAnchor(addDays(anchor, -7))}
                  />
                  <span className="mono" style={{ fontSize: '13px', fontWeight: 700 }}>
                    {dayLabel(days[0])} – {dayLabel(days[6])}
                  </span>
                  <IconButton
                    icon={ChevronRight}
                    label="Sonraki hafta"
                    disabled={days[6] >= today}
                    onClick={() => setAnchor(addDays(anchor, 7))}
                  />
                  <Button variant="tertiary" onClick={() => setAnchor(today)}>
                    Bu hafta
                  </Button>
                </div>

                <p className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: 'var(--space-3)' }}>
                  Kayıt girmek için bugün veya geçmiş günlerde kendi satırına dokun. Küçük ekranlarda yatay kaydırabilirsin.
                </p>

                {!habits.length && (
                  <InlineFeedback
                    message={
                      isOwner
                        ? 'Henüz ortak alışkanlık yok. Aşağıdan ekleyebilirsin.'
                        : 'Henüz ortak alışkanlık yok. Grup sahibi ortak alışkanlık ekleyebilir.'
                    }
                  />
                )}

                {habits.length > 0 && (
                  <div
                    className="table-container"
                    tabIndex={0}
                    role="region"
                    aria-label="Haftalık grup takip tablosu"
                    style={{ width: '100%', overflowX: 'auto', minWidth: 0, maxWidth: '100%', border: '1px solid var(--border)' }}
                  >
                    <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-2)' }}>
                          <th scope="col" className="mono" style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'left', fontSize: '11px' }}>
                            ÜYE
                          </th>
                          <th scope="col" className="mono" style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'left', fontSize: '11px' }}>
                            ALIŞKANLIK
                          </th>
                          {days.map((day) => (
                            <th key={day} scope="col" className="mono" style={{ padding: 'var(--space-2)', textAlign: 'center', fontSize: '11px' }}>
                              {dayLabel(day)}
                            </th>
                          ))}
                          <th scope="col" className="mono" style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontSize: '11px' }}>
                            ORAN
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.flatMap((member) =>
                          habits.map((habit) => {
                            const summary = groupWeekSummary(habit, checkins, member.user_id, anchor, weekStart, today);
                            const isCurrent = member.user_id === user?.id;
                            return (
                              <tr
                                key={`${member.user_id}-${habit.id}`}
                                style={{
                                  borderBottom: '1px solid var(--border)',
                                  backgroundColor: isCurrent ? 'var(--surface-2)' : 'var(--surface-1)',
                                }}
                              >
                                <th
                                  scope="row"
                                  style={{
                                    padding: 'var(--space-2) var(--space-3)',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    color: isCurrent ? 'var(--signal-text)' : 'var(--fg)',
                                  }}
                                >
                                  {member.display_name || 'Üye'}
                                  {member.role === 'owner' ? ' (Sahip)' : ''}
                                </th>
                                <td style={{ padding: 'var(--space-2) var(--space-3)', fontSize: '13px' }}>
                                  <div>{habit.name}</div>
                                  <div className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                                    {habit.tracking === 'quantity'
                                      ? `${habit.direction === 'at_most' ? 'En fazla' : 'En az'} ${habit.target} ${habit.unit || ''}`
                                      : 'Günlük takip'}
                                  </div>
                                </td>
                                {days.map((day) => {
                                  const log = latestGroupLog(checkins, habit.id, member.user_id, day);
                                  const state = groupDayState(habit, log, day, today);
                                  const done = state === 'Tamamlandı';
                                  return (
                                    <td key={day} style={{ padding: 'var(--space-1)', textAlign: 'center' }}>
                                      {isCurrent && day <= today ? (
                                        <button
                                          type="button"
                                          disabled={!!busy}
                                          onClick={() => openRecord(habit, day)}
                                          aria-label={`${habit.name}, ${dayLabel(day)}: ${state}. Kaydı düzenle`}
                                          className="mono"
                                          style={{
                                            minWidth: '44px',
                                            minHeight: '44px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: `1px solid ${done ? 'var(--signal)' : 'var(--border)'}`,
                                            backgroundColor: done ? 'var(--surface-2)' : 'transparent',
                                            color: done ? 'var(--signal-text)' : 'var(--fg)',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          {done ? (
                                            <StatusMarker status="done" />
                                          ) : log && !log.deleted ? (
                                            log.value
                                          ) : (
                                            <Icon icon={Plus} size={14} />
                                          )}
                                        </button>
                                      ) : (
                                        <span
                                          aria-label={`${dayLabel(day)}: ${state}`}
                                          style={{
                                            minWidth: '44px',
                                            minHeight: '44px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--fg-muted)',
                                          }}
                                        >
                                          {done ? (
                                            <StatusMarker status="done" />
                                          ) : day > today ? (
                                            <StatusMarker status="pending" />
                                          ) : (
                                            <Icon icon={Minus} size={14} />
                                          )}
                                          <span className="sr-only">{state}</span>
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="mono" style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontSize: '12px' }}>
                                  {summary.elapsed ? `${summary.completed}/${summary.elapsed} (%${summary.percentage})` : '—'}
                                </td>
                              </tr>
                            );
                          }),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <GroupSocialPanel
                  group={active}
                  members={members}
                  habits={habits}
                  checkins={checkins}
                  reactions={detail?.reactions || []}
                  user={user}
                  anchor={anchor}
                  weekStart={weekStart}
                  gamification={gamification}
                  onRefresh={() => refresh(active.id)}
                  onSocialRefresh={onSocialRefresh}
                />

                <section style={{ marginTop: 'var(--space-6)' }} aria-labelledby="group-members-title">
                  <h3 id="group-members-title" style={{ fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Üyeler ve Yönetim
                  </h3>
                  <p className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)', marginTop: 'var(--space-1)', marginBottom: 'var(--space-3)' }}>
                    {isOwner
                      ? 'Grup sahibi olarak üyeleri ve ortak alışkanlıkları yönetebilirsin.'
                      : 'Kendi kayıtlarını düzenleyebilirsin. Yönetim işlemleri grup sahibine aittir.'}
                  </p>
                  <div style={{ border: '1px solid var(--border)' }}>
                    {members.map((member) => (
                      <div
                        key={member.user_id}
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 'var(--space-2)',
                          padding: 'var(--space-3) var(--space-4)',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>
                          {member.display_name || 'Üye'}{' '}
                          <span className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                            {member.role === 'owner' ? 'SAHİP' : 'ÜYE'}
                          </span>
                        </span>
                        {isOwner && member.user_id !== user?.id && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                            <Button variant="secondary" disabled={!!busy} onClick={() => confirm('transfer', member)}>
                              Sahipliği devret
                            </Button>
                            <Button variant="destructive" disabled={!!busy} onClick={() => confirm('kick', member)}>
                              Çıkar
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {isOwner && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                      <Button
                        variant="primary"
                        disabled={!!busy}
                        onClick={() => {
                          setDraft(blankHabit());
                          open('habit');
                        }}
                      >
                        Ortak alışkanlık ekle
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={!!busy}
                        onClick={() => {
                          setName(active.name);
                          setDescription(active.description || '');
                          open('edit');
                        }}
                      >
                        Grubu düzenle
                      </Button>
                      <Button variant="destructive" disabled={!!busy} onClick={() => confirm('delete')}>
                        Grubu sil
                      </Button>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </div>

      <Modal
        open={modal === 'create' || modal === 'edit'}
        title={modal === 'create' ? 'Grup Oluştur' : 'Grubu Düzenle'}
        onClose={close}
      >
        <form onSubmit={modal === 'create' ? createGroup : editGroup} aria-busy={!!busy}>
          <fieldset disabled={!!busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 'var(--space-3)' }}>
            {error && <InlineFeedback message={error} tone="danger" />}
            <FormField label="Grup Adı" htmlFor="group-name-input">
              <TextInput
                id="group-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn. Sabah Koşucuları"
                maxLength={60}
                required
                autoFocus
              />
            </FormField>
            <FormField label="Açıklama (İsteğe bağlı)" htmlFor="group-desc-input">
              <TextInput
                id="group-desc-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kısa grup hedefi"
                maxLength={280}
              />
            </FormField>
            {modal === 'create' && <HabitFields draft={draft} setDraft={setDraft} optional />}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <Button variant="secondary" disabled={!!busy} onClick={close}>
                İptal
              </Button>
              <Button type="submit" variant="primary" loading={Boolean(busy)} disabled={!!busy}>
                {modal === 'create' ? 'Grup oluştur' : 'Değişiklikleri kaydet'}
              </Button>
            </div>
          </fieldset>
        </form>
      </Modal>

      <Modal open={modal === 'habit'} title="Ortak Alışkanlık Ekle" onClose={close}>
        <form onSubmit={addHabit} aria-busy={!!busy}>
          <fieldset disabled={!!busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 'var(--space-3)' }}>
            {error && <InlineFeedback message={error} tone="danger" />}
            <HabitFields draft={draft} setDraft={setDraft} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <Button variant="secondary" disabled={!!busy} onClick={close}>
                İptal
              </Button>
              <Button type="submit" variant="primary" loading={Boolean(busy)} disabled={!!busy}>
                Alışkanlığı kaydet
              </Button>
            </div>
          </fieldset>
        </form>
      </Modal>

      <Modal open={modal === 'record' && Boolean(record)} title={record ? `${record.habit.name}` : ''} onClose={close}>
        {record && (
          <form onSubmit={saveRecord} aria-busy={!!busy}>
            <fieldset disabled={!!busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 'var(--space-3)' }}>
              {error && <InlineFeedback message={error} tone="danger" />}
              <p className="mono" style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
                {dayLabel(record.day)} / Kendi kaydını düzenliyorsun
              </p>
              {record.serverValue !== undefined && (
                <InlineFeedback
                  message={`Sunucu değeri: ${record.serverValue === null ? 'Yok' : record.serverValue}. Girdiğin değer korunuyor.`}
                  tone="neutral"
                />
              )}
              {record.conflict && (
                <Button variant="secondary" onClick={refreshRecordVersion} disabled={!!busy}>
                  Güncel kaydı yükle
                </Button>
              )}
              {record.habit.tracking === 'check' ? (
                <FormField label="Tamamlama Durumu" htmlFor="group-record-check">
                  <Select
                    id="group-record-check"
                    value={record.value ? 1 : 0}
                    onChange={(e) => setRecord({ ...record, value: Number(e.target.value), key: token() })}
                    options={[
                      { value: 0, label: 'Tamamlanmadı' },
                      { value: 1, label: 'Tamamlandı' },
                    ]}
                  />
                </FormField>
              ) : (
                <FormField label={`Miktar (${record.habit.unit || 'birim'})`} htmlFor="group-record-amount">
                  <TextInput
                    id="group-record-amount"
                    type="text"
                    inputMode="decimal"
                    required
                    value={record.value}
                    onChange={(e) => setRecord({ ...record, value: e.target.value, key: token() })}
                  />
                </FormField>
              )}
              <p className="mono" style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
                {record.habit.direction === 'at_most'
                  ? 'Hedef ve altındaki değerler (sıfır dahil) tamamlandı sayılır.'
                  : 'Hedefe ulaşmak günü tamamlar.'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                <Button variant="secondary" disabled={!!busy} onClick={close}>
                  İptal
                </Button>
                {record.hasRecord && (
                  <Button
                    variant="destructive"
                    disabled={!!busy || record.conflict}
                    onClick={() => saveRecord(null, true)}
                  >
                    Kaldır
                  </Button>
                )}
                <Button type="submit" variant="primary" loading={Boolean(busy)} disabled={!!busy || record.conflict}>
                  Kaydı kaydet
                </Button>
              </div>
            </fieldset>
          </form>
        )}
      </Modal>

      <Modal open={modal === 'invite'} title="Üye Davet Et" onClose={close}>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <p style={{ fontSize: '13px', color: 'var(--fg-muted)' }}>
            Bu bağlantıya sahip olan herkes grubu önizleyebilir ve katılabilir. 7 gün geçerlidir.
          </p>
          {busy && <InlineFeedback message="Davet bağlantısı oluşturuluyor..." />}
          {error && <InlineFeedback message={error} tone="danger" />}
          {error && !link && (
            <Button variant="secondary" onClick={inviteLink} disabled={!!busy}>
              Yeniden dene
            </Button>
          )}
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <TextInput
              aria-label="Davet bağlantısı"
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              style={{ flex: 1, minWidth: 0 }}
            />
            <Button variant="primary" disabled={!link || !!busy} onClick={copyLink}>
              <Icon icon={copied ? Check : Copy} size={16} />
              {copied ? 'Kopyalandı' : 'Kopyala'}
            </Button>
          </div>
          {copied && <InlineFeedback message="Davet bağlantısı kopyalandı." tone="signal" />}
        </div>
      </Modal>

      <Modal open={modal === 'accept' && Boolean(invite)} title={invite ? `"${invite.group_name}" Grubuna Katıl` : ''} onClose={close}>
        {invite && (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <p style={{ fontSize: '14px' }}>
              {invite.inviter_display || invite.inviter_name || 'Bir üye'} seni bu gruba davet etti.
            </p>
            {invite.group_description && (
              <p style={{ fontSize: '13px', color: 'var(--fg-muted)' }}>{invite.group_description}</p>
            )}
            {error && <InlineFeedback message={error} tone="danger" />}
            {!user && (
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                <InlineFeedback message="Katılmak için giriş yap. Davet bağlantın korunuyor." />
                <Button
                  variant="primary"
                  disabled={!!busy}
                  onClick={() => {
                    setModal(null);
                    onRequireAuth?.();
                  }}
                >
                  Giriş yap
                </Button>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button variant="secondary" disabled={!!busy} onClick={close}>
                İptal
              </Button>
              <Button variant="primary" disabled={!!busy || !user} loading={Boolean(busy)} onClick={acceptInvite}>
                Gruba katıl
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={modal === 'confirm' && Boolean(confirmation)}
        title={
          confirmation?.action === 'delete'
            ? 'Grubu Sil'
            : confirmation?.action === 'leave'
              ? 'Gruptan Ayrıl'
              : confirmation?.action === 'transfer'
                ? 'Sahipliği Devret'
                : 'Üyeyi Çıkar'
        }
        onClose={close}
      >
        {confirmation && (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <p style={{ fontSize: '14px', color: 'var(--fg-muted)' }}>{confirmText}</p>
            {error && <InlineFeedback message={error} tone="danger" />}
            {destructive && (
              <FormField label={`Onaylamak için grup adını yaz: ${active?.name}`} htmlFor="confirm-group-name">
                <TextInput
                  id="confirm-group-name"
                  disabled={!!busy}
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  autoComplete="off"
                />
              </FormField>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button variant="secondary" disabled={!!busy} onClick={close}>
                İptal
              </Button>
              <Button
                variant={destructive || confirmation.action === 'kick' ? 'destructive' : 'primary'}
                disabled={!!busy || (destructive && confirmName !== active?.name)}
                loading={Boolean(busy)}
                onClick={confirmAction}
              >
                Onayla
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

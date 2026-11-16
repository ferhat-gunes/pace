import { GUEST_USER, readGuest, guestRequest, guestBackup, clearGuest } from '../lib/guest-store.js';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as api from '../lib/api';
import { dateKey, isPlannedOn, settingsAt, stateFor } from '../lib/rules';
import { createLoadGuard } from '../lib/state-sync.js';
import { createAccountSync, accountStorageKey } from '../lib/account-sync.js';

const requireOk = response => { if (response?.ok !== true) throw new Error('Sunucu işlemi doğrulamadı. Lütfen yeniden dene.'); return response; };
const storage = () => { try { return window.localStorage; } catch { return null; } };
const emptySnapshot = () => ({ records: [], checkins: [], entryStates: {}, pendingEntries: [] });

export function useHabits() {
  const [selectedDate, setSelectedDate] = useState(dateKey);
  const [habits, setHabits] = useState([]);
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [groups, setGroups] = useState([]);
  const [groupsError, setGroupsError] = useState('');
  const [user, setUserState] = useState(null);
  const [guestMode,setGuestMode]=useState(false);
  const [authRequired,setAuthRequired]=useState(false);
  const [serverGamification,setServerGamification]=useState(null);
  const [weekStart, setWeekStart] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState('Yükleniyor…');
  const [loadError, setLoadError] = useState(null);
  const [storageError, setStorageError] = useState('');
  const [filterMode, setFilterMode] = useState('planned');
  const [lastArchivedHabit, setLastArchivedHabit] = useState(null);
  const guard = useRef(createLoadGuard());
  const account = useRef(null);
  const sessionEpoch = useRef(0);
  const engine = useRef(null);
  const cacheEnabled = useRef(true);
  const habitsRef = useRef([]);
  const mounted = useRef(true);
  const refreshRef = useRef(null);
  const mutationChains = useRef(new Map());
  const preferredWeek = useRef(1);
  const preferencesVersion = useRef(0);
  const habitChanges = useRef(new Map());
  const habitMutationVersion = useRef(0);
  const [today, setToday] = useState(dateKey);

  const publish = useCallback(state => {
    if (!mounted.current) return;
    setSnapshot(state);
    const failed = state.pendingEntries.find(e => e.status === 'conflict' || e.status === 'error');
    setSyncState(failed ? (failed.status === 'conflict' ? 'Kayıt değişti; taslağın korunuyor.' : 'Eşitleme bekliyor; taslağın korunuyor.') : state.pendingEntries.length ? 'Kaydediliyor…' : account.current?.is_guest ? 'Cihazda kaydedildi' : 'Kaydedildi');
  }, []);

  const setUser = useCallback(next => {
    if (typeof next === 'function') next = next(account.current);
    if ((next?.id || null) !== (account.current?.id || null)) {
      guard.current.reset();
      sessionEpoch.current++;
      engine.current?.dispose();
      engine.current = null;
      cacheEnabled.current = true;
      habitsRef.current = [];
      habitChanges.current.clear();
      habitMutationVersion.current = 0;
      preferencesVersion.current++;
      mutationChains.current.clear();
      setHabits([]); setSnapshot(emptySnapshot()); setGroups([]); setLastArchivedHabit(null);
      setStorageError('');setServerGamification(null);
    }
    account.current = next;
    setUserState(next?.is_guest?null:next);
    setGuestMode(Boolean(next?.is_guest));
  }, []);

  const openEngine = useCallback(records => {
    const owner = account.current?.id;
    if (!owner) return null;
    if (engine.current?.userId === owner) { engine.current.merge(records); return engine.current; }
    engine.current?.dispose();
    const local = storage();
    if (!local) setStorageError('Tarayıcı yerel depolamaya izin vermiyor. Kaydedilmemiş değerler yalnızca bu sekme açıkken korunuyor.');
    const created = createAccountSync({
      userId: owner, request: account.current?.is_guest?guestRequest:api.request, storage: local, initialRecords: records,
      refresh: () => account.current?.is_guest ? Promise.resolve(guestRequest('habits')).then(data=>engine.current?.merge(data.checkins)) : refreshRef.current?.(),
      onChange: state => { if (account.current?.id === owner && engine.current === created) publish(state); },
      onStorageError: () => { if (mounted.current) setStorageError('Tarayıcı taslağı kalıcı saklayamadı. Kaydedilmemiş değerler yalnızca bu sekme açıkken korunuyor.'); },
    });
    engine.current = created;
    publish(created.snapshot());
    return created;
  }, [publish]);

  const loadData = useCallback(async () => {
    let ticket = guard.current.begin();
    const started = habitMutationVersion.current;
    let preferenceAtStart = preferencesVersion.current;
    setLoadError(null); setGroupsError('');
    setSyncState('Yükleniyor…');
    try {
      const data = await api.request('habits');
      if (!guard.current.isCurrent(ticket) || !mounted.current) return false;
      if (!data?.user?.id || !Array.isArray(data.habits) || !Array.isArray(data.checkins)) throw new Error('Sunucudan eksik veri geldi. Önceki kayıtların değiştirilmedi; yeniden dene.');
      setGuestMode(false);setAuthRequired(false);
      if (account.current?.id !== data.user.id) {
        setUser(data.user);
        ticket = guard.current.begin();
        preferenceAtStart = preferencesVersion.current;
      } else { account.current = data.user; setUserState(data.user); }
      setServerGamification(data.gamification||null);
      const protectedIds = new Set([...habitChanges.current.entries()].filter(([, version]) => version > started).map(([id]) => id));
      const nextHabits = data.habits.filter(h => !protectedIds.has(h.id));
      nextHabits.push(...habitsRef.current.filter(h => protectedIds.has(h.id)));
      habitsRef.current = nextHabits; setHabits(nextHabits);
      const first = Number(data.user.week_start ?? data.week_start) === 0 ? 0 : 1;
      if (preferencesVersion.current === preferenceAtStart) { preferredWeek.current = first; setWeekStart(first); }
      account.current = { ...data.user, week_start: preferredWeek.current }; setUserState(account.current);
      const active = openEngine(data.checkins);
      try {
        if (cacheEnabled.current) storage()?.setItem(accountStorageKey('cache', data.user.id), JSON.stringify({ user_id: data.user.id, habits: nextHabits, checkins: active.snapshot().records, week_start: preferredWeek.current }));
      } catch { setStorageError('Tarayıcı yerel kopyayı saklayamadı. Sunucudaki kayıtların etkilenmedi.'); }
      try {
        const result = await api.request('groups');
        if (!guard.current.isCurrent(ticket) || !mounted.current) return false;
        if (!Array.isArray(result?.groups)) throw new Error('Sunucu grup listesini doğrulamadı.');
        setGroups(result.groups);
      } catch (err) {
        if (!guard.current.isCurrent(ticket) || !mounted.current) return false;
        setGroupsError(err.message || 'Gruplar yüklenemedi.');
      }
      if (!active.snapshot().pendingEntries.length) setSyncState('Güncel');
      return true;
    } catch (err) {
      if (!guard.current.isCurrent(ticket) || !mounted.current) return false;
      if (err.status === 401) {
        const data=readGuest();setUser({...GUEST_USER,week_start:data.week_start});setAuthRequired(true);
        ticket=guard.current.begin();habitsRef.current=data.habits;setHabits(data.habits);setWeekStart(data.week_start);preferredWeek.current=data.week_start;openEngine(data.checkins);setGroups([]);setSyncState('Cihazda kaydedildi');
      }
      else {
        // An offline cache is usable only after this tab has positively identified its account.
        const id = account.current?.id;
        if (id && !habitsRef.current.length) {
          try {
            const cached = JSON.parse(storage()?.getItem(accountStorageKey('cache', id)) || 'null');
            if (cached?.user_id === id && Array.isArray(cached.habits) && Array.isArray(cached.checkins)) {
              habitsRef.current = cached.habits; setHabits(cached.habits); openEngine(cached.checkins);
            }
          } catch { /* Keep previously verified in-memory records. */ }
        }
        setSyncState('Bağlantı kurulamadı.');
      }
      setLoadError({ message: err.message || 'Veriler yüklenemedi.', unauthorized: err.status === 401 });
      return false;
    } finally { if (mounted.current && (guard.current.isCurrent(ticket) || !account.current)) setLoading(false); }
  }, [openEngine, setUser]);
  refreshRef.current = loadData;

  useEffect(() => {
    mounted.current = true;
    void loadData();
    const reconnect = async () => {
      const owner = account.current?.id;
      const current = engine.current;
      const loaded = await loadData();
      if (loaded && owner && account.current?.id === owner && current === engine.current) await current.retryErrors();
    };
    const dayChanged = () => {
      const next = dateKey();
      setToday(previous => { if (previous !== next) setSelectedDate(selected => selected === previous ? next : selected); return next; });
    };
    const timer = setInterval(dayChanged, 30000);
    window.addEventListener('online', reconnect);
    window.addEventListener('focus', dayChanged);
    document.addEventListener('visibilitychange', dayChanged);
    return () => {
      mounted.current = false; guard.current.reset(); engine.current?.dispose(); engine.current = null;
      clearInterval(timer);
      window.removeEventListener('online', reconnect); window.removeEventListener('focus', dayChanged);
      document.removeEventListener('visibilitychange', dayChanged);
    };
  }, [loadData]);

  // Persist confirmed data only; draft quantities have their own account-scoped storage.
  useEffect(() => {
    const id = account.current?.id;
    if (!id || loading || !cacheEnabled.current) return;
    try { storage()?.setItem(accountStorageKey('cache', id), JSON.stringify({ user_id: id, habits, checkins: snapshot.records, week_start: weekStart })); }
    catch { setStorageError('Tarayıcı yerel kopyayı saklayamadı. Sunucudaki kayıtların etkilenmedi.'); }
  }, [habits, snapshot.records, weekStart, loading]);

  const logCheckin = useCallback((habitId, value, options = {}) => {
    if (!account.current?.id || !engine.current) { setSyncState('Kayıt eklemek için giriş yap.'); return null; }
    if (!habitsRef.current.some(h => h.id === habitId)) return null;
    return engine.current.set(habitId, options.day || selectedDate, value, options);
  }, [selectedDate]);
  const retryEntry = useCallback((id, day = selectedDate) => engine.current?.retry(id, day), [selectedDate]);
  const undoEntry = useCallback((id, day = selectedDate) => engine.current?.undo(id, day), [selectedDate]);

  const accountRequest=(path,options)=>account.current?.is_guest?guestRequest(path,options):api.request(path,options);

  const serialize = useCallback((key, task) => {
    const owner = account.current?.id;
    const epoch = sessionEpoch.current;
    if (!owner) return Promise.reject(new Error('Bu işlem için giriş yapman gerekiyor.'));
    const previous = mutationChains.current.get(key) || Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      if (account.current?.id !== owner || sessionEpoch.current !== epoch) throw new Error('Oturum değişti; işlem gönderilmedi.');
      const result = await task(owner, epoch);
      if (account.current?.id !== owner || sessionEpoch.current !== epoch || !mounted.current) throw new Error('Oturum değişti; eski hesabın sonucu bu ekrana uygulanmadı.');
      return result;
    });
    mutationChains.current.set(key, next);
    const cleanup = () => { if (mutationChains.current.get(key) === next) mutationChains.current.delete(key); };
    next.then(cleanup, cleanup);
    return next;
  }, []);

  const addHabit = useCallback(data => serialize('create-habit', async (owner, epoch) => {
    setSyncState('Kaydediliyor…');
    try {
      const result = await accountRequest('habits', { method: 'POST', body: JSON.stringify({ ...data, start_date: data.start_date || selectedDate }) });
      if (!result?.habit?.id) throw new Error('Sunucu kaydı doğrulamadı. Lütfen yeniden dene.');
      if (account.current?.id !== owner || sessionEpoch.current !== epoch) return;
      const habit = { ...data, start_date: data.start_date || selectedDate, created_at: new Date().toISOString(), ...result.habit };
      habitChanges.current.set(habit.id, ++habitMutationVersion.current);
      habitsRef.current = [habit, ...habitsRef.current.filter(h => h.id !== habit.id)]; setHabits(habitsRef.current);
      setSyncState('Kaydedildi'); return habit;
    } catch (err) { if (account.current?.id === owner && sessionEpoch.current === epoch) setSyncState('Kaydedilemedi: ' + err.message); throw err; }
  }), [selectedDate, serialize]);

  const updateHabit = useCallback((id, data) => serialize(`habit:${id}`, async (owner, epoch) => {
    setSyncState('Kaydediliyor…');
    try {
      const effective = data.effective_from || dateKey();
      const result = await accountRequest(`habits/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ ...data, effective_from: effective }) });
      requireOk(result);
      if (account.current?.id !== owner || sessionEpoch.current !== epoch) return;
      const original = habitsRef.current.find(h => h.id === id);
      if (!original) throw new Error('Alışkanlık artık listede değil. Güncel veriyi yükleyip yeniden dene.');
      // Partial edits inherit the rule at their effective date, not a later scheduled rule.
      const atEffective = { ...settingsAt(original, effective), ...data };
      const settings = { name: atEffective.name, tracking: atEffective.tracking, direction: atEffective.direction, unit: atEffective.unit, target: atEffective.target, schedule: atEffective.schedule, progression: atEffective.progression, debt: atEffective.debt, paused: Boolean(atEffective.paused), archived_at: atEffective.archived_at ?? null };
      const baseline = original.versions?.length ? original.versions : [{ effective_from: original.start_date || effective, settings: { ...original, paused: Boolean(original.paused), archived_at: original.archived_at ?? null } }];
      const versions = baseline.filter(v => v.effective_from !== effective);
      versions.push({ effective_from: effective, settings });
      versions.sort((a, b) => a.effective_from.localeCompare(b.effective_from));
      const updated = { ...original, ...settingsAt({ ...original, versions }, dateKey()), versions, updated_at: new Date().toISOString() };
      habitChanges.current.set(id, ++habitMutationVersion.current);
      habitsRef.current = habitsRef.current.map(h => h.id === id ? updated : h); setHabits(habitsRef.current);
      setSyncState('Kaydedildi'); return updated;
    } catch (err) { if (account.current?.id === owner && sessionEpoch.current === epoch) setSyncState('Kaydedilemedi: ' + err.message); throw err; }
  }), [serialize]);
  const togglePause = useCallback(habit => updateHabit(habit.id, { paused: !habit.paused, effective_from: dateKey() }), [updateHabit]);
  const archiveHabit = useCallback(async id => {
    const original = habitsRef.current.find(h => h.id === id);
    const result = await updateHabit(id, { archived_at: new Date().toISOString(), effective_from: dateKey() });
    setLastArchivedHabit(original); return result;
  }, [updateHabit]);
  const restoreHabit = useCallback(async id => {
    const result = await updateHabit(id, { archived_at: null, paused: false, effective_from: dateKey() });
    setLastArchivedHabit(null); return result;
  }, [updateHabit]);

  const updateWeekStart = useCallback(value => {
    const ownerAtCall = account.current?.id, epochAtCall = sessionEpoch.current;
    return serialize('preferences', async (owner, epoch) => {
      const start = Number(value) === 0 ? 0 : 1;
      const result = await accountRequest('account/preferences', { method: 'PATCH', body: JSON.stringify({ week_start: start }) });
      requireOk(result);
      if (account.current?.id === owner && sessionEpoch.current === epoch) { preferencesVersion.current++; preferredWeek.current = start; setWeekStart(start); account.current = { ...account.current, week_start: start }; setUserState(account.current); setSyncState('Tercih kaydedildi.'); }
      return result;
    }).catch(err => { if (account.current?.id === ownerAtCall && sessionEpoch.current === epochAtCall) setSyncState('Tercih kaydedilemedi: ' + err.message); throw err; });
  }, [serialize]);

  const importBackup = useCallback(async data => {
    if (engine.current?.snapshot().pendingEntries.length) return { success: false, error: 'Önce bekleyen kayıtlarını eşitle veya geri al; içe aktarma taslaklarının üzerine yazmamalı.' };
    try {
      const result = await serialize('import', async () => requireOk(await (account.current?.is_guest?guestRequest('import',{method:'POST',body:JSON.stringify(data)}):api.importData(data))));
      await loadData();
      return { success: true, count: result.habits_count ?? 0, ...result };
    } catch (err) { return { success: false, error: err.message }; }
  }, [loadData, serialize]);

  const clearLocalData = useCallback(({ discardPending = false } = {}) => {
    const owner = account.current?.id;
    if (!owner) return;
    if (!discardPending && engine.current?.snapshot().pendingEntries.length) throw new Error('Önce bekleyen kayıtlarını eşitle veya geri al.');
    cacheEnabled.current = false;
    if (discardPending) {
      // Only the caller's explicitly confirmed account-deletion flow may discard unsent drafts.
      engine.current?.dispose({ clear: true }); engine.current = null; setSnapshot(emptySnapshot());
    }
    const local = storage();
    local?.removeItem(accountStorageKey('cache', owner)); local?.removeItem(accountStorageKey('entry_drafts', owner));
    setStorageError('');
  }, []);

  const migrateGuestToCloud=useCallback(async({confirmed=false}={})=>{
    const data=guestBackup();if(!data.habits.length)return {requiresConfirmation:false,count:0};
    if(!confirmed)return {requiresConfirmation:true,count:data.habits.length};
    if(!account.current||account.current.is_guest)throw new Error('Aktarmadan önce hesabına giriş yap.');
    await api.importData(data);clearGuest();await loadData();return {requiresConfirmation:false,count:data.habits.length};
  },[loadData]);
  const checkinErrors=Object.fromEntries(snapshot.pendingEntries.filter(e=>['conflict','error'].includes(e.status)).map(e=>[e.id,{message:e.error,value:e.value}]));
  const checkins = snapshot.checkins;
  const todayHabits = useMemo(() => habits.filter(h => {
    const historical = settingsAt(h, selectedDate);
    if (selectedDate < h.start_date || historical.archived_at) return false;
    return filterMode === 'all' || isPlannedOn(h, selectedDate, checkins, weekStart);
  }), [habits, selectedDate, filterMode, checkins, weekStart]);
  const completionStats = useMemo(() => {
    const completed = todayHabits.filter(h => stateFor(h, selectedDate, checkins, weekStart).status === 'done').length;
    return { completed, total: todayHabits.length, percentage: todayHabits.length ? Math.round(100 * completed / todayHabits.length) : 0 };
  }, [todayHabits, checkins, selectedDate, weekStart]);
  return { guestMode,authRequired,setAuthRequired,serverGamification,migrateGuestToCloud,guestBackup,guestDraftCount:readGuest().habits.length,confirmedCheckins:snapshot.records,checkinErrors,clearCheckinError:()=>{},togglePauseHabit:togglePause, habits, checkins, groups, groupsError, user, setUser, weekStart, updateWeekStart, loading, syncState, loadError, storageError, selectedDate, setSelectedDate, today, filterMode, setFilterMode, todayHabits, completionStats, logCheckin, addHabit, updateHabit, togglePause, archiveHabit, restoreHabit, lastArchivedHabit, setLastArchivedHabit, importBackup, loadData, entryStates: snapshot.entryStates, pendingEntries: snapshot.pendingEntries, retryEntry, undoEntry, clearLocalData };
}

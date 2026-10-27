/** Per-day optimistic drafts; persistence contains quantities only and is account scoped by caller. */
export function createEntryQueue(options) {
  const { readRecord, write, accept, refresh, onChange, storage, storageKey } = options;
  const entries = new Map();
  let disposed = false;
  const keyFor = (id, day) => JSON.stringify([id, day]);
  const same = (a, b) => a.value === b.value && Boolean(a.deleted) === Boolean(b.deleted);
  const snapshot = record => ({ value: Number(record?.value || 0), deleted: !record || Boolean(record.deleted) });
  function persist() {
    if (!storage || !storageKey || disposed) return;
    try {
      const drafts = [...entries.values()].filter(e => e.status !== 'saved').map(({ id, day, value, deleted }) => ({ id, day, value, deleted }));
      if (drafts.length) storage.setItem(storageKey, JSON.stringify(drafts));
      else storage.removeItem(storageKey);
    } catch { /* Storage may be unavailable; the in-memory draft remains usable. */ }
  }
  const view = e => e ? ({ value: e.value, deleted: e.deleted, status: e.status, error: e.error, previous: { ...e.previous }, canUndo: e.canUndo }) : null;
  function notify(e) { if (!disposed) { persist(); onChange?.(e.id, e.day, view(e)); } }
  function validate(value) {
    if (value === '' || value === null || typeof value === 'boolean' || (typeof value === 'string' && !value.trim())) throw new TypeError('Miktar gerekli.');
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 1e6) throw new RangeError('Miktar 0 ile 1000000 arasında olmalı.');
    return n;
  }
  function make(id, day) {
    const previous = snapshot(readRecord(id, day));
    return { id, day, ...previous, previous, canUndo: false, status: 'saved', error: '', timer: null, running: null, attempt: null };
  }
  if (storage && storageKey) {
    try {
      const saved = JSON.parse(storage.getItem(storageKey) || '[]');
      if (Array.isArray(saved)) for (const draft of saved) {
        if (typeof draft.id !== 'string' || typeof draft.day !== 'string') continue;
        try {
          const e = make(draft.id, draft.day);
          Object.assign(e, { value: validate(draft.value), deleted: Boolean(draft.deleted), status: 'error', error: 'Kaydedilmemiş kayıt. Yeniden dene.', canUndo: true });
          entries.set(keyFor(e.id, e.day), e);
        } catch { /* Ignore damaged drafts. */ }
      }
    } catch { /* Ignore damaged or inaccessible storage. */ }
  }
  function set(id, day, value, { deleted = false, immediate = false } = {}) {
    if (disposed) return null;
    const desired = { value: validate(value), deleted: Boolean(deleted) };
    const key = keyFor(id, day);
    let e = entries.get(key);
    if (!e) { e = make(id, day); entries.set(key, e); }
    if (e.status === 'saved') {
      const latest = snapshot(readRecord(id, day));
      if (!same(e, latest)) Object.assign(e, latest, { canUndo: false });
    }
    if (same(e, desired)) return view(e);
    if (e.status === 'saved') e.previous = snapshot(readRecord(id, day));
    Object.assign(e, desired, { canUndo: true, error: '' });
    clearTimeout(e.timer);
    // Preserve a conflict/error until explicit retry; editing must not silently overwrite server data.
    if (e.status !== 'conflict' && e.status !== 'error') e.status = e.running ? 'saving' : 'pending';
    notify(e);
    if (e.status === 'pending' || e.status === 'saving') {
      if (immediate) void flush(id, day);
      else e.timer = setTimeout(() => { e.timer = null; void flush(id, day); }, 250);
    }
    return view(e);
  }
  async function drain(e) {
    while (!disposed && e.status !== 'error' && e.status !== 'conflict') {
      const current = snapshot(readRecord(e.id, e.day));
      // An ambiguous attempt must be resent even if a refresh already exposes its value.
      if (!e.attempt && same(e, current)) { e.status = 'saved'; e.error = ''; notify(e); return; }
      const desired = { value: e.value, deleted: e.deleted };
      if (!e.attempt || !same(e.attempt, desired)) e.attempt = { id: e.id, day: e.day, ...desired, expected_revision: Number(readRecord(e.id, e.day)?.revision || 0), idempotency_key: crypto.randomUUID() };
      const attempt = e.attempt;
      e.status = 'saving'; notify(e);
      try {
        const response = await write({ ...attempt });
        if (disposed) return;
        accept(e.id, e.day, response);
        e.attempt = null;
        if (same(e, attempt)) { e.status = 'saved'; e.error = ''; notify(e); return; }
      } catch (error) {
        if (disposed) return;
        if (error?.status === 409) {
          e.attempt = null;
          try { await refresh?.(); } catch { /* Keep desired draft even if refresh fails. */ }
          if (disposed) return;
          e.status = 'conflict';
        } else e.status = 'error';
        e.error = error?.message || 'Kayıt kaydedilemedi.';
        notify(e); return;
      }
    }
  }
  function flush(id, day) {
    const e = entries.get(keyFor(id, day));
    if (disposed || !e) return Promise.resolve(null);
    clearTimeout(e.timer); e.timer = null;
    if (e.running) return e.running;
    if (e.status === 'error' || e.status === 'conflict') return Promise.resolve(view(e));
    e.running = drain(e).finally(() => { e.running = null; });
    return e.running;
  }
  function retry(id, day) {
    const e = entries.get(keyFor(id, day));
    if (disposed || !e) return Promise.resolve(null);
    e.status = 'pending'; e.error = ''; notify(e);
    return flush(id, day);
  }
  function undo(id, day) {
    const e = entries.get(keyFor(id, day));
    if (disposed || !e?.canUndo) return Promise.resolve(null);
    const previous = { ...e.previous };
    set(id, day, previous.value, { deleted: previous.deleted });
    e.canUndo = false;
    // Explicit undo is a deliberate write, including after an error or conflict.
    return retry(id, day);
  }
  return {
    set, get: (id, day) => view(entries.get(keyFor(id, day))), flush, retry, undo,
    hasPending: () => [...entries.values()].some(e => e.status !== 'saved'),
    dispose({ clear = false } = {}) {
      if (disposed) return;
      persist(); disposed = true;
      for (const e of entries.values()) clearTimeout(e.timer);
      if (clear && storage && storageKey) try { storage.removeItem(storageKey); } catch { /* best effort */ }
    }
  };
}



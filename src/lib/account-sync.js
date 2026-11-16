import { createEntryQueue } from './entry-queue.js';
import { mergeCheckins } from './state-sync.js';

export const entryKey = (id, day) => JSON.stringify([id, day]);
export const accountStorageKey = (kind, userId) => `pace_${kind}_v2:${encodeURIComponent(userId)}`;

export function validCheckin(row, { id, day, value, deleted, expected_revision }) {
  return row && typeof row.id === 'string' && row.habit_id === id && row.habit_date === day &&
    Number.isInteger(Number(row.revision)) && Number(row.revision) === Number(expected_revision) + 1 &&
    Number.isFinite(Number(row.value)) && Number(row.value) === Number(value) && Boolean(row.deleted) === Boolean(deleted);
}

/** An account owns its accepted revisions and drafts. React only subscribes to snapshots. */
export function createAccountSync({ userId, request, storage, initialRecords = [], refresh, onChange, onStorageError }) {
  let records = mergeCheckins([], initialRecords);
  let disposed = false;
  const safeStorage = storage ? {
    getItem(key) { try { return storage.getItem(key); } catch (err) { onStorageError?.(err); throw err; } },
    setItem(key, value) { try { storage.setItem(key, value); } catch (err) { onStorageError?.(err); throw err; } },
    removeItem(key) { try { storage.removeItem(key); } catch (err) { onStorageError?.(err); throw err; } },
  } : null;
  const emit = () => { if (!disposed) onChange?.(snapshot()); };
  const queue = createEntryQueue({
    readRecord: (id, day) => records.find(row => row.habit_id === id && row.habit_date === day),
    write: async attempt => {
      if (disposed) throw new Error('Oturum değişti; kayıt gönderilmedi.');
      const response = await request(`habits/${encodeURIComponent(attempt.id)}/check-ins/${attempt.day}`, {
        method: attempt.deleted ? 'DELETE' : 'PUT',
        body: JSON.stringify({ value: attempt.value, expected_revision: attempt.expected_revision, idempotency_key: attempt.idempotency_key }),
      });
      if (!validCheckin(response?.checkin, attempt)) throw new Error('Sunucu kayıt sonucunu doğrulamadı. Değerin korunuyor; yeniden deneyebilirsin.');
      return response;
    },
    accept(id, day, response) {
      if (disposed) return;
      const incoming = response.checkin;
      const latest = records.find(row => row.habit_id === id && row.habit_date === day);
      if (Number(latest?.revision || 0) > Number(incoming.revision) &&
          (Number(latest.value) !== Number(incoming.value) || Boolean(latest.deleted) !== Boolean(incoming.deleted))) {
        throw Object.assign(new Error('Kayıt bu sırada başka bir cihazda değişti. Güncel kayıt yüklendi; taslağın korunuyor.'), { status: 409 });
      }
      records = mergeCheckins(records, [incoming]);
    },
    refresh: async () => { if (!disposed) await refresh?.(); },
    onChange: emit,
    storage: safeStorage,
    storageKey: accountStorageKey('entry_drafts', userId),
  });
  function snapshot() {
    const entries = queue.entries();
    const entryStates = Object.fromEntries(entries.map(({ id, day, ...state }) => [entryKey(id, day), state]));
    const drafts = entries.filter(e => e.status !== 'saved');
    const displayed = records.map(row => ({ ...row }));
    for (const draft of drafts) {
      const index = displayed.findIndex(row => row.habit_id === draft.id && row.habit_date === draft.day);
      const row = { ...(index >= 0 ? displayed[index] : {}), id: index >= 0 ? displayed[index].id : `draft:${draft.id}:${draft.day}`, habit_id: draft.id, habit_date: draft.day, value: draft.value, deleted: Number(draft.deleted), sync_status: draft.status };
      if (index >= 0) displayed[index] = row; else displayed.push(row);
    }
    return { records: [...records], checkins: displayed, entryStates, pendingEntries: drafts };
  }
  return {
    userId, snapshot,
    merge(incoming) { if (!disposed) { records = mergeCheckins(records, incoming); emit(); } },
    set(id, day, value, options) {
      const entry = queue.get(id, day);
      const current = entry && entry.status !== 'saved' ? entry : records.find(row => row.habit_id === id && row.habit_date === day);
      const next = typeof value === 'function' ? value(Number(current?.deleted ? 0 : current?.value || 0)) : value;
      return queue.set(id, day, next, options);
    },
    retry: (id, day) => queue.retry(id, day),
    undo: (id, day) => queue.undo(id, day),
    flush: (id, day) => queue.flush(id, day),
    async retryErrors() {
      // Conflicts and restored drafts require a deliberate user action; reconnect only retries transient in-session errors.
      const entries = queue.entries().filter(e => e.status === 'error' && !e.restored);
      await Promise.all(entries.map(e => queue.retry(e.id, e.day)));
    },
    dispose(options) { queue.dispose(options); disposed = true; },
  };
}

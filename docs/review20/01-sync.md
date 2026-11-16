# Final critique 01/20 — data reliability

Date: 2026-11-16. Reviewed active React hook, account sync engine, entry queue and load guard. Source was not edited.

## Acceptance status: FAIL pending the blockers below

### Confirmed P1 — stale revision may be reported as saved

`validCheckin` checks that the returned revision is a positive integer, but does not relate it to the sent `expected_revision`. Independently reproduced with initial revision 5/value 5 and a response containing revision 1/value 6: `mergeCheckins` correctly preserves revision 5, but the queue marks desired value 6 saved and clears pendingEntries. The actual confirmed/displayed value remains 5.

Acceptance: reject a response whose revision is not the expected committed revision (`expected_revision + 1` for this API), retain the user's desired value as a visible error/conflict, and add a direct account-sync regression test.

Also verify: when a newer GET already exposed revision 7 with a different quantity before a revision-6 PUT response arrives, the UI must not silently report the old intent as saved. It should preserve the newer confirmed record while showing the superseded intent as a conflict requiring an explicit choice.

### P2 source-level race — successful week preference can be overwritten by older GET

`loadData` protects freshly mutated habits with `changedAt`, but always assigns the returned week_start. A GET captured before a successful preference PATCH can restore the old preference in the UI. This specific race was not independently browser-reproduced in this review.

Acceptance: protect preference assignment with a mutation version/timestamp and add held-GET → successful PATCH → late-GET browser coverage.

## Passed evidence

- `node --test scripts/test-account-sync.mjs scripts/test-state-sync.mjs`: 12 tests passed.
- `node scripts/test-entry-queue.mjs`: 12 tests passed.
- Current implementation uses synchronous accepted-record references, one in-flight writer per habit/date, functional desired-value updates, account-specific storage, session/load guards, retained conflict drafts, explicit restored-draft retry, and serialized lifecycle mutations.
- `PACE_BASE_URL=http://localhost:5173 node scripts/test-hook-sync-e2e.mjs`: passed real React hook coverage for rapid intent, stale GET/PUT, conflict retry, account switch, restored drafts, malformed success, rejected preferences and archive/undo ordering.

## Unverified

Real multi-device production races and real device loss/recovery were not tested. These are separate from the confirmed source-level blockers; no unconditional 10/10 claim is made.

## Düzeltme sonrası kapanış — 16 Kasım 2026

İlk bağımsız incelemedeki FAIL kaydı yukarıda korunmuştur. Sonraki uygulama ve ana ajan doğrulamasında: yanıt revizyonu artık tam `expected_revision + 1` olmak zorunda; daha yeni GET ile çelişen geç PUT görünür çatışmaya dönüşür; başarılı hafta tercihi daha eski GET ile geri alınmaz. `test-account-sync.mjs` 10 testi ve genişletilmiş gerçek React hook tarayıcı senaryosu bu regresyonları geçti. Açık kaynak-kod bulguları kapandı; bu kapanış ilk bağımsız eleştirmenin üretim/cihaz onayı olarak sunulmaz. Çok cihazlı canlı D1 testi UNVERIFIED kalır.

# Review 02/20 — Groups and shared tracking

Date: 16 November 2026. Reviewer: `review02_groups`. Source review and focused local Chromium checks; no source files changed.

## Acceptance result

**Implemented code acceptance: PASS. Full unconditional 10/10: not established.** The demo/production owner-leave mismatch is now fixed and directly rechecked; real multi-account production execution remains unverified.

| Criterion | Result | Evidence |
| --- | --- | --- |
| Own shared check-in create/edit/remove, decimal target, revision/idempotency | PASS | `test-group-workflows-e2e.mjs`; ambiguous 503 retries same key, 409 preserves draft, explicit refresh uses current revision, remove/re-enter consumes tombstone revision. |
| Owner add habit, edit group, kick, transfer; member controls restricted | PASS | Strict-contract React E2E; backend membership/role guards inspected. |
| Last owner leaving clearly acknowledges deletion | PASS | Typed group-name confirmation verified by E2E; real backend delegates last-owner leave to delete. |
| Detail retry and stable selection context | PASS | 503 retry, navigation away/back and selection persistence verified by E2E. |
| Week-start, own-row actions and future-day descriptions | PASS | App passes `weekStart`; helper tests cover elapsed denominator, future/missing/explicit-zero meanings. |
| Tombstones retained in group GET | PASS (source) | Backend `getGroup` includes `deleted` and no longer filters deleted check-ins. E2E verifies client recreation with latest revision. |
| Guest invite → authentication → Escape retains invite | PASS | Additional local Chromium repro retained `?join=keep-me` and “Bekleyen grup davetin korunuyor.” Auth capturing Escape handler prevents background close. |
| App contract integration | PASS | App passes both `weekStart` and `onRequireAuth`; URL invitation clearing is connected. |
| Demo owner leave with other members matches UI/production | PASS | Direct demo recheck: owner leaves three-member group; next member becomes owner, remaining group persists with two members, former owner loses membership/list entry. |
| Real D1 + two authenticated accounts + production concurrency | UNVERIFIED | Local strict-contract browser mocks establish client behavior, not live D1/auth/deployment correctness. |

## Commands

- `node --test scripts/test-group-ui.mjs scripts/test-group-creation.mjs`: 13 tests passed.
- `PACE_BASE_URL=http://localhost:5173 node scripts/test-group-workflows-e2e.mjs`: passed, including tombstone recreate.
- Guest invitation Escape repro: preserved token and pending invite after closing authentication.

## Remaining actionable acceptance

1. CLOSED: demo leave now auto-transfers leadership; direct assertion run passed on 16 November 2026.
2. Add or run an actual API-handler SQLite/D1 integration scenario with two users for invite acceptance, own writes and unauthorized writes. No claim of live-system testing until that evidence exists.

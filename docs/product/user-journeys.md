# PACE — End-to-End User Journeys

**Document Status:** M1 Deliverable  
**UX Optimization Goals:** Minimum steps, 1-tap primary actions, zero unnecessary confirmation modals, continuous context, and clear error/offline recovery.

---

## Journey 1: New Guest User (Zero-Friction Onboarding)
1. **Entry:** User opens PACE PWA (`/`). No login wall is shown.
2. **Initial State:** `TodayView` (`#today`) loads immediately in Guest Mode (`guest-store.js`).
3. **Onboarding Prompt:** If no habits exist, an inline `OnboardingStarter` block offers:
   - **1-tap preset** (e.g., from `discoverCatalog.js`) OR
   - **Create custom habit** (`HabitModal`) OR
   - **Try Demo Mode** (`?demo=1`).
4. **First Action:** User creates a habit and immediately sees it on `TodayView`.
5. **First Check-in:** User taps the habit row → status flips to `DONE` (`#C8FF2E`), streak increments to `1`, state persists locally in `guest-store.js`.
6. **Upgrade Path:** A non-intrusive banner/CTA in `Sidebar` / `Settings` invites the user to create an account to sync across devices.

---

## Journey 2: Returning Authenticated User
1. **Entry:** User opens PACE; `__Host-pace_session` cookie (or Bearer token) is validated via `/api/auth/capabilities` and initial state sync.
2. **Landing:** `TodayView` (`#today`) renders immediately with cached/local state while background sync reconciles any server updates.
3. **Deep-Link Handling:** If opened with `?join=<token>`, `?invite=<token>`, `?view=<tab>`, or `?preset=<id>`, `App.jsx` routes directly to the target view/modal without losing session context.
4. **Session Expiry / 401:** If session expires, user is prompted via `AuthModal` to re-authenticate; any pending offline check-ins remain safely queued in `entry-queue.js`.

---

## Journey 3: Habit Creation & Daily Check-in
1. **Creation (`HabitModal`):**
   - User taps `+ Yeni Alışkanlık` from `TodayView` or `HabitsView`.
   - Enters **Title**, selects **Type** (`check` or `quantity`), **Direction** (`at_least` / `at_most`), **Target & Unit** (with Turkish decimal support via `numeric-entry.js`), and **Schedule**.
   - Submits → `useHabits` persists locally (Guest) or via `POST /api/habits` (Cloud).
2. **Daily Check-in (`TodayView`):**
   - **Binary (`check`):** 1-tap on the habit row toggles completion immediately (optimistic UI + `entry-queue.js` OCC write).
   - **Quantitative (`quantity`):** User taps `+` / `-` stepper or enters value inline; `rules.js` evaluates against target (`at_least` / `at_most`) and marks `DONE` when met.
3. **Rule Editing:** Editing an existing habit's target/schedule creates a new effective-dated `habit_version`, preserving past streak accuracy.

---

## Journey 4: Group Creation & Invite Acceptance
1. **Group Creation (`GroupsView`):**
   - Authenticated user taps `+ Yeni Grup` → enters group name → `POST /api/groups`.
   - User adds shared `group_habits` and generates a **7-day Invite Link** (`invite_type: 'link'`) or **Email Invite** (`invite_type: 'email'`).
2. **Invite Acceptance (Invitee):**
   - Invitee opens `?join=<token>` or `?invite=<token>`.
   - `App.jsx` routes to `#groups` and calls `getInvitePreview`.
   - If Guest, user is prompted to sign in/register (with `migrateGuestToCloud` preserving their existing local habits).
   - User taps **Katıl (Accept)** → `respondInvite` adds them to `group_members` and displays the shared habit matrix.
3. **Group Interaction:** Members log `group_checkins` (OCC) and send lightweight `group_reactions` visible in `social/inbox`.

---

## Journey 5: Offline Sync & Recovery
1. **Offline Detection:** User loses connectivity while checking off habits on `TodayView`.
2. **Local Continuity:** `entry-queue.js` buffers all check-in mutations and tombstones (`deleted = 1`) locally; UI reflects optimistic `DONE` state with a subtle monospace `OFFLINE / QUEUED` indicator.
3. **Reconnection:** When network returns, `entry-queue.js` flushes queued operations sequentially using Optimistic Concurrency Control (OCC).
4. **Conflict / Error Recovery:**
   - If a transient network error occurs, `entry-queue.js` retries with backoff.
   - If an unrecoverable error occurs, `ErrorBoundary` or inline feedback banner surfaces a clear **Tekrar Dene (Retry)** action without wiping local state.

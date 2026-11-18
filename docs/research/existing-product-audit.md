# Existing Product Audit — PACE

**Audit Date:** 2026-11-18  
**Scope:** Full technical and product audit of the existing PACE repository (`/home/antigravity/ferhat-gunes/pace`) prior to the Disciplined Brutalism UI/UX reconstruction.  
**Sources:** `package.json`, `vite.config.js`, `wrangler.toml`, `DESIGN.md`, `src/`, `functions/`, `migrations/`, `workers/`, `assets/`, and `explorer_survey_1/handoff.md`.

---

## 1. Tech Stack & Frameworks
- **Frontend:** React `^19.3.1`, React DOM `^19.3.1`, `lucide-react` `^1.70.0`, `motion` `^14.14.0`, `canvas-confetti` `^1.9.4`.
- **Current Design System Packages:** `@astryxdesign/core` `^0.7.11`, `@astryxdesign/theme-matcha` `^0.7.11`, `@astryxdesign/cli` `^0.7.11`.
- **Build & Tooling:** Vite `^8.3.7`, `@vitejs/plugin-react` `^6.3.0`, `@babel/plugin-transform-runtime` `^7.29.7`. Custom Vite plugin `pace-pages-pwa` (`vite.config.js:8-25`) copies `assets/icons`, `manifest.webmanifest`, `_headers`, and `_routes.json` into `dist/`, and injects a SHA-256 asset manifest into `dist/sw.js`.
- **Testing:** Node.js built-in test runner (`node --test`), `playwright` `^1.65.0`, `axe-core` `^4.14.0`, `agent-browser` `^0.42.0`.
- **Backend & Hosting:** Cloudflare Pages Functions (`functions/api/[[path]].js`, `functions/_middleware.js`), Cloudflare D1 SQLite (`wrangler.toml:5-9`, `database_name = "pace"`, `migrations_dir = "migrations"`), and a separate scheduled Web Push dispatcher worker (`workers/push-dispatcher.js`, `wrangler.push.toml`).

---

## 2. Application Architecture
- **Entry Point (`src/main.jsx`):** Mounts `<ThemeProvider><App /></ThemeProvider>` and registers `/sw.js` in production.
- **Root Orchestrator (`src/App.jsx`):** Manages `HabitModal` and `AuthModal`, deep-link query parameters (`?join=`, `?invite=`, `?auth=`, `?view=`, `?preset=`), social inbox polling (30s interval), daily reminder polling (60s interval), and lazy-loaded secondary views.
- **State Hooks (`src/state/`):** `useNavigation.js`, `useHabits.js`, `useGamification.js`, `useDialogAccessibility.js`.
- **Domain Logic & Services (`src/lib/`):** `api.js`, `rules.js`, `statistics.js`, `state-sync.js`, `entry-queue.js`, `entry-affordances.js`, `habit-form.js`, `guest-store.js`, `account-sync.js`, `backup.js`, `notifications.js`, `telemetry.js`, `discoverCatalog.js`, `celebration.js`, `soundFx.js`, `date.js`, `local-date.js`, `numeric-entry.js`, `controller.js`.
- **UI Components (`src/components/`):**
  - Views: `TodayView.jsx`, `HabitsView.jsx`, `DiscoverView.jsx`, `ProgressView.jsx`, `GroupsView.jsx`, `SettingsView.jsx`.
  - Navigation: `Navigation/Sidebar.jsx`, `Navigation/TopBar.jsx`, `Navigation/MobileNav.jsx`, `Navigation/UpdateBanner.jsx`, `Navigation/PwaInstallBanner.jsx`.
  - Feature Modules: `Groups/GroupSocialPanel.jsx`, `Settings/AccountSecuritySettings.jsx`, `Settings/NotificationSettings.jsx`, `Common/ErrorBoundary.jsx`, `Common/FrictionMicroSurvey.jsx`, `AuthModal.jsx`, `HabitModal.jsx`, `DailyEngagement.jsx`, `OnboardingStarter.jsx`.
- **Backend (`functions/`, `migrations/`, `workers/`):** Cloudflare Pages Functions REST API, security middleware, D1 SQLite migrations `0001`–`0006`, and Web Push worker.

---

## 3. Existing Screens & Navigation System
- **Routing:** Hash-based routing (`src/state/useNavigation.js:2-11`) supporting 6 views:
  1. `today` (`Bugün`)
  2. `habits` (`Alışkanlıklar` / `Rutinler`)
  3. `discover` (`Keşfet` — feature-flagged via `isFeatureEnabled('discover_rhythm_trials')`)
  4. `progress` (`İlerleme`)
  5. `groups` (`Gruplar`)
  6. `settings` (`Ayarlar`)
- **Accessibility:** `useNavigation.js:12-23` uses a `MutationObserver` on `#main-content` to focus `#view-${view} h1` on view change and updates `document.title`.
- **Desktop Navigation (`Sidebar.jsx`):** Brand mark, 4–5 navigation items, sync indicator, auth CTA (for guest/demo), and Settings link.
- **Mobile Navigation (`MobileNav.jsx`):** 5–6 column bottom navigation bar with `lucide-react` icons, sound/haptic feedback (`playPop()`, `triggerHaptic('light')`), and `aria-current="page"`.

---

## 4. Existing User Flows
- **Guest / Demo / Authenticated Modes:** Local guest mode (`src/lib/guest-store.js`), demo mode (`?demo=1` or `api.startDemo()`), and authenticated cloud mode with guest-to-cloud migration (`migrateGuestToCloud` in `src/App.jsx:52`).
- **Habit Lifecycle:** Create/edit via `HabitModal.jsx`, daily check-in on `TodayView.jsx` with optimistic/queued OCC writes (`entry-queue.js`), and pause/archive/restore on `HabitsView.jsx`.
- **Group & Invite Flow:** Deep links (`?join=<token>` or `?invite=<token>`) route to `groups` (`src/App.jsx:115-118`), preview invite (`getInvitePreview`), accept/decline (`respondInvite`), and log shared group check-ins (`setGroupCheckin`).

---

## 5. Authentication & User Management
- **Session Management (`functions/lib/auth.js`):** `__Host-pace_session` HttpOnly/Secure/SameSite=Lax cookie (30-day `Max-Age`) or `Authorization: Bearer <token>` header.
- **CSRF / Origin Protection:** `requireSameOrigin` checks `Origin`, `Sec-Fetch-Site`, or `Referer` with an allowlist for mobile origins.
- **Password & Recovery (`functions/lib/password.js`, `src/lib/api.js`):** `passwordAuth` enforces 8–128 character passwords, IP/email rate limiting (`rate_limits` table), one-time recovery codes, `changePassword`, and `regenerateRecoveryCode`.
- **Security Headers (`functions/_middleware.js`):** Strict CSP (`default-src 'self'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `COOP: same-origin`, `CORP: same-origin`, and HSTS on HTTPS.

---

## 6. Database & Data Models (`migrations/0001`–`0006`)
17 tables/alterations across 6 D1 SQLite migrations:
- `0001_initial.sql`: `users`, `login_codes`, `sessions`, `rate_limits`, `habits`, `habit_versions` (effective-dated rule history), `checkins`.
- `0002_password_accounts.sql`: `credentials`.
- `0003_checkin_tombstones.sql`: `ALTER TABLE checkins ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0`.
- `0004_groups_and_social.sql`: `groups`, `group_members`, `group_invites`, `group_habits`, `group_checkins`.
- `0005_social_reactions_and_gamification.sql`: `group_reactions`, `user_gamification`.
- `0006_web_push.sql`: `push_subscriptions`.

---

## 7. API & Backend Integrations
REST JSON API under `/api/*` (`functions/api/[[path]].js`) with client-side response validation (`validateResponse` in `src/lib/api.js:64`):
- **Auth & Account:** `auth/capabilities`, `account/password`, `account/recovery-code`, `export`, `import`.
- **Habits & Check-ins:** Habit CRUD, versioned rule updates (`updateHabit`), OCC check-in writes.
- **Groups & Social:** `groups`, `groups/:id`, `groups/:id/leave`, `groups/:id/members/:userId`, `groups/:id/transfer`, `groups/:id/habits`, `groups/:id/invites`, `invites/:code`, `invites/:code/respond`, `groups/:id/habits/:habitId/check-ins/:day`, `groups/:id/reactions`, `social/inbox`, `social/inbox/:id/read`.
- **Gamification & Push:** `gamification`, `push/public-key`, `push/subscribe`, `push/preferences`.

---

## 8. Habit, Group, Goal & Activity Systems
- **Habits:** Support `check` and `quantity` tracking, `at_least` / `at_most` direction, units, targets, effective-dated `habit_versions`, pause/archive/restore, and Turkish decimal handling.
- **Groups:** Owner/member roles, shared `group_habits`, isolated `group_checkins` with OCC, group completion matrix, ownership transfer, kick/leave, and `group_reactions`.
- **Gamification:** `useGamification` (`src/App.jsx:79`) tracks streaks/XP/levels and awards daily all-done bonuses (`awardAllDoneBonus`).

---

## 9. Notification & Invitation Mechanisms
- **Invitations:** Link (`invite_type: 'link'`) and email (`invite_type: 'email'`) invites with 7-day expiration (`functions/api/[[path]].js:177`); legacy `username` invites are explicitly rejected.
- **Notifications:** Client-side daily reminder polling (60s in `src/App.jsx:90-95`), app badge updates (`updateAppBadge`), social inbox polling (30s in `src/App.jsx:88`), and Web Push via `push_subscriptions` + `workers/push-dispatcher.js`.

---

## 10. Existing Components & Design System
- Current visual language is **Scrapbook Habit Journal** (`DESIGN.md`, `src/styles/scrapbook.css`): `#FFF4D6` warm dotted paper, `#FFFDF7` cream cards, `#29221E` ink outlines, 2px borders, hard offset shadows, coral `#FF9470`, sunflower `#FFD457`, teal `#72D8C5` stickers; fonts: Rubik, Permanent Marker, Caveat.
- Built on `@astryxdesign/core` + `@astryxdesign/theme-matcha` + `src/styles/scrapbook.css`.

---

## 11. Broken, Missing, or Duplicated Functions
1. **Duplicated legacy codebase:** `assets/js/` (`app.js`, `api.js`, `rules.js`, `entry-queue.js`, `habit-form.js`, `state-sync.js`, `statistics.js`, `entry-affordances.js`) duplicates `src/lib/` modules and is still referenced in `package.json` `check` script.
2. **Dead CSS:** `src/styles/brand.css` (77.3 KB) remains in `src/styles/` despite `DESIGN.md:11` noting it is legacy and unloaded.
3. **Missing `node_modules` in workspace:** `npm run build` (`vite: not found`) and `scripts/test-today-statistics.mjs` (`Cannot find package 'react'`) fail until `npm install` / `npm ci` is run.

---

## 12. Performance & UX Issues
- **Polling overhead:** `src/App.jsx` runs two independent `setInterval` timers (30s `refreshInbox`, 60s `checkAndTriggerDailyReminder`) regardless of tab visibility.
- **Label inconsistency:** `MobileNav.jsx:10` labels the `habits` tab `'Rutinler'`, whereas `Sidebar.jsx:9` and `useNavigation.js:21` label it `'Alışkanlıklar'`.
- **Design mismatch with target:** Current Scrapbook aesthetic (rounded/tilted tabs, offset shadows, confetti, playful fonts) conflicts with the target **Disciplined Brutalism** (`0px` radius, `#0E0E0E` / `#C8FF2E`, no shadows/confetti).

---

## 13. Preserved vs. Replaceable Boundary

| Layer | Status | Scope |
|---|---|---|
| **Backend API & Middleware** | **PRESERVED** | `functions/api/[[path]].js`, `functions/_middleware.js`, `functions/lib/*` |
| **Database & Migrations** | **PRESERVED** | `migrations/0001_initial.sql` – `0006_web_push.sql`, `wrangler.toml` |
| **Web Push Worker** | **PRESERVED** | `workers/push-dispatcher.js`, `wrangler.push.toml` |
| **Domain Logic** | **PRESERVED** | `src/lib/*` (auth, rules, OCC entry-queue, guest-store, statistics, backup, notifications) |
| **UI & Design System** | **REPLACEABLE** | `src/styles/scrapbook.css`, `src/styles/brand.css`, `src/components/*`, `canvas-confetti`, `@astryxdesign/*` |
| **Legacy Vanilla JS** | **REMOVABLE** | `assets/js/*` (once `package.json` `check` script is updated) |

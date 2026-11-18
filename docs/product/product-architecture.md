# PACE — Product Architecture

**Document Status:** M1 Deliverable  
**Design Philosophy:** Disciplined Brutalism (Swiss / International Typographic Style × Refined Brutalist Structure)  
**Target Platform:** React 19 + Vite 8 PWA on Cloudflare Pages + Cloudflare D1 (SQLite)

---

## 1. Product Vision & UX Philosophy

PACE is a Turkish-language, offline-capable habit & group accountability PWA designed around **minimal-friction daily execution**.

### Disciplined Brutalism Principles
- **Zero-noise execution:** Eliminate decorative elements (rounded corners, shadows, gradients, confetti, playful stickers) in favor of sharp `0px` rectangular surfaces, `1px` hairline borders, `2px` major dividers, and strict `4px` grid alignment.
- **High-contrast dark-first palette:** `#0E0E0E` background, `#F2F0EA` primary text, `#171717` / `#202020` surfaces, `#373737` borders, and a single signal color (`#C8FF2E` Acid Green) reserved strictly for streak numbers, completed states, primary actions, and current user highlights.
- **Typographic hierarchy:** Space Grotesk / Inter Tight for headings; JetBrains Mono for numerical values, dates, uppercase status labels, and tabular data.
- **State clarity without color-only reliance:** Every state (done, skipped, paused, error, offline, syncing) is communicated via text/monospace label + icon + border/surface contrast.

---

## 2. Preserved Backend & Domain Contracts

The UI layer (`src/components/*`, `src/styles/*`) is reconstructed from scratch, while all working backend systems, database schemas, and client domain logic are **strictly preserved**:

### 2.1 Backend & Infrastructure (`functions/`, `migrations/`, `workers/`)
| Layer | Preserved Files | Responsibility |
|---|---|---|
| **API Gateway** | `functions/api/[[path]].js` | REST JSON API (`/api/*`): auth, habits, versioned rules, OCC check-ins, groups, invites, reactions, social inbox, gamification, Web Push, export/import |
| **Security Middleware** | `functions/_middleware.js` | Strict CSP (`default-src 'self'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `COOP`/`CORP: same-origin`, HSTS |
| **Auth & Crypto** | `functions/lib/auth.js`, `functions/lib/password.js` | `__Host-pace_session` HttpOnly/Secure/SameSite=Lax cookie (30d), Bearer token support, `requireSameOrigin` CSRF check, 8–128 char password hashing, IP/email rate limiting, one-time recovery codes |
| **Web Push** | `functions/lib/webpush.js`, `workers/push-dispatcher.js` | VAPID Web Push subscription management and scheduled reminder dispatch |
| **Database (D1)** | `migrations/0001`–`0006` | 17 tables/alterations: `users`, `login_codes`, `sessions`, `rate_limits`, `habits`, `habit_versions`, `checkins` (with `deleted` tombstones), `credentials`, `groups`, `group_members`, `group_invites`, `group_habits`, `group_checkins`, `group_reactions`, `user_gamification`, `push_subscriptions` |

### 2.2 Client Domain Logic (`src/lib/*`)
| Module | Responsibility |
|---|---|
| `src/lib/api.js` | HTTP client + `validateResponse` schema/contract guard |
| `src/lib/rules.js` | Habit rule evaluation (`check` vs `quantity`, `at_least` vs `at_most`, effective-dated `habit_versions`, schedule/frequency) |
| `src/lib/statistics.js` | Streak calculation, completion rates, calendar/history aggregation |
| `src/lib/local-date.js` & `src/lib/date.js` | Timezone-safe local day boundaries (`YYYY-MM-DD`) |
| `src/lib/entry-queue.js` | Optimistic Concurrency Control (OCC) check-in queue with offline buffering & retry |
| `src/lib/state-sync.js` & `src/lib/account-sync.js` | Cloud sync state machine & guest-to-cloud migration (`migrateGuestToCloud`) |
| `src/lib/guest-store.js` | Local-first persistence for Guest & Demo modes |
| `src/lib/habit-form.js` & `src/lib/numeric-entry.js` | Form validation, Turkish decimal normalization, unit/target parsing |
| `src/lib/backup.js` | JSON export/import |
| `src/lib/notifications.js` | Daily reminder scheduling, app badge updates (`updateAppBadge`), Web Push registration |

---

## 3. Core Domain Modules

1. **Identity & Session Module:** Supports three seamless operating modes:
   - **Guest Mode** (`guest-store.js`): Zero-friction local usage with no account required.
   - **Demo Mode** (`?demo=1` / `api.startDemo()`): Pre-populated sandbox for evaluation.
   - **Authenticated Cloud Mode**: Password + recovery code auth with automatic `migrateGuestToCloud` on sign-up/login.
2. **Habit & Rule Engine:** Supports binary (`check`) and quantitative (`quantity` with `at_least` / `at_most` direction, unit, target) habits. Rule edits create effective-dated `habit_versions` so historical streaks remain accurate.
3. **Check-in & OCC Sync Engine:** 1-tap toggle for binary habits; inline/compact numeric stepper for quantity habits. All writes flow through `entry-queue.js` with tombstone support (`deleted = 1`) and offline resilience.
4. **Group Accountability Module:** Owner/member roles, shared `group_habits`, isolated `group_checkins` with OCC, group completion matrix, link/email invites (7-day expiry), ownership transfer, kick/leave, and `group_reactions` + `social/inbox`.
5. **Progress & Statistics Module:** Streak counters, completion percentages, calendar heatmap/grid, and per-habit breakdown computed from `statistics.js`.
6. **Notification & Backup Module:** Local daily reminder polling, Web Push (`push_subscriptions`), and full JSON export/import (`backup.js`).

---

## 4. Information Architecture (5 Primary Views + Discover)

Hash-based routing (`useNavigation.js`) with unified Turkish labels across `Sidebar` (desktop) and `MobileNav` (mobile):

| Route | Unified Label | Purpose & Key Content |
|---|---|---|
| `#today` | **Bugün** (Today) | Primary execution surface. Hero completion summary, today's due habits list, 1-tap check-in / inline quantity entry, active streak signal (`#C8FF2E`). |
| `#habits` | **Alışkanlıklar** (Habits) | Full habit inventory. Create/edit (`HabitModal`), pause/archive/restore lifecycle, versioned rule metadata. *(Fixes legacy `MobileNav` "Rutinler" vs `Sidebar` "Alışkanlıklar" mismatch.)* |
| `#progress` | **İlerleme** (Progress) | Analytics & history. Overall completion rate, current/best streaks, calendar matrix, per-habit performance table. |
| `#groups` | **Gruplar** (Groups) | Social accountability. Group list, shared habit check-ins, member completion matrix, link/email invite modal, reactions & social inbox. |
| `#settings` | **Ayarlar** (Settings) | Account, security (password, recovery code), notification/Web Push preferences, JSON backup export/import, theme toggle (Dark primary / Light inverted). |
| `#discover` | **Keşfet** (Discover) | *Secondary / Feature-flagged (`discover_rhythm_trials`).* Curated habit presets (`discoverCatalog.js`) for 1-tap adoption; accessible from Habits/Today empty states or secondary nav. |

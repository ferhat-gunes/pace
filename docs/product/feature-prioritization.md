# PACE — Feature Prioritization (P0–P3)

**Document Status:** M1 Deliverable  
**Guiding Principle:** Minimize user friction and cognitive load. Every feature is evaluated on whether it reduces steps to daily check-in, preserves data integrity, or adds genuine accountability without visual or procedural clutter.

---

## Priority Definitions

| Tier | Definition |
|---|---|
| **P0 — Core MVP / Must-Have** | Essential for the app to function, persist data, and complete the core daily habit loop. |
| **P1 — High-Value Daily UX & Social** | High-impact features that directly improve daily retention, analytics clarity, and group accountability. |
| **P2 — Nice-to-Have / Engagement & Discover** | Valuable enhancements (reactions, presets, light mode) that enrich experience without blocking core workflows. |
| **P3 — Future / Deferred** | Low-ROI, high-complexity, or out-of-scope features deferred to keep the product focused and minimal. |

---

## Feature Matrix

### P0 — Core MVP / Must-Have
| Feature | Rationale for Minimal-Friction UX | Preserved Contract |
|---|---|---|
| **1-Tap Daily Check-in (`TodayView`)** | Primary job-to-be-done; zero modal overhead for binary habits, inline/compact entry for quantity habits. | `entry-queue.js`, `checkins` (OCC) |
| **Guest & Demo Mode** | Zero-signup onboarding; users experience value immediately before committing to an account. | `guest-store.js`, `api.startDemo()` |
| **Authentication & Cloud Sync** | Password + recovery code auth with automatic `migrateGuestToCloud` so no local progress is lost. | `functions/lib/auth.js`, `account-sync.js` |
| **Habit CRUD & Versioned Rules** | Create/edit `check` or `quantity` (`at_least`/`at_most`) habits without corrupting historical streaks. | `HabitModal`, `rules.js`, `habit_versions` |
| **Offline Queue & Tombstones** | Resilient check-ins offline or on flaky mobile networks; explicit sync status indicator. | `entry-queue.js`, `0003_checkin_tombstones.sql` |
| **Unified 5-Tab Navigation** | Consistent labels (`Bugün`, `Alışkanlıklar`, `İlerleme`, `Gruplar`, `Ayarlar`) across Desktop Sidebar & MobileNav. | `useNavigation.js` |

### P1 — High-Value Social & Stats
| Feature | Rationale for Minimal-Friction UX | Preserved Contract |
|---|---|---|
| **Habit Lifecycle (Pause / Archive / Restore)** | Prevents guilt and streak-breaking during breaks without deleting historical data. | `HabitsView.jsx`, `habits` |
| **Progress & Streak Analytics (`ProgressView`)** | Clear monospace metrics (current streak, best streak, completion %) and calendar grid for self-reflection. | `statistics.js` |
| **Groups & Shared Habits (`GroupsView`)** | Core social accountability: create group, add shared habits, log isolated `group_checkins`, view member matrix. | `0004_groups_and_social.sql`, `GroupSocialPanel` |
| **Link & Email Group Invites** | 1-tap shareable invite link (`?join=` / `?invite=`) with preview & accept/decline flow. | `group_invites`, `getInvitePreview` |
| **Account Security & JSON Backup** | Password change, recovery code regeneration, and full JSON export/import for data portability. | `AccountSecuritySettings`, `backup.js` |
| **Daily Reminders & Web Push** | Timely opt-in nudges via VAPID Web Push and local reminder scheduling. | `notifications.js`, `workers/push-dispatcher.js` |

### P2 — Nice-to-Have / Gamification & Discover
| Feature | Rationale for Minimal-Friction UX | Preserved Contract |
|---|---|---|
| **Group Reactions & Social Inbox** | Lightweight encouragement (`group_reactions`) and unread inbox badge without full chat noise. | `0005_social_reactions_and_gamification.sql`, `social/inbox` |
| **Discover Presets (`DiscoverView`)** | Feature-flagged (`discover_rhythm_trials`) curated templates for users who want 1-tap inspiration. | `discoverCatalog.js` |
| **Disciplined Gamification (XP / All-Done Bonus)** | Subtle monospace XP/level tracking without playful confetti, cartoons, or intrusive popups. | `useGamification.js`, `user_gamification` |
| **Inverted Light Mode** | High-contrast `#F2F0EA` / `#0E0E0E` inverted theme for daylight readability. | `src/styles/` tokens |

### P3 — Future / Deferred
| Feature | Rationale for Deferral |
|---|---|
| **Full Real-Time Group Chat** | High moderation/UI complexity; reactions + shared completion matrix already cover accountability. |
| **Native iOS/Android App Store Wrappers** | PWA + Web Push + manifest already deliver installable mobile experience. |
| **Third-Party Health/Wearable Integrations** | Requires external OAuth/API maintenance; manual 1-tap check-in is faster and more intentional. |
| **Public Leaderboards / Global Feeds** | Conflicts with focused, private group accountability and Disciplined Brutalism calm. |

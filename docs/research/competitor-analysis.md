# Competitor Analysis — PACE

**Analysis Date:** 2026-11-18  
**Methodology:** Evidence-based clean-room analysis using verified public indexing and App Store / Google Play metadata (`explorer_survey_2/handoff.md`). Because direct HTTP/DNS resolution is blocked in this sandboxed environment, unverified internal/authenticated behaviors are explicitly marked `Doğrulanamadı` rather than fabricated.

---

## 1. Competitor Platforms & Accessibility

| Competitor | URL / Store Listing | Verified Platforms |
|---|---|---|
| **HabitAlong** | `https://habitalong.com/` | Web + Android (iOS `Doğrulanamadı`) |
| **Daily Pact** | `https://daily-pact.com/`, App Store `id6759385724`, Play Store `com.challenges.app` | iOS/iPadOS + Android + Web |
| **Circle — Habit & Goal Tracker** | App Store `id6818518969` (KLADOS DONA MAXENCE AKODJENOU) | iOS (iPhone only) |
| **Habit Huddle** | `https://habithuddle.com/`, `https://habithuddle.com/app/` | Web + Mobile apps (referenced in ToS) |

---

## 2. Feature Comparison Matrix

| Özellik | HabitAlong | Daily Pact | Circle | Habit Huddle | PACE |
|---|---|---|---|---|---|
| Onboarding | Doğrulanamadı | Doğrulanamadı | Doğrulanamadı | Doğrulanamadı | Mevcut (Guest/Demo + OnboardingStarter) |
| Habit tracking | Mevcut | Mevcut | Mevcut | Mevcut | Mevcut (check & quantity, versioned rules) |
| Groups | Mevcut | Mevcut | Mevcut | Mevcut | Mevcut (owner/member, shared habits) |
| Invitations | Mevcut | Mevcut | Doğrulanamadı | Mevcut | Mevcut (7-day link & email invites) |
| Activity feed | Doğrulanamadı | Doğrulanamadı | Doğrulanamadı | Doğrulanamadı | Mevcut (social inbox + reactions) |
| Progress | Mevcut | Mevcut | Mevcut | Mevcut | Mevcut (TodayView, group matrix) |
| Statistics | Doğrulanamadı | Doğrulanamadı | Doğrulanamadı | Doğrulanamadı | Mevcut (ProgressView, streaks, rates) |
| Reminders | Doğrulanamadı | Doğrulanamadı | Doğrulanamadı | Doğrulanamadı | Mevcut (60s client polling + Web Push) |
| Privacy | Mevcut (ToS/Privacy) | Mevcut (Terms) | Doğrulanamadı | Mevcut (ToS/Privacy) | Mevcut (CSP, SameOrigin, isolated group check-ins) |

---

## 3. Individual Competitor Profiles (Strengths, Weaknesses & Transferable Ideas)

### 3.1 HabitAlong (`https://habitalong.com/`)
- **Top 5 Strengths (Verified):**
  1. Cross-platform Web + Android availability.
  2. Positioned explicitly as a social/accountability alternative (`habitalong.com/habitshare-alternative`).
  3. Group-based habit accountability.
  4. Direct invite/sharing mechanisms.
  5. Dedicated web landing and onboarding funnel.
- **Weaknesses / Gaps:**
  - iOS availability could not be verified in public search snippets.
  - Detailed internal UX, streak edge-case handling, and statistics depth are `Doğrulanamadı` without live HTTP/APK access.
- **Transferable Functional Ideas for PACE:**
  - Clear, friction-free group accountability positioning on the landing/onboarding flow.

### 3.2 Daily Pact (`https://daily-pact.com/`)
- **Top 5 Strengths (Verified):**
  1. Full tri-platform coverage (iOS/iPadOS, Android, Web).
  2. Dedicated `/features` and `/groups` product architecture.
  3. Challenge/pact framing that reinforces daily commitment.
  4. Clear pricing and terms transparency (`/pricing`, `/terms`).
  5. Group-based daily check-in model.
- **Weaknesses / Gaps:**
  - Internal check-in latency, offline support, and streak recovery rules are `Doğrulanamadı`.
- **Transferable Functional Ideas for PACE:**
  - Framing shared group habits as concrete daily "pacts" with clear daily completion visibility.

### 3.3 Circle — Habit & Goal Tracker (App Store `id6818518969`)
- **Top 5 Strengths (Verified):**
  1. Focused iPhone-native experience.
  2. Combines both habits and goals in a single tracker.
  3. Free entry tier lowering adoption friction.
  4. Group/circle-based social structure.
  5. Clear App Store distribution.
- **Weaknesses / Gaps:**
  - Strictly iOS/iPhone-only (excludes Android and Web users).
  - Detailed internal social feed, reminders, and privacy controls are `Doğrulanamadı`.
- **Transferable Functional Ideas for PACE:**
  - Unified habit + goal framing without requiring separate navigation silos.

### 3.4 Habit Huddle (`https://habithuddle.com/`)
- **Top 5 Strengths (Verified):**
  1. Direct web app access (`habithuddle.com/app/`).
  2. Low-friction OAuth sign-in (Google / Discord).
  3. Public changelog (`/whats-new`) signaling active iteration.
  4. Mobile app companion support referenced in ToS.
  5. Group/huddle-centric accountability model.
- **Weaknesses / Gaps:**
  - Internal habit data model, offline queue, and statistics depth are `Doğrulanamadı`.
- **Transferable Functional Ideas for PACE:**
  - Fast, minimal-step authentication/onboarding and clear group huddle status visibility.

# Final critique 04/20 — Keyboard, semantics and motion

Date: 16 November 2026. Source reviewed: `useDialogAccessibility`, `useNavigation`, Auth/Habit/Today/Progress/Groups and navigation components. Source files were not changed by this reviewer.

**Code acceptance: PASS for the reviewed criteria. Hardware assistive-technology certification: UNVERIFIED.** No reproducible P0/P1 accessibility blocker remained in the checked paths.

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Dialog keyboard focus stays inside; outside content cannot be operated | PASS | Actual Chromium: 20 alternating Tab/Shift+Tab transitions stayed in the habit dialog; mobile navigation was inert and body scrolling locked. |
| Closing dialog restores background interaction | PASS | Actual Chromium: Escape closed an unmodified habit form and removed navigation inert state; source restores the initiating control. |
| Cold/lazy route navigation moves focus to the displayed heading | PASS | Actual Chromium: Groups, Progress, Settings and Today each received h1 focus after the view became available. MutationObserver handles deferred lazy rendering. |
| Reduced-motion preference suppresses canvas celebration | PASS | Actual Chromium with `reducedMotion: reduce`: direct `triggerConfetti` invocation created zero canvas nodes. |
| Filter/choice semantics are complete or intentionally simple | PASS | Today/Progress/Auth/Habit filters use named `group` with pressed buttons. Group navigation has tablist/tab, selected-only tabIndex, aria-controls and labelled tabpanel. |
| Recovery result receives focus and is announced without losing its one-time code | PASS | `PACE_BASE_URL=http://localhost:5173 node scripts/test-auth-theme-e2e.mjs` passed recovery focus, retention, copy error and explicit confirmation scenarios. |
| Password guidance and controls are persistent and related | PASS | Same browser suite passed 10–128 requirements, new-password autocomplete, show/hide and pending locks; source associates description/error IDs. |
| Loading/copy/error feedback is exposed | PASS, reviewed paths | Atomic status/alert output present for Auth, entry feedback, group loading/copy and top-bar state. Existing automated matrix is a separate broader contrast/structure check. |

## Evidence commands

- Local Chromium check `/tmp/pace-review04.mjs`: lazy focus, dialog trap/inert restoration, reduced-motion canvas suppression; no page errors.
- `PACE_BASE_URL=http://localhost:5173 node scripts/test-auth-theme-e2e.mjs`: PASS.

## Remaining evidence limits

Actual NVDA, VoiceOver and TalkBack sessions, switch control, browser speech output, device keyboard/zoom and all OS combinations were not available to this reviewer. Automated or source-level success must not be represented as universal accessibility compliance or an objective 10/10. No further source change is requested solely to conceal that evidence limit.

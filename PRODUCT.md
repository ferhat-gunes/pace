# PACE product

PACE is a Turkish mobile-first habit tracker and PWA built around calm personal routines, measurable quantities, and gentle small-group accountability.

## Core flows

- **Value-first Today screen**: Opens directly into Today (`Bugün`). First-time guests see a 30-second starter routine picker (`OnboardingStarter`) and can immediately track habits locally without an auth wall; signing in seamlessly migrates local habits and check-ins to D1.
- **Check, quantity & limit rules**: Binary routines complete in one tap; quantity routines support quick steppers (`-1`/`+1`, `+5`/`+15`/`+30`) and direct decimal/numeric entry; `at_most` limits warn smoothly when exceeded; `weekly_quota` tracks "Haftada X Gün" progress cleanly.
- **Pause, archive, comeback**: Pause, archive, and restore retain versioned historical settings. Edits apply from today forward. Returning after 4+ days shows a judgment-free Comeback banner.
- **Small-group accountability (`Gruplar`)**: Friends can create small groups, share native invite links (`/?join=...`), log 1-tap group check-ins, track the current Mon–Sun matrix on responsive mobile cards, exchange rate-limited cheers/nudges (`group_reactions`), and export a weekly PNG summary card.
- **Notifications & Web Push**: Supports daily reminder scheduling, Quiet Hours (`Sessiz Saatler`), social notification toggles, and RFC 8291/8292 Web Push delivery (`push_subscriptions` + companion dispatcher worker).

## Persistence & reliability

- Authenticated account state (`habits`, `checkins`, `groups`, `user_gamification`, `group_reactions`, `push_subscriptions`) persists in Cloudflare D1 with conflict checks (`revision`) and idempotency keys.
- Offline and guest actions remain functional via local storage (`pace_local_drafts` / offline mutation queue), and `?demo=1` provides a full offline sandbox.

# PACE product

PACE is a Turkish habit tracker for ordinary daily routines, quantities and time. Its primary task is recording today’s progress quickly, with account-backed persistence and no motivational dashboard clutter.

## Core flows

- Today is the default screen; planned routines and their entry controls share a row.
- A check habit takes one tap. Quantities save automatically. Minute units show one directly editable total with contextual quick increments or exact completion.
- New habits default to daily check tracking. Name is the only required user-entered field. Quantity, repeat schedule and advanced rules are optional decisions.
- Weekly quotas count completed days, not repeated sessions in one day. Per-day amount remains separate from week completion.
- The title opens a date chooser for history; the week strip handles nearby days. Future dates are unavailable. A Planlı / Tümü filter names the displayed scope.
- Pause, archive and restore retain historical settings. Edits apply from today.
- Errors remain next to the affected entry. Pending values stay visible; retry and undo are explicit. Account data is held in D1. The demo uses browser storage.

## Boundaries

The product is mobile first and a PWA. It has no social feed, streak pressure, coaching paragraphs or compulsory goal escalation. Carryover and increasing targets are off by default. Offline account writes remain pending until explicitly retried; the application does not imply that an unconfirmed save reached the server.

## Lifetime statistics

Today contains recording actions only; edit routines in Habits. Progress defaults to all time, with last30/7 days filters. Quantities show total, average per recorded date (explicit zero included), best daily amount, recorded dates and last entry. Historical units remain separate; archived habits remain in reports. Missing dates are not fabricated as zero. Check habits show completed and recorded days.

## Exact completion and daily layout

Daily habit cards share one coherent recording layout. Minutes pair the editable actual with the goal in the header; other quantities use an integrated stepper with their goal caption. Quantities have a slim progress track; binary habits have none. The smallest increment becomes Tamamla when a minimum target is within one ordinary step (5 minutes or1 unit), saving the exact target. Maximum targets never receive this shortcut. Zero cannot be decremented. Save feedback does not shift the list.

## Session startup

Initial HTML exposes only a neutral branded startup surface. A confirmed session enters Today; only401 opens login. Network/server/timeout/invalid-session responses retain startup and offer retry. An unavailable sessionStorage does not prevent regular account startup. Demo bypasses session validation. Reload guidance and a no-JavaScript fallback remain available when application code cannot load.

## Approved visual direction

The owner explicitly selected a calm premium mobile application. The current system uses self-hosted Manrope, cool neutral ground, cohesive white habit surfaces and orange actions. Saved undo uses a short global notification; error recovery remains local and persistent.

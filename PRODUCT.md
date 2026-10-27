# PACE product

PACE is a Turkish habit tracker for ordinary daily routines, quantities and time. Its primary task is recording today’s progress quickly, with account-backed persistence and no motivational dashboard clutter.

## Core flows

- Today is the default screen; planned routines and their entry controls share a row.
- A check habit takes one tap. Quantities save automatically. Minute units expose +5, +15 and +30 and a directly editable total.
- New habits default to daily check tracking. Name is the only required user-entered field. Quantity, repeat schedule and advanced rules are optional decisions.
- Weekly quotas count completed days, not repeated sessions in one day. Per-day amount remains separate from week completion.
- A date field and week strip support correcting history; future dates are unavailable.
- Pause, archive and restore retain historical settings. Edits apply from today.
- Errors remain next to the affected entry. Pending values stay visible; retry and undo are explicit. Account data is held in D1. The demo uses browser storage.

## Boundaries

The product is mobile first and a PWA. It has no social feed, streak pressure, coaching paragraphs or compulsory goal escalation. Carryover and increasing targets are off by default. Offline account writes remain pending until explicitly retried; the application does not imply that an unconfirmed save reached the server.

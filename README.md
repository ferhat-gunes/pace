# PACE

**PACE** is a calm, mobile-first habit tracker. Build several routines, choose the days that fit your life, and keep progress tied to your account across devices.

> The current first release is being prepared. It supports daily habits, selected weekdays, weekly quotas, check-in or quantity tracking, optional increasing targets, and optional carryover for unfinished minimum targets.

## What it does

- Track multiple habits with either a one-tap check-in or a numeric amount and unit.
- Choose every day, selected weekdays, or a number of sessions per week.
- Use fixed goals or increase numeric goals by a chosen step.
- Optionally carry an unfinished minimum goal to the next planned period.
- Keep account data in Cloudflare D1 and sign in with a one-time code sent by email.
- Install the website as a PWA; the app shell can open offline, while cloud saves clearly require a connection.
- Export your account data as JSON.

PACE uses supportive, neutral status labels. Unscheduled days do not count as missed days.

## Run the demo

The demo is intentionally local to the current browser and marked **Örnek görünüm**. It is not account-backed and should not be used for important records.

Open the deployed site with `?demo=1`, or run a static server from the repository root and visit `/?demo=1`.

## Cloudflare Pages setup

1. Create a Cloudflare Pages project from this GitHub repository.
2. Create a D1 database named `pace` and apply `migrations/0001_initial.sql`.
3. Bind that database to the Pages project using the binding name `DB`.
4. In Pages **Settings → Variables and Secrets**, configure:
   - `AUTH_SECRET`: a long, random secret used to protect one-time login codes.
   - `RESEND_API_KEY`: the key for sending account sign-in codes.
   - `EMAIL_FROM`: a sender address verified with your email service, for example `PACE <login@example.com>`.
5. Set the D1 database ID in `wrangler.toml` if using Wrangler for deployment or migration commands.
6. Deploy over HTTPS. Keep all secrets in Cloudflare; never put real credentials in this repository.

The login code is valid for 10 minutes. Sessions are stored as hashed tokens and expire after 30 days. Every data request is scoped on the server to the signed-in account. The email address is sent to the configured email delivery provider to deliver sign-in codes.

### Local Pages preview

Use Wrangler with a local D1 database and a local `.dev.vars` file. Copy `.dev.vars.example` to `.dev.vars`, fill it with development-only values, and do not commit the copied file. For local email testing, configure a provider sender that is allowed by your email account.

## Repository layout

- `index.html`, `assets/`: PACE interface and PWA assets.
- `functions/api/`: authenticated Pages API.
- `functions/lib/`: session, response, and request helpers.
- `migrations/`: D1 schema migrations.
- `design-system/pace/MASTER.md`: interface tokens and interaction rules.

## Security and privacy

Please report security concerns privately using GitHub's **Security → Advisories** flow. Do not open a public issue containing account data, credentials, or exploitable details. See [SECURITY.md](SECURITY.md).

## License

The repository is public. A reuse license has not yet been selected; until one is added, no additional reuse rights are granted. Choose a license before inviting external contributions or describing this as open-source software.

## Language

The product interface is currently Turkish. The code and setup notes are intended to remain approachable to contributors; translations can be added without changing the habit model.

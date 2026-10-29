# watchudoin?

A private photo-sharing app for staying close to your people. Your last 30 days together: share a Moment with selected connections or circles, react, comment, or send a Nudge. Moments leave active views after 24 hours; stored photos are permanently deleted after 30 days.

## Features

- Email sign-up, confirmation, sign-in, and session management.
- Connection requests and invitations.
- Camera capture, photo-library selection, captions, and recipient selection.
- Moments, emoji reactions, Nudges, and activity history.
- Realtime updates and push-notification preferences.
- Profile editing, blocking, reporting, and account deletion.
- Outcome-based first steps: find one person, send or receive a first Moment, then add an Android widget.
- Photo widgets in Small (2 × 2), Medium (4 × 2), and Large (4 × 3), with quick reactions, Nudges, and camera replies. See [widget details](docs/WIDGET_STYLES.md).
- Eight optional contextual statuses and quiet deletion reminders only during a photo's final 48 hours.

## Stack

Expo SDK 57, React Native 0.86, React 19.2, TypeScript, and Expo Router. Supabase provides authentication, database, private photo storage, realtime updates, and Edge Functions.

## Local development

Use Node.js 22.13 or later and npm.

```sh
npm ci
```

Copy `.env.example` to `.env` and configure the public client values for the intended backend. On PowerShell:

```powershell
Copy-Item .env.example .env
```

See [environment configuration](docs/ENVIRONMENTS.md) for the variables and build profiles. Public client variables are included in the app bundle; server credentials belong in the backend's secret configuration. `.env` is excluded from Git.

```sh
npm start
npm run android
npm run ios
npm run web
```

Native development builds are needed to test native integrations such as remote push notifications. iOS simulator development requires macOS. EAS development, preview, and production profiles are defined in `eas.json`; link an Expo project before using cloud builds.

## Project layout

| Path | Purpose |
| --- | --- |
| `app/` | Expo Router onboarding, tabs, and flow screens |
| `src/` | Shared components, themes, models, state, and feature services |
| `assets/` | Branding, icons, and splash assets |
| `supabase/migrations/` | Included database migration history |
| `supabase/functions/` | Push delivery, account deletion, and expired-Moment cleanup |
| `docs/` | Environment, privacy, safety, and release documentation |
| `release-site/` | Account-deletion web page |

The included migrations represent the changes stored in this project. Verify the backend's existing schema and migration history before provisioning a fresh backend.

## Validation and release status

```sh
npm run typecheck
```

The app still requires physical-device testing and release configuration before production submission. Follow the [release checklist](docs/RELEASE_CHECKLIST.md) and consult the [implementation report](docs/PHASE_7_REPORT.md) for outstanding work. The Terms and Privacy Policy drafts also require review and verified contact details.

See [LICENSE](LICENSE) for licensing.

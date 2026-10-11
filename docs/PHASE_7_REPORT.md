# Phase 7 Implementation Report

Date: September 29, 2026

Status: implementation and automated validation complete; physical-device and release-operations gates remain. Do not mark the app production-ready yet.

## 1. Files created

- Safety/legal/account services: `src/features/account/accountService.ts`, `src/features/legal/legalService.ts`, `src/features/safety/safetyService.ts`.
- Models/infrastructure: `src/models/safety.ts`, `src/lib/environment.ts`, `src/lib/logger.ts`.
- Shared UI: `src/components/FlowHeader.tsx`, `src/components/MomentPhoto.tsx`.
- Routes: `privacy-account.tsx`, `terms.tsx`, `privacy-policy.tsx`, `delete-account.tsx`, `blocked-users.tsx`, `edit-profile.tsx`, `report.tsx`, `report-problem.tsx`, and `person/[id].tsx` under `app/(flows)`.
- Release assets: `app.config.ts`, `release-site/delete-account.html`, and the documents under `docs/`.
- Backend: seven Phase 7 migrations plus `delete-account` and `cleanup-expired-moments` Edge Functions.

## 2. Files modified

- Navigation/profile/moment UI: `app/(tabs)/you.tsx`, `people.tsx`, `moments.tsx`, `activity.tsx`, `camera.tsx`; `app/(flows)/preview.tsx`, `moment/[id].tsx`, `catch-up.tsx`; onboarding Nudge copy.
- State/data: `src/state/appStore.tsx`, profile/activity/update/auth services and queries, database types, model/component exports.
- UI primitives: ActionButton, SettingRow, Recipient, StatusChip, ReactionBar, PasswordField, ActivityRow, colors.
- Native/release config: `app.json`, `eas.json`, `.env.example`, `package.json`, and lockfile.
- Backend push filtering: `supabase/functions/send-push-notification/index.ts`.

## 3. Database migrations

- `20260925133926_phase7_safety_privacy.sql`
- `20260929080958_harden_deleted_session_discovery.sql`
- `20260929082143_consolidate_update_read_policy.sql`
- `20260929082413_require_terms_for_interactions.sql`
- `20260929083207_idempotent_moment_creation.sql`
- `20260929083657_harden_profile_updates.sql`
- `20260929084010_visible_moments_keyset_page.sql`

All are applied to Supabase project `oqzstnarzfddgapyynff`, and local timestamps match remote migration history.

## 4. Edge Functions

- Added and deployed `delete-account` v1 with JWT verification.
- Added and deployed `cleanup-expired-moments` v1 with custom `x-cron-secret` authentication.
- Hardened and deployed `send-push-notification` v2; recipients are rechecked for blocks and accepted connections before service-role delivery.
- Unauthenticated calls to all three return HTTP 401.

## 5. Account deletion

The app requires typing `DELETE`. The Edge Function authenticates the caller, removes every object under their private storage folder first, aborts without deleting the account if photo cleanup fails, then deletes the Auth user. Profile-linked data cascades through connections, updates/recipients, reactions, Nudges, reads, notification records, invites, Terms, blocks, reports, and support requests. The client clears its local session only after server success.

## 6. Blocking and removal

Removal and blocking are distinct RPC-backed actions. Removal revokes historical Moment/photo access under the current privacy policy. Blocking removes the connection, conceals exact username discovery, rejects new connections/interactions server-side, emits Realtime refresh signals, and is independently enforced by push delivery. Unblocking does not restore a connection.

## 7. Reporting

Users can report a connected person or received Moment with a reason and optional detail, then optionally block. Reports and support requests are deny-by-default tables available only through restricted RPCs/service role and are excluded from Realtime and Activity.

## 8. Terms and Privacy

Current Terms version is `2026-09-25`; acceptance time/version is stored server-side. Moment creation, Nudges, and reactions require current acceptance. In-app Terms and Privacy screens plus external drafts are present. Legal entity, minimum age, jurisdiction, and verified contacts still require product/legal decisions.

## 9. Storage cleanup

Moments expire from active views after 24 hours. The deployed cleanup worker deletes photo objects and database rows 30 days after `expires_at`, in batches of 100. It is intentionally inactive until `CLEANUP_CRON_SECRET` and a daily Supabase Cron request are configured. Account deletion separately removes all owner-folder objects immediately.

## 10. Security audit

- Anonymous RLS simulation returned zero profiles, connections, notification preferences, updates, and private storage objects; protected tables without anonymous grants reject reads.
- Authenticated unrelated-user simulation returned zero private updates; accepted participants retained expected access.
- Block/remove/report/Terms tests passed transactionally and were rolled back.
- Idempotency test returned two successful responses pointing to one update.
- Public mutation RPCs deny `anon`; authenticated access is explicitly granted.
- Repository scan found no service-role key, Expo token, Firebase private key, signing credential, mock account, localhost URL, or raw production console call.

## 11. Accessibility

Added roles, labels, selected/busy/disabled state, 44px minimum touch targets, camera descriptions, readable reaction labels, wrapping button/chip text, two-line recipient names, and increased secondary-text contrast from 4.49:1 to approximately 4.76:1 on the app background. TalkBack and large-font physical acceptance are still pending.

## 12. Performance and resilience

Moments and Activity now use `FlatList`/`SectionList`, bounded 30-item pages, and stable cursor ordering. Uploads remain resized/compressed. Requests time out after 20 seconds, drafts survive failures, send progress distinguishes preparation/upload/create, deterministic photo paths and request IDs make Moment retry idempotent, signed URLs retry once after image failure, and open Current Moments expire on schedule.

## 13. Environment and release configuration

Development/preview/production profiles are named, production validates the Supabase host against the expected project reference, Android package is `com.watchudoin.app`, version is `1.0.0`, versionCode is `1`, scheme/icons/adaptive icon/splash are configured, and SDK 57/React Native targets Android API 36. Runtime Android permissions are limited to camera plus notification/photo access supplied by their modules; microphone recording is removed.

## 14. TypeScript

`npm run typecheck`: passed.

## 15. Expo Doctor

`npx expo-doctor`: 21/21 checks passed.

## 16. Supabase advisors

Security has one actionable warning: leaked-password protection is disabled. Six informational no-policy notices are intentional deny-by-default RPC-only tables. Performance reports only unused indexes in this low-traffic database; the previous duplicate permissive update policy warning is resolved. Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## 17. A/B/C privacy result

Transactional database simulations for accepted A/B, unrelated C, removal, blocking, reports, private Storage, and anonymous access passed. Physical A/B/C Realtime, push, deep-link, and signed-photo testing remains mandatory and has not been represented as complete.

## 18. Play Store blockers

- Publish the deletion resource and Privacy Policy at stable HTTPS URLs with verified support/privacy contacts.
- Link the EAS project and set `EXPO_PUBLIC_EAS_PROJECT_ID`; authenticate EAS CLI.
- Configure cleanup secret/Cron and enable leaked-password protection.
- Complete legal review, minimum-age decision, content rating, Data Safety form, moderation ownership, and store listing.
- Resolve or formally accept the 14 moderate transitive npm advisories; npm currently offers only forced breaking Expo downgrades.
- Google Play currently requires new apps/updates to target API 36 from August 31, 2026; this SDK targets 36, but confirm again at submission.

## 19. Physical testing required

Run every item in `docs/RELEASE_CHECKLIST.md`, especially Phase 6 push/Realtime/cold-start flows, Account C isolation, block crafted-call behavior, disposable Account D deletion/storage inspection, network transitions, camera edge cases, TalkBack/large fonts, and lower/mid-range device performance.

## 20. Production build status

The final Android production Metro export passed and produced `dist/android`. EAS production configuration/build did not run because no Expo account token/login or EAS project ID is available. A signed AAB has not been produced or tested. The source is ready for a development-build testing round, not Play production submission.

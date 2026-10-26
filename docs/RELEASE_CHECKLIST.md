# Release Checklist

## Automated checks

- [ ] `npm run typecheck`
- [ ] `npx expo-doctor`
- [ ] `npx expo export --platform android --output-dir dist/android`
- [ ] `npx expo config --type introspect` confirms package, permissions, and target SDK
- [ ] Supabase security and performance advisors reviewed
- [ ] Unauthenticated Edge Function calls reject access
- [ ] Production environment contains only publishable client credentials

## Backend configuration

- [ ] Set a strong `CLEANUP_CRON_SECRET` Edge Function secret
- [ ] Schedule `cleanup-expired-moments` daily with the matching `x-cron-secret`
- [ ] Verify backup, restore, and incident-response ownership
- [ ] Enable Supabase leaked-password protection if available for the project plan
- [ ] Configure verified support and privacy contact details
- [ ] Link the Expo project and set `EXPO_PUBLIC_EAS_PROJECT_ID` in EAS environments

## Physical Android device matrix

- [ ] Fresh signup, email confirmation, sign-in, sign-out, and session restore
- [ ] Zero-connection entry and invite redemption between two real accounts
- [ ] Camera denial, permanent denial, background/foreground, flip, rapid taps, and retake
- [ ] Photo-library denial and large-photo compression/upload
- [ ] Moment send, recipient access, seen state, reaction, nudge, and expiry
- [ ] Connection removal immediately revokes history and authenticated photo-download access
- [ ] Blocking prevents search, requests, nudges, reactions, updates, and pushes
- [ ] Report person/moment and unblock behavior
- [ ] Push foreground, background, killed app, deep link, revoked access, and token refresh
- [ ] Offline launch, request timeout/failure, retry, and draft preservation
- [ ] Account deletion removes Auth user, database rows, and every storage object
- [ ] TalkBack traversal, labels, touch targets, large font, and keyboard behavior
- [ ] Small phone, large phone, slow device, and low-memory relaunch

## Play Console

- [ ] Target API requirement confirmed for submission date
- [ ] Store listing, screenshots, content rating, and UGC policy completed
- [ ] Privacy Policy URL published
- [ ] Public account-deletion URL published and tested
- [ ] Data Safety form matches `PLAY_STORE_DATA_SAFETY.md`
- [ ] Internal testing track passes before staged production rollout

# Email confirmation

The signup waiting screen is simplified: centered watchudoin? wordmark, rounded heading, a readable email card, resend cooldown and a Back to sign in link. “Almost there”, the @ circle and Open email app are removed. The page scrolls on smaller screens and supports both themes.

Android signup and resend requests use `https://watchudoin-auth.vercel.app/email-confirmed`. The HTTPS page gives users a real confirmed/error result on both computers and phones. After verification it displays “Account confirmed”, “You can close this now.” and “Reopen watchudoin? and sign in to continue.” There is no app-opening button or automatic navigation; the user closes the browser and reopens the app manually.

The static page is deployed to the Reveries Vercel team, project `watchudoin-auth` (`prj_ylLllSbVlAb1GvqksqFfVm4KpjvW`). Its source is in `auth-site`. It validates the access token with Supabase's `/auth/v1/user` endpoint and checks the confirmed email state before showing success. Tokens remain in memory, are removed from the address bar immediately, and are never written to browser storage. No analytics or third-party assets are loaded. Cache-Control is no-store, Referrer-Policy is no-referrer, and CSP restricts scripts, styles, fonts and network destinations.

Run `node scripts/build-auth-site.cjs` to generate the public configuration and local font before redeploying. `auth-site/config.js` is ignored by Git. It contains only the public Supabase URL and publishable key; admin/service-role credentials and environment files are never uploaded.

## Hosted configuration activation

The HTTPS page and Supabase URL settings are active, verified October 28, 2026:

- Site URL: `https://watchudoin-auth.vercel.app/email-confirmed`.
- Redirect URL: `https://watchudoin-auth.vercel.app/email-confirmed`.
- Replace the old `watchudoin://**` wildcard with an exact `watchudoin://reset-password` redirect. The app also accepts the three-slash native form if it is separately allowlisted. Preserve other existing URLs.
- Development redirects include the full callback paths: `http://localhost:8081/reset-password`, `http://localhost:8081/email-confirmed`, `http://localhost:3000/reset-password`, and `http://localhost:3000/email-confirmed`. Root-only localhost entries do not match those callbacks. The user saved the exact entries and all four were verified with invalid-token redirects on October 28.

Removing the old confirmation scheme from the allowlist lets old Android signup requests fall back to the HTTPS Site URL. This also avoids requiring an APK update for the emailed redirect fix. Direct Android callback handling remains supported in the app for existing deep links, while this browser page performs no handoff. Request a fresh email if a link was already consumed or has expired. No real user email was sent or verification token consumed during testing.

The user applied the live Site URL and allowlist after automatic approval review blocked native browser inspection when it could expose unrelated private content. Read-only configuration inspection confirmed the saved Site URL. Deliberately invalid-token requests verified that both old Android confirmation destinations and the new HTTPS destination return to the public result page. Android password recovery still redirects to `watchudoin://reset-password`. An untrusted external redirect falls back to the public page. All returned `otp_expired`, as expected for the invalid test tokens; no real link was consumed.

## First friend

A small emoji celebration appears on the first observed transition from no accepted friends to one accepted friend. Sixteen emojis burst inward from the left and right screen edges and arc upward like confetti. The centered “Yey, you made your first friend!” message has no box outline and stays fully visible for three seconds, with a short entrance and exit. Pending requests do not trigger it. It is stored locally per account, auto-dismisses, respects Reduce Motion (a static three-second message), does not block taps and does not replay on reopening or removing/re-adding friends. Existing users with friends or completed connection onboarding do not receive a false celebration.

## Verification

- TypeScript and all 187 tests passed. Tests cover desktop and Android confirmation without app navigation, URL cleanup, expired/incomplete/offline links, the new Android HTTPS email destination, and account-isolated first-friend tracking.
- Real-component email fixtures fit 320 px and 390 px in light and dark mode, including long email addresses and the resend cooldown. A static Reduce Motion celebration fixture was also reviewed.
- The public `/email-confirmed` route and all four referenced assets return HTTP 200. Security headers were checked. A live expired-link browser check displays the recovery screen and clears its URL fragment.
- No real signup email was sent, valid user link consumed, or background phone notification triggered by these checks.

These app changes are after APK 1.0.5. No new APK has been built.

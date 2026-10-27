# Password recovery

## Web and Android destinations

Web reset requests now use the current browser origin followed by `/reset-password`. Android requests continue to use `watchudoin://reset-password`. Signup confirmation and resend requests follow the same platform-aware routing.

The app accepts web callbacks only from its current origin and the two known auth routes. It restores the session from Supabase's access/refresh token callback, enters password recovery, and removes credentials from browser history after handling the link. Expired or incomplete links show an actionable error. Password entry still requires an authenticated recovery session.

Request a fresh email after reloading the updated web app. Emails sent before this fix retain the old Android redirect; they cannot be rewritten. A link requested from Android should be opened on the phone with the app installed.

## Hosted Supabase checks

Verified October 27, 2026:

- The existing email contains a Reset password link pointing to Supabase's HTTPS verification endpoint. Auth logs confirm recovery email delivery and verification.
- The project currently has a localhost Site URL and an allowed `watchudoin://**` redirect.
- Deliberately invalid-token checks redirected to the requested localhost ports 8081 and 3000 reset pages. An untrusted external host was rejected and fell back to the Site URL. No email was sent and no real reset token was consumed by these checks.
- Add exact production web callback URLs when a public web domain is deployed.

## Branded recovery email

The ready-to-use template is [recovery.html](../supabase/templates/recovery.html). Suggested subject: `Reset your watchudoin? password`.

It uses the app's dark purple branding, a prominent reset button, a full copyable fallback link and one-time-link guidance. Both links use `{{ .ConfirmationURL }}` so that Supabase verifies the request before redirecting to the correct platform. No expiring image host or localhost image URL is required.

**Not activated on the hosted project:** the Dashboard currently disables template customization while the project uses Supabase's default SMTP service. No custom SMTP provider or sender domain has been configured. Once those are available, configure SMTP and paste this HTML into Authentication > Emails > Reset password. Disable provider link tracking, then send a fresh test email.

Official references: [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [Password recovery](https://supabase.com/docs/guides/auth/passwords), [Free-tier template policy](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).

Verification: TypeScript and all 140 regression tests passed, including platform-specific email destinations, trusted callback origins, session restoration, removal of callback credentials, expired/incomplete links, duplicate-submit guards and authenticated password entry. Android, iOS and web JavaScript exports passed; no APK was completed.

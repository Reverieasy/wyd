# Android release-mode APK 1.0.8

Built October 29, 2026. Package `com.watchudoin.app`, version code 9.

Artifact: `dist/watchudoin-1.0.8-release.apk` (86,199,136 bytes).

SHA-256: `C55A9D3105B6CBA6AEC02AAA3CBB35475B8BF86867640F93878A1E272C783527`.

## Signing

This is a non-debuggable release-mode APK signed with the existing local Android test key. Its certificate matches the earlier preview APKs, allowing an update over those installations. Public distribution requires production signing.

Certificate SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

## Included widget revision

- Small: 2 × 2, with camera reply.
- Medium: 4 × 2, with heart, Nudge and camera reply.
- Large: 4 × 3, with heart, Nudge and camera reply.
- Photo backgrounds, dark fades, responsive metadata/control layouts, selected-heart feedback and unread dots.
- Sparkle controls removed from every widget. Stale sparkle actions cannot send a reaction.
- Previous Portrait/Wide/Reactions providers removed. Remove the old home-screen widget and add a new size after updating.

## Verification

- TypeScript and all 186 automated tests passed.
- `:app:assembleRelease` completed for arm64-v8a and x86_64.
- Production app environment and backend project were selected explicitly; the configured backend and public publishable key passed validation before compilation.
- Packaged version, non-debuggable release flag, signature, embedded Expo config, file exclusions and APK alignment passed inspection.
- The compiled manifest registers only the three current widget providers, with exact 2 × 2, 4 × 2 and 4 × 3 target cells.
- Static layout previews passed image-loading and bounds checks. Physical launcher placement, native interactions and new-build startup remain for device testing.

Build log: `.expo/android-1.0.8-release-final.log`. Verification log: `.expo/apk-1.0.8-verification.log`. Artifact metadata: `dist/watchudoin-1.0.8-release.json`.

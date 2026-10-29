# Android release-mode APK 1.0.9

Built October 30, 2026. Package `com.watchudoin.app`, version code 10.

Artifact: `dist/watchudoin-1.0.9-release.apk` (86,199,656 bytes).

SHA-256: `64C7F3A92AF7FA025CDE029A75D0847E26A147FA7FC42092827BC00AEBAA7625`.

## Changes

- Comment composer is a fixed footer above the keyboard, with one scroll area for the photo and replies. Android keyboard avoidance is enabled; multiline drafts grow up to 120 dp.
- Startup logo, wordmark, tagline and progress indicator form one centered group with safe-area padding.
- Comment reply alerts use the deployed notification audience: photo owner plus earlier commenters, excluding the writer. Activity and foreground banners distinguish replies from comments on your own photo.
- Current photo-background widgets remain Small 2×2, Medium 4×2 and Large 4×3, without sparkle controls.

## Signing and verification

This non-debuggable release-mode APK uses the existing local test key, allowing updates over previous preview/release-mode APKs. Public distribution requires production signing.

Certificate SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

- TypeScript and all 193 Node tests passed before compilation.
- `:app:assembleRelease` completed in 15m 45s for arm64-v8a and x86_64, with 882 tasks (56 executed, 826 up-to-date).
- Production configuration validated; fresh JavaScript bundle compiled with the selected production environment.
- Package/version, embedded Expo config, non-debuggable status, signature, private-file exclusions, widget providers/dimensions and APK alignment passed verification.
- No physical-device or emulator runtime test was performed for this build. Keyboard positioning, startup presentation and foreground/background delivery still need phone testing.

Build log: `.expo/android-1.0.9-release.log`. Verification log: `.expo/apk-1.0.9-verification.log`. Artifact metadata: `dist/watchudoin-1.0.9-release.json`.

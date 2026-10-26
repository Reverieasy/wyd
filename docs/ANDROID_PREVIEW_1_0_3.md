# Android preview 1.0.3

Built October 26, 2026. Package com.watchudoin.app; version code 4. Source commit 1cc23a1.

- Both camera flip controls use the same guarded lens-switch action. The control beside the shutter no longer resets zoom and flash.
- Connection activity uses a centered check badge.
- Photo download controls sit at the top right of the photo in detail and full-photo views.
- The widget follows Dark, Light, or System appearance. System supplies native day/night variants; dark is the app default.
- Android background notifications are configured using the linked Expo project and Firebase FCM V1. The server uses the high-importance watchudoin-updates channel and high-priority delivery. Foreground photo, reaction, and comment popups continue in-app.

## Verification

- TypeScript check and all 108 automated tests passed.
- Android, iOS, and web source exports passed.
- Firebase service-account validation returned HTTP 200 using validate_only; no notification was delivered by that test.
- EAS confirmed the FCM V1 key is assigned to com.watchudoin.app. The Android client file is an EAS secret file variable in development, preview, and production.
- The Supabase worker is active; the push endpoint rejects unauthenticated calls with HTTP 401.
- APK embedded configuration contains the correct Expo project UUID and androidConfigured: true. Google Services processing succeeded.
- Android release build and APK signature verification passed. The preview uses the existing debug certificate, preserving compatibility with the previous local preview.
- The APK installed over 1.0.2 on the isolated Android 15 emulator. After dismissing an emulator System UI stall dialog, the repeat cold launch completed in 1.9 seconds and displayed the complete dark Get started screen. FirebaseInitProvider logged successful initialization, and the native AppWidgetHost received a rendered dark widget bitmap.
- Fixture screenshots show the top-right download control at 320px width and in dark mode.
- Source secret scan passed; .env and all .push files remain ignored.

Actual background phone delivery and the signed-in camera controls still need checking on a physical phone. After installation, allow Phone notifications in Settings. Send quietly must be off for photo alerts.

Artifact: dist/wyd-1.0.3-preview.apk (85,130,931 bytes). SHA-256: 6EFA95C54E4D1CBEC8B8C94A845FD17ED847362D5C004CBC10B135FDE3A45F1B. ABIs: arm64-v8a and x86_64.

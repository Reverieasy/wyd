# Android preview 1.0.5

Package `com.watchudoin.app`, version code 6.

Source update only. The APK build was stopped at the user's request; do not restart it until explicitly requested. No completed 1.0.5 APK was produced.

- Replaced the Expo grid splash asset with the existing purple W used by the app's BrandLogo.
- Added a one-time 300 ms logo pop followed by a 160 ms fade when startup is ready. Reduce Motion skips the animation. The native splash remains until the branded React overlay has laid out; loading does not reveal an empty screen.
- Replaced the old Expo chevron notification icon with a white, transparent W silhouette. The Android small icon is 96 × 96 and notification tint is the brand purple.
- Redesigned foreground photo, reaction and comment popups with a W tile, sender avatar, event badge and explicit dismiss control. Notification preference and account guards remain in effect.
- The notification permission prompt also uses the app logo.
- Web password recovery now returns to the browser's reset page instead of the Android scheme. Android deep links remain supported. The branded recovery email HTML is prepared; live activation requires custom SMTP. See [Password recovery](PASSWORD_RECOVERY.md).

`npm run assets:brand` regenerates native splash and notification assets from the established logo. Expo prebuild must run after regenerating native assets; an existing installed APK cannot acquire these resource changes through a JavaScript refresh.

## Verification

- TypeScript and all 140 tests passed. Coverage includes splash handoff timing, app readiness, Reduce Motion, animation cleanup, native icon format, web/native recovery redirects, callback trust and cleanup, and password-screen behavior.
- Android prebuild regenerated the splash and notification resources successfully.
- Dark fixture screenshots passed at 390 px; the notification layout also fits 320 px without horizontal overflow.
- Android, iOS and web JavaScript exports passed after the recovery changes. These exports do not build an APK.

Release installation and actual background phone notification delivery remain pending. APK builds are held until the user requests one.

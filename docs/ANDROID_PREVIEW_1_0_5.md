# Android preview 1.0.5

Package `com.watchudoin.app`, version code 6. Built on October 27, 2026 after the user's request to resume APK builds.

Artifact: `dist/wyd-1.0.5-preview.apk` (85,487,337 bytes).

SHA-256: `2CFBE9250CD9E24B092157CEEB1CE5E5BEEA4B8BE6F53E1F76D721312FBF7261`.

## Included changes

- Personal QR cards with profile picture, name and username, a downloadable PNG, and a centered rounded watchudoin? wordmark. The QR card's W logo is removed. Camera and saved-image scans open a person preview before sending a connection request; signed-out links resume after login. Users share the downloaded image externally themselves.
- Three logo-free Android widget styles: Wide, Portrait and Reactions. Emoji buttons react immediately; Send yours opens a fresh camera draft addressed to the widget's person. Widget fonts are bundled natively, authenticated photo thumbnails preserve their original aspect ratio, and appearance follows the app theme.
- Outcome-based first-use guidance: find one person, send or receive a Moment, then place a widget. Progress persists per account on the installation.
- Moments uses "Your last 30 days together." Deletion countdowns appear only in the final 48 hours. Eight optional statuses support tapping again to clear the selection.
- Removed repeated idle Hold to nudge labels on Home. The hold gesture and sending feedback remain.
- Simplified ordinary controls and cards, limited strong gradients to primary actions, and removed the decorative Profile background.
- Branded startup and notification assets, a one-time logo pop with Reduce Motion support, and branded foreground notification popups.
- Browser password recovery returns to the web reset screen; Android links remain supported. The redesigned recovery email is prepared, but activation still requires custom SMTP. See [Password recovery](PASSWORD_RECOVERY.md).

## Verification

- TypeScript and all 173 tests passed.
- Android prebuild and push configuration checks passed.
- Release compilation succeeded with arm64-v8a and x86_64 support (882 Gradle tasks, 8 minutes 14 seconds).
- APK package/version and embedded Expo configuration passed inspection. No private environment, admin credential or keystore files were found in the APK archive.
- APK signature verified with the same certificate as the previous preview: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- Installed over the previous preview in the isolated Android API 35 emulator without clearing app data. Version 1.0.5/code 6 was confirmed. Cold startup completed successfully, the dark welcome screen rendered correctly, and the app runtime log showed no startup errors.
- Startup screenshot: `dist/design-review/android-1.0.5-start.png`.

Physical-device camera scanning, gallery permissions, launcher behavior and background phone notification delivery still need device checks. The emulator startup check does not verify authenticated flows or actual phone push delivery.

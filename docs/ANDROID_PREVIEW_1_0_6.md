# Android preview 1.0.6

Built October 28, 2026 for widget-size testing. Package `com.watchudoin.app`, version code 7.

Artifact: `dist/wyd-1.0.6-preview.apk` (85,540,832 bytes).

SHA-256: `B8CDE87B45B92D93FA56DD22656FE36E3A949733D1F75115CFCD2FF4674ADBB4`.

This preview includes the current app source, three separate widget providers with matching launcher previews, full-photo fitting without cropping or stretching, and removal of the Reactions widget's encouragement text. Newly placed widgets request these default grid sizes:

- Wide: 5 × 2.
- Portrait: 4 × 4.
- Reactions: 5 × 3.

Install over the previous preview to retain app data. Remove and re-add already placed widgets to test the new defaults: Android retains dimensions for existing placements. Launchers control the final available grid space.

Verification: TypeScript and all 187 automated tests passed. Android release compilation succeeded for arm64-v8a and x86_64. The packaged version, embedded Expo config, all three compiled widget dimensions, APK signature, file exclusions and APK alignment passed inspection. The signing certificate matches the previous preview (`fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`).

This build has not been tested on a physical launcher or installed in the emulator. Actual default placement, photo presentation and widget interactions need device testing. No Play bundle or website deployment was created.

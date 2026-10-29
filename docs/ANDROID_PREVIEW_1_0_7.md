# Android preview 1.0.7

Built October 28, 2026. Package `com.watchudoin.app`, version code 8.

Artifact: `dist/wyd-1.0.7-preview.apk` (85,452,768 bytes).

SHA-256: `1DE5BF65B32FD9F4E2CF6E81610DA4B00C319132855AA15AFB88A0C8F2643643`.

Only the Portrait widget remains. It starts at 3 × 2 cells, displays the full photo above the person's details, and places the purple app logo in the former button position at bottom right. It has no action buttons. The card opens the current moment, or widget settings when there is no current moment. Compact and tall layouts adapt to launcher dimensions. Saved Wide/Reactions preferences migrate to Portrait, retaining the person and enabled setting.

Install over the previous preview. Remove and re-add existing widgets to adopt the new default; Android retains dimensions for existing placements. The launcher controls final grid allocation.

## Verification

- TypeScript and all 177 current automated tests passed.
- Android APK assembly completed for arm64-v8a and x86_64. A first native compiler attempt ran out of memory; the retry used one Gradle worker and one CMake compile/link job at a time.
- The packaged Android manifest registers only WydPortrait. Wide/Reactions widget resources and receivers are absent. The compiled Portrait resource requests 3 × 2 cells.
- APK version, embedded Expo configuration, signature, file exclusions and alignment passed inspection.
- The signing certificate matches earlier previews: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- Light/dark static previews of the current widget layout passed image-loading and overflow checks before the build.

Physical launcher placement and interactions remain for device testing. This APK was not installed in the emulator. No Play bundle or website deployment was created.

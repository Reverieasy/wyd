# Android preview 1.0.2

Built October 26, 2026. Package com.watchudoin.app; version code 3.

This update joins the rounded wordmark as watchudoin?, recenters it, shrinks the launcher logo for circular icons, keeps comment entry visible above the keyboard, and makes feelings optional with tap-again deselection. Photos open in an uncropped full-photo viewer. An icon-only download control saves gallery copies with a small watchudoin? watermark in the lower right. New comments alert the moment owner in Activity and foreground popups; users can disable comment popups in Notifications. Background phone push setup was omitted as requested.

## Validation

- TypeScript check and all 94 automated tests passed.
- Android, iOS, and web source exports succeeded.
- Comment authorization and owner-alert SQL checks passed in a rolled-back transaction.
- Android release build succeeded with the SDK 57 MediaLibrary and view-shot modules linked.
- APK signature verified; preview uses the existing debug certificate, not a store release signing key.
- Installed on an isolated Android 15 emulator; fresh startup displayed the dark Get started screen and complete rounded wordmark without runtime errors.
- The native AppWidgetHost render check passed and produced a non-empty widget bitmap. The first harness run used an unsupported symbolic user ID; rerunning with the observed user ID 0 passed.
- Fixture layout checks covered 320px and 390px widths and dark mode.
- Source scan found no embedded secrets, and .env remains ignored.

Signed-in gallery saving and keyboard behavior still require a physical-device check; emulator startup and fixture checks do not establish those account-dependent flows.

Artifact: dist/wyd-1.0.2-preview.apk (85,124,499 bytes). SHA-256: 481FFB8E439D7E0838CC14938A0D2AC06F5983F300C4202BBD6E7A8A4B4A588B. Supported ABIs: arm64-v8a and x86_64.

An optional wording-only redeployment of the existing background-push function was rejected by automatic approval review because the user selected in-app alerts. That deployment was skipped, and the optional wording change was reverted.

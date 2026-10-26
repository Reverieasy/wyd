# Android preview 1.0.4

Package `com.watchudoin.app`, version code 5.

- Rear-camera Flash On now keeps the light on during the live preview. Auto remains capture-only. Changing lenses, leaving the camera, or backgrounding the app stops the rear torch.
- Nudge cooldown is 10 seconds per sender and recipient, enforced on the server. The hold gesture remains 3 seconds.
- Account > Close People uses compact avatar rows without the visible hold instruction or trailing arrow.
- Your own moments can be deleted from the Moments options or the moment detail trash button. Confirmation is required. The authenticated Storage API removes the photo before the owner-only RPC removes its moment, comments, reactions, and sharing records. Failed operations can be retried. Copies previously saved to a phone's gallery remain there.
- Send quietly controls are removed. New moments request normal notifications; each recipient controls their alerts in Notifications settings.

## Verification

- TypeScript and 120 automated tests passed, including camera torch lifecycle, compact nudge gestures, deletion ownership, retry, account switching, and confirmation behavior.
- Live rollback SQL checks passed for the exact 10-second boundary, owner-only deletion, Storage operation restrictions, and comment/recipient cleanup. Existing circles privacy checks also passed.
- Supabase advisors found no new security findings. Existing advisories remain unchanged.
- Android, iOS, and web source exports passed. Dark fixture screenshots verified the compact Close People rows and own-moment delete control.
- Release build succeeded in 11 minutes 23 seconds. APK signature verification passed using the same preview certificate as 1.0.3.
- APK embedded configuration confirms version 1.0.4, version code 5, the linked Expo project, and Android push configuration.
- Source secret scan passed; `.env` and `.push/` remain ignored.
- Installed over 1.0.3 on the isolated Android 15 emulator. Launch returned Status ok in 3.4 seconds, and the dark Get started screen rendered correctly. Firebase initialized successfully. No app startup crash was observed; separate Google Play services errors occurred in the emulator.

Physical rear LED behavior and background notification delivery still require a phone check.

Artifact: `dist/wyd-1.0.4-preview.apk` (85,137,091 bytes), arm64-v8a and x86_64. SHA-256: `14D9CF461243A07AAC970F86D6A283FE2321EB1F26234FE1A0546EF6B5CC55DD`.

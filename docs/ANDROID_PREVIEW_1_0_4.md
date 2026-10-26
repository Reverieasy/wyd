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

Build artifact and installation verification will be recorded after the release build completes. Physical rear LED behavior and background notification delivery still require a phone check.

# Circles and photo retention

Updated October 26, 2026.

## Circles

- Create a named circle from Home or Settings. Its creator is the host.
- Share its code or `watchudoin://join-circle?code=...` link with anyone, including people outside Close people. These app links require Wyd to be installed; a public HTTPS invitation landing page has not been deployed.
- Invite codes expire after seven days. The host can replace a code immediately.
- Joining sends a request. Only the host can approve or decline it. Pending requests cannot see members, photos, or post to the circle.
- Approved members can share moments to selected circles from the recipient screen. Membership does not create a Close people connection.
- New members do not inherit previously shared moments. Leaving or removal revokes circle-only photo access. A separate direct share remains subject to the existing Close people permissions.
- The host can rename the circle, remove members, or delete it. Other members can leave.

Home shows Close people followed by Your circle and its photo feed. Circle chips filter the loaded feed; Load more retrieves additional authorized moments. The earlier hero photo and Send a moment card are removed. The bottom menu uses a raised purple camera button.

## Photo retention

The Moments screen warns: “Photos are permanently deleted 30 days after upload.” Shared moments still leave Home after 24 hours. Owners can view retained moments for up to 30 days.

The live backend rejects new access after 30 days. The `wyd-moment-retention` job invokes `cleanup-expired-moments` every 15 minutes, so physical deletion happens on a scheduled pass after the deadline. The worker removes files through the Storage API before deleting their database records. Failed file deletion preserves records for retry. Old orphaned files in `moment-photos` are included; profile pictures are not part of this policy.

The cleanup endpoint requires the private worker secret or the legacy cleanup secret. Object enumeration and notification eligibility RPCs are restricted to the service role. Secrets remain outside the application bundle.

## Validation and delivery

- Transactional database checks in `tests/circles.sql` cover host approval, pending-user isolation, sharing outside Close people, idempotency, leaving, invite rotation, and retention. Test fixtures roll back.
- Node tests cover invitation parsing and RPC calls, cleanup failure/retry behavior, the exact retention boundary, and Android widget module resolution.
- The retention worker and circle-aware push eligibility changes are deployed. The cleanup schedule is active and an authenticated cleanup invocation returned HTTP 200.
- Android widget service resolution now selects `widgetService.android.ts` rather than the unavailable fallback. An installed release APK needs a future build to receive this source fix.
- No new APK has been built for these changes, following the user's instruction.

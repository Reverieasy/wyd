# Comment reply notifications

When someone adds a comment, notify the photo owner and people who had already commented in that same thread. The writer never receives an alert for their own comment. An owner replying to their own photo still notifies earlier commenters.

- Photo owner: “Name commented on your moment”.
- Earlier commenter: “Name replied in the comments”.
- People who have not commented receive no thread alerts.
- Activity entries and foreground banners open the relevant Moment. The existing Android push channel also delivers replies in the background, subject to system notification permission.
- The existing Notifications → Comments switch and global notifications switch control popup/push delivery.
- No comment text or photo URL is placed in the push payload.

## Backend

Migration `20261029151740_comment_thread_reply_notifications.sql` is deployed to project `oqzstnarzfddgapyynff`. `send-push-notification` version 11 is active with JWT verification enabled. The existing notification worker is unchanged.

Private recipient receipts capture the audience when the comment is inserted, preventing later commenters from receiving historical alerts. Existing owner activity is preserved without queuing historical pushes. Receipt rows cascade when a comment, Moment or recipient account is deleted.

Only the service role can call `comment_push_recipients`. Both writer and recipient must still have access to the thread when background delivery is attempted. Expired shared Moments, removed circle members and blocked pairs are excluded. The durable job and per-token delivery keys prevent duplicate sends from the app/worker paths.

## Verification

- TypeScript and all 193 Node tests passed.
- `tests/commentPush.test.cjs` exercises the actual Edge Function with mocked delivery: owner/reply copy, settings, actor validation, failure handling and app/worker deduplication.
- `tests/commentReplyNotifications.sql` passed against PostgreSQL inside a rolled-back transaction: non-close circle participants, owner replies, self exclusion, non-commenters, late joiners, blocking, revoked access, expiry, privileges, idempotency and deletion cascade.
- The existing circle SQL regression suite passed in a separate rolled-back transaction. Temporary accounts and broadcasts were not committed.
- Deployed version 11 source matches the local function. Security review found no new exposed function/table warnings; the private receipt table intentionally has RLS enabled with no client policies or client grants.
- No real push was sent to an existing user during testing. Physical-device foreground/background delivery remains to be checked.

Included in release-mode APK 1.0.9. The backend also supports existing comment-capable builds; updated in-app reply wording requires 1.0.9 or later.

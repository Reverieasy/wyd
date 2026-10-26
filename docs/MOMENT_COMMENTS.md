# Moment comments

Users can open a moment from Home or Moments to read and write comments. The thread uses profile avatars, message bubbles, and an icon-only send button. Their own bubbles align right; other people's bubbles align left. Older messages load above the conversation. Refresh fetches new comments; push notifications for comments are not included.

The latest visual update uses rounded white cards, lavender bubbles, and a purple gradient send control. The detail header has the rounded Nunito wordmark with a purple “doin?” accent, shared with Home and login loading. Corner option menus and the photo settings overlay are removed; reporting another person's moment remains available as a text action. Comments remain text-only, as requested.

Comments support up to 500 Unicode characters, author names, timestamps, pagination, and deleting your own comment with confirmation. A failed send keeps the draft and its request ID so retrying does not duplicate a successfully stored comment.

The server derives the author from the signed-in session. Posting requires accepted Terms and current access to the moment. Pending circle members, outsiders, people who left the circle, and blocked users do not gain access through comments. Comments from blocked authors are hidden. A shared moment's thread expires with its visibility; the owner can continue viewing and commenting on their retained moment for up to 30 days.

The thread RPC exposes only the author name and username needed for comments. Avatars use the existing profile and Storage permissions, falling back to initials when an author profile is unavailable. Full profile access is not expanded.

The `moment_comments` table has RLS enabled. Client writes are restricted to validated RPCs, including a 20-comments-per-minute per-user limit. Deleting a moment or account cascades to its comments, so the 30-day photo cleanup also removes its thread.

Validation: transactional checks in `tests/circles.sql` verify comment isolation, host/member posting, retry idempotency, invalid text, ownership for deletion, block behavior, retention, and cascading deletion. `tests/comments.test.cjs` covers service pagination, Unicode limits, retry handling, and the Messenger-style composer.

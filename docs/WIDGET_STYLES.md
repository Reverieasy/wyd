# Android photo widgets

The previous Portrait widget is replaced by three photo-first widgets:

| Size | Default grid | Controls |
| --- | --- | --- |
| Small | 2 × 2 | Camera reply |
| Medium | 4 × 2 | Heart, Nudge, camera reply |
| Large | 4 × 3 | Heart, Nudge, camera reply |

Each has its own Android provider (WydSmall, WydMedium, WydLarge) and matching launcher preview. WydPortrait and the earlier Wide/Reactions providers are removed. Settings offers a size picker, previews the selected size, and pins its provider. All copies use the account's selected person.

Photos fill the rounded card, with a dark gradient behind white name/status/time text. The dark translucent quick-action buttons and larger purple camera match the reference. Small keeps separate status/time rows; other sizes combine them when space allows. Constrained layouts move controls below the details. Tapping the photo opens the complete Moment. The former logo is removed.

Heart taps send immediately. The selected reaction is read from the current user's server reaction and persists through refreshes. Repeated taps on an already selected reaction do not create another write or notification. Pending actions show progress and prevent duplicate sends. Nudges retain the server's 10-second cooldown. Existing Android widget click overlays provide native pressed feedback.

Camera reply opens the existing Send yours route with a fresh draft addressed only to the selected person. It does not automatically capture or send a photo, and never inherits old circles, status, captions, or nudge replies.

A small purple dot marks an unread current Moment when a direct recipient receipt is available. Opening the Moment marks it seen through the existing app flow; changes to seen status or the current user's reaction refresh widgets while the app is active. Android controls background refresh timing.

The task revalidates the signed-in account, enabled setting, selected connection, active photo and clicked identifiers before sending. Stale, own-photo, unsupported-size/action and mismatched-account taps cannot send reactions. Private thumbnails remain authorized with the current session, with no credentials or signed photo URLs embedded in widget content. Disabling or signing out clears every size. The cache is removed after the last widget copy is removed.

Saved Portrait preferences migrate to Small, old Wide preferences to Medium, and old Reactions preferences to Large, retaining the selected person and enabled setting. Launcher grid allocation varies by device. After installing the next Android build, remove the old widget and choose a new size.

This revision is included in [release-mode APK 1.0.8](ANDROID_RELEASE_1_0_8.md), signed with the existing local test key. Static visual checks cover the native widget trees, minimum and enlarged sizes, selected/pending reactions, unread indicators, safe empty states and Settings previews. Physical launcher and click verification remain for device testing.

Validation: TypeScript and all 186 automated tests pass. Android prebuild and the verified APK register only the three new providers with 2 × 2, 4 × 2 and 4 × 3 target cells. Visual fixtures show no overflowing controls/text or missing images. Reaction and Nudge tests cover ownership, stale taps, duplicate writes, logout redaction, cooldown feedback and push delivery.

Picker preview photo: [Unsplash image source](https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba), used under the [Unsplash License](https://unsplash.com/license). Actual placed widgets display the selected person's shared Moment.

# Android home-screen widget

The **Wyd? - Your person** widget shows the latest active moment that the chosen
accepted connection shared with the current user. It includes the person's name,
status, relative time, and a Nudge button. Tapping the photo opens the moment.
Nudge sends directly from the widget; Android RemoteViews support taps, rather
than the app's press-and-hold gesture.

The widget follows the app appearance setting. Dark uses a deep purple card with light text and a muted placeholder. Light preserves the white card. System supplies native day/night variants so Android can switch the widget theme while the app is closed.

## Build and add

This adds native code. It requires a new Android development or production build;
Expo Go and previously installed builds do not contain the widget provider.

1. Run `npx expo prebuild --platform android`, then build with
   `npx expo run:android`, or use the existing EAS Android build profile. Rerun
   prebuild after reinstalling dependencies so the private bitmap plugin applies.
2. Sign in and open **You → Settings → Home screen widget**.
3. Choose an accepted connection and tap **Add to home screen**.
4. Confirm the Android launcher prompt. Launchers without pinning support can use
   the home screen's **Widgets** picker instead.

The layout defaults to 4×2 launcher cells and is resizable. All instances share
the selection made in Settings. A custom entry point registers the headless task
before the Expo Router app entry point. The native config plugin generates the
provider and receiver during Expo prebuild.

## Updates and privacy

- Active-app updates and app foregrounding refresh installed widgets.
- Android schedules background refreshes at a minimum of 30 minutes; actual
  timing is controlled by the launcher and battery restrictions. This release
  does not promise instant widget updates from background push notifications.
- Each refresh checks the current session, accepted connection, and the existing
  RLS-protected moment query. It uses authenticated private storage downloads.
- The widget receives a small bitmap, never an access token, refresh token,
  service key, public photo URL, or signed URL. Temporary downloads are deleted.
- The local `withPrivateWidgetImages` Expo config plugin passes the rendered
  widget directly through Android's RemoteViews bitmap API and removes the
  dependency's exported image provider. It is pinned to widget library 0.22.1
  and deliberately stops prebuild if that renderer changes. This widget does not
  use collection views; review the plugin before adding any ListWidget.
- Disabling the widget or logging out clears the displayed snapshot. Account
  changes cannot reuse another account's cached photo.
- Expired photos are excluded on refresh. A launcher can retain its last rendered
  bitmap until Android delivers another update; expiration is not an exact alarm.
- Network failures render an unavailable placeholder, rather than serving an
  unverified cached private photo.

## Device verification

On a newly built Android app, verify adding from both Settings and the launcher,
resizing, opening a moment, successful and rate-limited Nudges, photo refresh,
expiry, offline refresh, disabling, logout, account switching, and connection
removal. Native widget rendering and launcher interaction require a device or
emulator; JavaScript exports alone cannot verify them.

The account-free Android test host is in `tests/android`. It binds an actual
AppWidgetHost, waits for a rendered widget bitmap, and saves a screenshot. The
updated APK passed this check on an Android 15 x86_64 emulator. The signed-out
card rendered successfully; live account photos and Nudge delivery still need
an authenticated phone check.

SDK 57 can expose `Constants.expoGoConfig` in standalone apps. Widget availability
must use app ownership and native module presence, not that manifest field. The
previous check skipped headless task registration and left placed widgets empty.

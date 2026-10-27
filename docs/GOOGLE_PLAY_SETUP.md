# Google Play connection

Browser access to the signed-in Play Console was confirmed on October 27, 2026. Google is reviewing the submitted identity documents; contact-phone verification remains pending. No app has been created in this developer account yet.

Browser access is separate from automated publishing. The existing Expo project is linked and Firebase push is configured, but an EAS Submit credential with Play Console permissions has not been assigned.

To enable automated uploads:

1. Create the watchudoin? app in Play Console and use the existing Android package `com.watchudoin.app`.
2. Enable the Google Play Developer API in a Google Cloud project. Create a publishing service account and grant it the required app-specific Play Console permissions. Keep its JSON key outside source control, for example under the ignored `.push/` folder.
3. Assign the publishing key to the production app's EAS Submit credentials. The FCM credential already configured for background notifications serves a different purpose.
4. Build a properly signed production Android App Bundle (`.aab`) and submit to internal testing. Complete the Console's setup tasks before requesting production release.

The local preview APKs are signed for development testing and are not Play Store production bundles.

Official references: [Google Play API access](https://developers.google.com/android-publisher/getting_started), [EAS Submit for Android](https://docs.expo.dev/submit/android/).

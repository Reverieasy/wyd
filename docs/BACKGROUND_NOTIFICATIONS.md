# Android background notifications

The app uses Expo Push Service with Firebase Cloud Messaging (FCM V1) for Android. Supabase queues moments, nudges, reactions, comments, and connection events. The worker checks recipients, blocks, access, preferences, and delivery deduplication before sending. Comment alerts go to the moment owner, excluding their own comments.

The client requests notification permission, registers its Expo push token, refreshes registration after device-token changes and foregrounding, and disables the token on logout. Tapping a notification opens the associated screen only after checking current access. Foreground events use the existing in-app banner; Android displays remote alerts in the background. No continuous background polling is added.

Configured October 26, 2026: Expo project `@reverieasy/wyd` is linked; Firebase project `watchudoin` matches `com.watchudoin.app`; the FCM V1 service-account key is assigned in EAS; and the Android client file is stored in EAS build environments. A Google FCM `validate_only` request returned HTTP 200 without delivering a message. The Supabase notification worker is active and the push endpoint rejects unauthenticated calls. Physical-phone delivery still needs checking after installing the new native build.

## Connect your accounts

1. Create/sign in to an [Expo account](https://expo.dev/signup). From this workspace, run `npx --yes eas-cli@25.3.0 login`. The browser sign-in must finish before `npx --yes eas-cli@25.3.0 whoami` will show your account.
2. Run `npx --yes eas-cli@25.3.0 init` to create or link the `wyd` project in your Expo account. For this dynamic config, put the returned UUID in `app.json` under `expo.extra.eas.projectId`, or set `EXPO_PUBLIC_EAS_PROJECT_ID` locally. Do not use the project name as its ID.
3. In the [Firebase console](https://console.firebase.google.com/), create a project. A free Spark project is sufficient for FCM; Analytics is optional. Add an Android app with package **com.watchudoin.app**.
4. Download the Android client file **google-services.json** and save it to **G:\wyd\.push\google-services.json**. The app config detects this file automatically and validates its Android package. This is a different file from the private service-account key.
5. In that Firebase project, open **Project settings → Service accounts → Firebase Admin SDK → Generate new private key**. Save the JSON in `.push/`. The FCM V1 API must be enabled for this project.
6. Run `npx --yes eas-cli@25.3.0 credentials --platform android`. Choose the app/build profile, then **Google Service Account → Manage your Google Service Account Key for Push Notifications (FCM V1) → Set up → Upload a new service account key**. Upload the private JSON from step 5 to Expo. No Firebase private key belongs in the mobile bundle or in Supabase client configuration.
7. Run `npm run push:check`. This checks the local Expo UUID and Android client file. Confirm the server credential separately in EAS; the local check cannot inspect the uploaded private key.
8. Rebuild the Android app. The current installed APK cannot gain native Firebase configuration from a JavaScript refresh. The new build creates the `watchudoin-updates` high-importance channel. On the phone, enable Notifications in the app and approve Android's permission prompt.

For EAS cloud builds, supply the Android client JSON using an EAS **file environment variable** named `GOOGLE_SERVICES_JSON`; this variable contains the file path during the build. The `.push/` directory and credential JSON files are ignored by Git and are not uploaded through source control. A local Android build can use `.push/google-services.json` directly.

## Verify on two physical phones

Use two accepted accounts with notifications allowed. Turn Send quietly off when testing photo alerts. Send a moment, reaction, comment, and Nudge while the recipient app is backgrounded, then after closing it normally. Verify the Android tray/banner, the notification tap route, preferences, and revocation after blocking or leaving a circle. An Android force-stop can prevent delivery until the app is opened again. Test logout so a signed-out account does not receive new alerts. Do not treat an Expo push ticket as proof of phone delivery; inspect Expo receipts when diagnosing failures.

See the official [Expo SDK 57 Notifications reference](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/), [FCM V1 credentials guide](https://docs.expo.dev/push-notifications/fcm-credentials/), and [push setup guide](https://docs.expo.dev/push-notifications/push-notifications-setup/).

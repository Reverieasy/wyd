# Personal QR cards

Find your person has **My QR code** and **Scan QR** controls. My QR code is also available in Account settings.

The card puts the user's profile picture (or initials), display name and username above a high-contrast QR code with a four-module white quiet zone. It downloads as a PNG to the Android gallery or through the browser's download feature. Users share the saved image externally themselves; there is no in-app image-sharing action or sharing SDK.

The card and downloaded PNG use the centered rounded watchudoin? wordmark, with its split purple gradient and question-mark accents. The W logo is omitted. The wordmark sits below the QR quiet zone so it does not cover the code.

The payload is `watchudoin://add-person?username=…`. It contains only the exact username, never session credentials or private photo links. Generation is local. A new card should be downloaded after a username change. The name/photo in an already downloaded PNG remain as they were when saved.

The scanner accepts only this app's person QR format. It supports the live rear camera and scanning a saved QR image on native platforms. It opens a person preview before a request can be sent, handles existing/pending connections, and rejects self-connection. Incoming requests can be accepted. The existing backend connection, block and Terms checks apply.

When a code opens before login, the username is kept locally and resumed after authentication. Native camera scanning and gallery downloads require the app's permissions. Saved images are intended for external distribution; the user chooses whom to send them to.

There is no hosted web/install landing page yet. Scan inside watchudoin?, or open the app link on a device where the app is installed. Web camera availability depends on the browser and secure context; username search remains available. Android barcode scanning is enabled in source configuration. These features are included in the 1.0.5 preview APK; physical-device scan/save testing remains pending.

Verification: all 173 tests and TypeScript passed, Android/web source exports passed, and Android prebuild and release compilation passed. The actual browser-downloaded 1080 × 1480 PNG independently decoded to its exact username link. Card layouts fit 320 px and 390 px widths. Native gallery download and camera scanning still need a physical-device check on a physical device. See [Android preview 1.0.5](ANDROID_PREVIEW_1_0_5.md).

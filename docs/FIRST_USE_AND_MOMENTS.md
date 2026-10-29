# First use and the 30-day identity

Moments is described as **Your last 30 days together**. The gallery remains personal and the existing 30-day storage cleanup stays in place. Settings no longer calls it a memory book. The welcome screen uses the same identity.

Deletion labels appear only during the final 48 hours, in gallery tiles and the owner's Moment details. Labels use days, hours or “under 1h”; fresh photos have no countdown. Expired photos remain hidden. A reminder in Moment details suggests saving a copy. These labels describe the 30-day deletion deadline, separately from the 24-hour Home feed window.

Home includes a first-use card that presents one next action:

1. Find one person. An accepted Close People connection completes this outcome.
2. Send or receive a first Moment. An observed shared Moment or successful send completes this outcome.
3. Add a widget. Completion requires an enabled widget for a person and a placed Android widget instance; opening settings or requesting a pin does not count as placement.

Progress is saved locally per account and merged monotonically, so expiring photos or removing a widget do not reset completed outcomes. Users can defer the card and reopen it in Settings → Getting started. Web/iOS users can explore Android widgets or defer this step. Progress persistence is local to the installation, not cross-device.

The optional status picker offers Studying, Working, Eating, Home, Outside, Gym, Chilling and Bedtime in a wrapping two-column layout. Tapping a selected choice clears it. Older School and Morning values remain readable for compatibility.

Ordinary buttons use solid fills. Strong gradients are explicit for main actions such as account creation and sending a Moment. Profile's decorative backdrop and gradient Edit profile control were removed. Informational cards and widget surfaces are flat and theme-aware; light mode stays mostly white and dark mode remains dark.

Validation covers progress ordering, concurrent saves, account isolation, actual widget placement, optional status toggling, expiry boundaries, TypeScript and Android/web source exports. Static layout review covers 320 px dark and 390 px light screens. The 1.0.5 APK compiled, installed over the previous preview and launched successfully in the emulator. See [Android preview 1.0.5](ANDROID_PREVIEW_1_0_5.md).

# Android icon validation — 2026-08-26

The persistent source asset `public/images/app-icon-source.jpg` is the user-provided telescope-and-solar-system artwork with the `Ethio-cosmos` label.

The original generated Android PNG contained that telescope artwork, but the manifest used the generic `ic_launcher` resource names and there was no adaptive-icon XML binding. That did not prove what an installed launcher would select.

## Corrected source binding

The generator now removes only near-white pixels connected to the original image border, preserving enclosed white stars. It emits uniquely named transparent legacy resources for mdpi through xxxhdpi, a transparent adaptive foreground, and a dark adaptive background. `AndroidManifest.xml` now binds `android:icon` and `android:roundIcon` to `@mipmap/ethio_telescope_launcher` and `@mipmap/ethio_telescope_launcher_round`; the obsolete `ic_launcher` PNG resources were removed. Version metadata is v1.10.12/versionCode 41.

The deterministic verification script reports alpha 0 at all four corners for every generated legacy icon and for the adaptive foreground. The local Android Gradle build could not proceed because this sandbox lacks an Android SDK; CI must be used for the packaged APK, followed by inspection of that exact artifact. Until that CI APK is built and inspected, the phone-side icon fix must not be described as proven.

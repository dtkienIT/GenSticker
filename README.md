# GenSticker

GenSticker is an Expo SDK 57 app for fully on-device text-to-sticker generation. The shared Expo
Router application runs on Android and iOS behind native contract `1.0`:

```text
prompt → local safety gate → native generation → background removal
       → transparent PNG → durable gallery → Photos/share sheet
```

Android uses the existing ONNX Runtime/NNAPI adapter. iOS uses Core ML on the Apple Neural Engine
and Vision subject lifting on a physical iPhone 12/A14 or newer running iOS 17+. The deterministic
mock is available only when `EXPO_PUBLIC_STICKER_RUNTIME=mock`; production profiles always select
the native adapter.

## Local development

Install Node.js 22.13 or newer, then:

```powershell
npm.cmd ci
npm.cmd start
```

Expo Go cannot load the custom native module. Use an Expo development build:

```powershell
# Android
npx.cmd expo run:android

# iOS simulator mock from a Windows checkout via EAS
npx.cmd eas build --platform ios --profile simulator

# Registered physical iPhone development build
npx.cmd eas device:create
npx.cmd eas build --platform ios --profile development
```

The iOS Core ML artifact is not checked into Git. A maintainer manually runs the
`Build iOS Core ML model` workflow, approves the protected `model-release` environment, publishes
the immutable release, and then commits the generated
`modules/expo-sticker-runtime/ios/Resources/model-distribution.manifest.json`. Until that real,
digest-bearing manifest exists, native iOS model setup correctly reports
`MODEL_MANIFEST_MISSING`.

## Verification

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
python -m pytest model_tools/tests -q
npx.cmd expo install --check
```

macOS CI additionally runs Swift unit tests, Expo SDK 57 iOS prebuild, CocoaPods installation, and
an unsigned simulator compile. Before TestFlight submission, verify the signed `.app`:

```bash
bash scripts/verify-ios-entitlement.sh /path/to/GenSticker.app
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

Production delivery remains gated on the physical iPhone 12 acceptance run in
[`docs/TESTING_AND_RELEASE.md`](docs/TESTING_AND_RELEASE.md). Failure of latency, memory, stability,
offline, cancellation, recovery, gallery, Photos, or sharing criteria is a no-go, not a reason to
enable cloud or mock inference.

## Architecture

Screens depend on `OnDeviceStickerGenerator`, `ModelBundleManager`, `PromptSafetyEvaluator`,
`StickerAssetRepository`, and `PlatformAssetExporter`. Platform code stays behind those interfaces:

| Platform | Native adapter                | Model                       | Background removal |
| -------- | ----------------------------- | --------------------------- | ------------------ |
| Android  | `expo-sticker-runtime-onnx`   | ONNX Runtime / NNAPI        | ML Kit             |
| iOS      | `expo-sticker-runtime-coreml` | 4-bit chunked Core ML / ANE | Vision             |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
[`docs/MODEL_PIPELINE.md`](docs/MODEL_PIPELINE.md), and
[`docs/TESTING_AND_RELEASE.md`](docs/TESTING_AND_RELEASE.md) for native boundaries, artifact
lifecycle, and release gates.

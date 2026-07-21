# GenSticker

GenSticker is an Expo SDK 57 feasibility shell for an Android-first, fully on-device text-to-sticker product.

The active app flow is:

```text
prompt → local safety gate → mockable on-device adapter → transparent PNG → preview → save/share
```

The checked-in adapter is a deterministic local mock. Its progress, failures, transparent PNGs, save flow, and sharing flow exercise the application contract only; they are not production inference or device-feasibility evidence.

## Run the app

```powershell
npm.cmd install
npm.cmd start
```

Open the project in Expo Go on Android first. The mock capability gate intentionally reports iOS and web as unsupported.

The default runtime is `mock`. Set `EXPO_PUBLIC_STICKER_RUNTIME=native` only when testing the unavailable-runtime UI; a real Android inference module has not been connected yet.

## Product routes

- `/` — capability-gated prompt workspace
- `/create/generating` — local progress, cancellation, error, and retry
- `/create/result` — transparent preview, Photos export, sharing, regeneration, and prompt editing
- `/library` — durable app-owned sticker gallery
- `/settings` — local appearance and build disclosure
- `/debug` — development-only deterministic fault injection

The retired selfie, consent, canonical-character, profile, sticker-pack, and cloud-service journeys are not part of this app.

## Verification

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npx.cmd expo install --check
npx.cmd expo export --platform android --output-dir dist/android-smoke
```

Physical Android verification is still required for Photos permission behavior, the operating-system share sheet, offline operation, process restart, and visual alpha-channel inspection.

## Architecture boundary

Screens depend on the `OnDeviceStickerGenerator`, `PromptSafetyEvaluator`, `StickerAssetRepository`, and `PlatformAssetExporter` ports. The future Android runtime must implement those contracts without moving inference logic into routes or stores.

The authoritative product and target-release documentation lives under [`docs/`](./docs/). This Expo shell must not be represented as the Kotlin/Compose production application or as evidence that a model/runtime has passed the Week 1 feasibility gate.

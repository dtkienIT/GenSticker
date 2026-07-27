# Local Development

## Local WebGPU Web App

The Expo web build runs the same `lcm-sd15-chibi` `1.0.1` FP16 generation graphs and tokenizer as
the Android runtime. During local development, the browser reads them from the ignored
`model_artifacts/model-lcm-sd15-v1.0.1` directory through a range-capable localhost server; the
generation weights are not copied into browser storage.

From separate PowerShell terminals:

```powershell
npm.cmd run web:model:fetch-segmentation
npm.cmd run web:model:serve
npm.cmd run web
```

Open the Expo localhost URL in current desktop Chrome or Edge. Localhost is treated as a secure
context, but the browser/GPU must expose WebGPU and `shader-f16`. The first command is idempotent
and verifies the pinned U²-NetP checksum. Local production exports also default to the project
model server. A deployable PWA can instead set `EXPO_PUBLIC_WEB_MODEL_SOURCE=cache` before
`npm.cmd run web:export` to install the same verified files in versioned Cache Storage for offline
use.

> **Current MVP toolchain:** Node 22.13+, Expo `~57.0.7`, React Native 0.86, React 19.2.3, `expo-dev-client ~57.0.7`, Android API 24+, and Python 3.13. Native generation requires `npx expo prebuild --platform android` and an Android development build with package `com.vinai.gensticker.dev`; Expo Go is unsupported. Select mock generation only through the explicit development environment setting.

## Document Control

**Authority:** The [PRD](./PRD_AI_Sticker_Generator.md) is authoritative. This guide implements
the [Android release constraints](./PRD_AI_Sticker_Generator.md#constraints), the
[on-device architecture](./PRD_AI_Sticker_Generator.md#8-system-design--architecture), and the
[Week 1 feasibility workflow](./PRD_AI_Sticker_Generator.md#week-1--feasibility-spike--gono-go).
On-device runtime behavior and fixture vocabulary come from the
[Integration Contracts](./INTEGRATION_CONTRACTS.md).

**Current versus target:** The checked-in tree contains an Expo/TypeScript mock UI scaffold; the PRD
target is a Kotlin and Jetpack Compose application. Expo commands are current-scaffold maintenance
only and are not target application or on-device inference evidence. Implementation status belongs
only in the [Roadmap](./ROADMAP.md); `W1-07` owns the target Android project and Gradle workflow,
while `XC-RESET` owns the production application ID and reset evidence.

The current-scaffold Expo version claims in this guide are bound to the official
[Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/),
[SDK 57 DevClient reference](https://docs.expo.dev/versions/v57.0.0/sdk/dev-client/),
[SDK 57 Expo Go library boundary](https://docs.expo.dev/versions/v57.0.0/sdk/third-party-overview/),
and [Expo CLI reference](https://docs.expo.dev/more/expo-cli/).

## Supported Host Setup

Use Windows, Linux, or macOS with:

- Git;
- Android Studio, an Android SDK, and the Java/Kotlin toolchain selected by the checked-in target
  Android project once that project exists;
- `adb` available from the Android SDK Platform Tools;
- npm and the Node.js version listed below when maintaining the current scaffold; and
- a USB-debuggable physical Android device for native, performance, thermal, recovery, and release
  evidence.

An Android emulator may be used for layout, routing, and deterministic application tests. It does
not replace the representative physical-device evidence required by the
[PRD device floor](./PRD_AI_Sticker_Generator.md#constraints) or the
[feasibility device matrix](./FEASIBILITY_SPIKE.md#device-test-matrix).

## Current Scaffold Versions

| Tool or framework | Required version                    | Source of truth                                                      |
| ----------------- | ----------------------------------- | -------------------------------------------------------------------- |
| Node.js           | `22.13.x` or newer                  | Expo SDK 57 minimum; CI and contributor machines must satisfy it     |
| Expo SDK          | `57.x` (`expo` currently `~57.0.7`) | `package.json` and the SDK 57 reference                              |
| React Native      | `0.86` (currently `0.86.0`)         | `package.json` and the SDK 57 reference                              |
| React             | `19.2.3`                            | `package.json` and the SDK 57 reference                              |
| npm dependencies  | Exact lockfile resolution           | `package-lock.json`; install with `npm ci`                           |
| Contract          | `1.0`                               | [Integration Contracts](./INTEGRATION_CONTRACTS.md#document-control) |

Expo SDK 57 targets React Native 0.86 and React 19.2.3 and requires Node.js 22.13.x at minimum.
These versions describe the checked-in scaffold only; they do not redefine the PRD's Kotlin and
Jetpack Compose target stack. The checked-in patch versions remain authoritative for scaffold
maintenance.

Do not replace the checked-in dependency versions with a generic latest version. Expo documents
that React Native packages must match the installed React Native/Expo combination; validate the
lockfile installation with `npx expo install --check`.

## Current Scaffold Setup

From the repository root:

```powershell
node --version
npm --version
npm ci
npx expo install --check
```

`node --version` must report `v22.13.0` or newer. `npm ci` is the reproducible installation path:
it consumes the committed lockfile and must not rewrite it. If the Expo compatibility check fails,
stop and reconcile the dependency change in a reviewed commit; do not hide or bypass the mismatch.

No environment variable or local service is required for the target core generation flow. Once
implemented and installed, capability evaluation, prompt moderation, generation, Segmentation,
persistence, gallery access, and OS sharing are local as required by the
[offline guarantee](./USER_FLOWS.md#offline-guarantees).

## Current Expo Scaffold Workflow

For the **current mock scaffold**, start Metro with:

```powershell
npm run start
```

The current `npm run android` script asks Expo CLI to open the scaffold on Android. This is only a
mock/UI loop and cannot prove the target inference path. Never substitute a scaffold, web, Expo Go,
or emulator result for target Kotlin application, model, Segmentation, persistence, or physical-
device evidence.

## Real-Model Android Emulator Workflow

The development client can exercise the real Kotlin/ONNX pipeline on a dedicated Android Studio
emulator. This is functional integration evidence only; it does not replace the Pixel 7+ physical
performance and quality gate.

Create an Android Virtual Device with:

- Pixel 7 hardware profile;
- API 37.1 Google Play x86_64 system image;
- 8192 MB RAM; and
- at least 12 GB of data storage.

The native capability gate continues to require at least 6 GB of reported RAM. Keep the emulator
online through the first segmentation run so Google Play Services can deliver ML Kit Subject
Segmentation.

Start the emulator, then build and install the x86_64 development client from the repository root:

```powershell
Remove-Item Env:EXPO_PUBLIC_STICKER_RUNTIME -ErrorAction SilentlyContinue
npx.cmd expo run:android --device
```

Do not set `EXPO_PUBLIC_STICKER_RUNTIME=mock`; unset or `native` selects the real module. The Expo
CLI selects `x86_64` for the running emulator while the checked-in default remains `arm64-v8a`.

Validate and stage the existing model bundle after the app is installed:

```powershell
C:\tmp\gensticker-py313\python.exe -m model_tools.repair_text_encoder `
  model_artifacts\model-lcm-sd15-v1.0.0
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\stage-local-model.ps1
```

The repair command validates the source graph, applies ONNX Runtime 1.27's deterministic FP16
normalization, smoke-tests the fixed `[2,77,768]` output, and atomically replaces the text encoder
only after all checks pass. It regenerates the immutable `1.0.1` manifests; rename the repaired
artifact directory to `model_artifacts/model-lcm-sd15-v1.0.1` before staging. An already repaired
graph is accepted unchanged, so the command is safe to rerun.

The helper verifies all local byte lengths and SHA-256 values, transfers each part through
`/data/local/tmp`, and copies it under the debug app identity into the app-private
`files/model-import/` staging directory. Each device-side copy is verified before its temporary
ADB file is removed. This app-private fallback is required on API 37.1 because its storage
isolation prevents the app from reading shell-owned files pushed directly below
`/sdcard/Android/data/com.vinai.gensticker.dev/files/model-import/`; the Kotlin importer still
accepts that external directory first on Android versions where it is app-readable.

In GenSticker, tap **Install staged local model**. The Kotlin module verifies the bundle again and
atomically promotes it into app-private storage. Model binaries are neither added to the APK nor
tracked by Git.

For later JavaScript-only sessions, leave the installed development client in place and run:

```powershell
Remove-Item Env:EXPO_PUBLIC_STICKER_RUNTIME -ErrorAction SilentlyContinue
npx.cmd expo start --dev-client
```

If local PowerShell execution is enabled, the shorter
`.\scripts\stage-local-model.ps1` invocation is equivalent. `-ValidateOnly` performs host
verification without writing to an emulator.

## Target Native Android Workflow

Roadmap item `W1-07` creates the basic Kotlin and Jetpack Compose project. That change must check in
the Gradle wrapper and pin the Android Gradle Plugin, Kotlin, Compose, Java, compile SDK, and target
SDK versions used by the target application. Until those files exist, this guide does not invent a
Gradle project path or commands that cannot run.

After `W1-07`, contributors use the checked-in Gradle wrapper to build, test, and install the target
application on a device listed by `adb devices`. Rebuild the binary after changes to Kotlin or
runtime-native code, Gradle dependencies, Android configuration, bundled models, or the
model/runtime adapter.

Development builds are debugging tools, not release evidence by themselves. Performance, thermal,
install-size, offline cold-start, crash recovery, and Play acceptance tests use the exact
release-like or release-candidate binary named by the evidence package.

## On-Device Runtime Workflow

1. Read the [Application Generation Port](./INTEGRATION_CONTRACTS.md#application-generation-port),
   [On-Device Runtime Wire Contract](./INTEGRATION_CONTRACTS.md#on-device-runtime-wire-contract), and
   [Progress and Cancellation](./INTEGRATION_CONTRACTS.md#progress-and-cancellation) before
   changing the runtime adapter.
2. Add or update a contract fixture before changing observable behavior. Run each affected fixture
   against every producer and every consumer; implementation-local tests do not replace consumer
   conformance.
3. Build and install a new target Android development build with its checked-in Gradle workflow.
   Record the source commit, build identifier, contract version, device, Android build, runtime
   version, and selected delegate.
4. Verify one admitted request produces one correlated terminal result; invalid pre-admission
   requests produce the defined wire error and no work.
5. Exercise ordered progress, duplicate/late events, cancellation idempotency, cleanup, relaunch,
   and a successful new request after recovery.
6. Run the physical-device gates in [Testing and Release](./TESTING_AND_RELEASE.md) before treating
   a native change as releasable.

Observable changes require the contract
[change procedure](./INTEGRATION_CONTRACTS.md#change-procedure), including versioning, producer and
consumer coordination, migration, fixtures, and approvals.

## Model Fixtures

The Week 1 decision selects exactly one Plan A/B/C runtime and artifact configuration. Until that
decision is effective, candidate artifacts are experimental and must not be described as the
production model.

Every test artifact or template bundle has a `ModelManifest` with its exact `artifactSha256`, byte
size, runtime and version, memory requirement, supported delegates, dimensions, and license ID.
Verify the checksum before preparation or generation. A checksum, runtime, memory, or delegate
mismatch must stop work with the contract-defined error; never silently fall back to another local
or remote artifact.

Use versioned synthetic or approved safe golden prompts, fixed seeds, dimensions, style preset IDs,
and fixture digests. Blocked raw prompts and production user prompts must not be placed in fixtures,
logs, wire captures, generated-asset records, screenshots, or evidence packages. Preserve only a
one-way prompt digest where the contract requires provenance.

## Current Scaffold Verification Commands

Run from the repository root before requesting review:

```powershell
npx expo install --check
npm run typecheck
npm run lint
npm test
npm run format:check
```

These commands preserve the current repository while the scaffold remains checked in. Record each
command, UTC time, source commit, tool versions, exit code, and complete output in CI. They are not
target release evidence. Once the Kotlin project exists, its checked-in Gradle build, static
analysis, unit, instrumentation, contract, golden, failure-recovery, and device tasks are required
in addition; do not imply they are covered by the scaffold TypeScript suite.

## Local Data Reset

The [Roadmap `XC-RESET` item](./ROADMAP.md#cross-cutting-workstreams) is the sole status source for
the production application ID, exact in-app reset route/action, literal ADB reset command, and
their acceptance evidence. This guide defines how contributors use that evidence; it does not
declare implementation status.

The current mock scaffold exposes a `/debug` **Clear Local Data** action (currently rendered as
`Xóa dữ liệu mô phỏng`) that calls the mock service's local-data clear operation and resets the mock
session/query cache. It is scaffold-only behavior: it does not implement the target gallery,
generated-asset, prompt-history, telemetry, safety-baseline, or rollback-protection lifecycle and
is not acceptance evidence.

The `XC-RESET` acceptance evidence must:

1. provide and test the exact production in-app reset route and action against
   [Safety and Privacy](./SAFETY_AND_PRIVACY.md#deletion-and-reset);
2. commit the production Android application ID; and
3. prove the in-app reset preserves `maximumAcceptedRevision` and both verified ruleset slots,
   rejects a bundled baseline below the floor, and remains fail closed until the unique connected
   refresh installs a qualifying signed package; and
4. update this section with that exact UI route/action and an executable command in place of the
   unresolved placeholder `adb shell pm clear <resolved.production.applicationId>`.

Do not run that placeholder and do not invent an application ID. Use only the literal command from
reviewed `XC-RESET` evidence; it must name the resolved production ID. Android app-storage clear or
uninstall/reinstall is used only when a test explicitly requires a destructive new install; it is
not evidence that the prior installation's app-private revision floor survived. Record the exact
operation because it also removes application state and may require model or Segmentation asset
delivery again. A clean-install run and an offline-after-install cold start are different cases and
must not be conflated.

Do not use the obsolete repository reset scripts for target application evidence; they address the
historical scaffold rather than the Android local-data contract.

## Common Failures

| Symptom                                                             | Required response                                                                                                                                                      |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current scaffold fails Expo dependency validation                   | Restore the lockfile installation with `npm ci`, run `npx expo install --check`, and review any intentional scaffold dependency update.                                |
| Current scaffold runs but target behavior is absent                 | Use the target Kotlin/Compose project after `W1-07`; the Expo scaffold cannot validate target application or on-device behavior.                                       |
| Target Kotlin or runtime-native changes are absent on device        | Rebuild and reinstall with the target project's checked-in Gradle workflow.                                                                                            |
| Device is not listed by `adb devices`                               | Reconnect the device, authorize USB debugging, and verify Android Platform Tools before rebuilding.                                                                    |
| Device fails the capability gate                                    | Confirm `DeviceCapabilities`; below-floor or runtime-incompatible devices are negative fixtures, not supported test devices.                                           |
| Model preparation reports an integrity or compatibility error       | Compare the exact `ModelManifest`, checksum, runtime, memory, and delegate evidence. Do not retry with an unnamed artifact.                                            |
| Local model import reports `LOCAL_MODEL_NOT_STAGED`                 | Install the development client, run `scripts/stage-local-model.ps1`, and tap **Install staged local model** again.                                                     |
| API 37.1 reports a missing first part after a direct `/sdcard` push | Use `scripts/stage-local-model.ps1`; Android 37.1 isolates shell-owned external files, so the helper stages them under the debug app identity.                         |
| Emulator reports `INSUFFICIENT_MEMORY`                              | Recreate or cold-boot the dedicated AVD with 8192 MB RAM; the real-model debug path does not lower the 6 GB gate.                                                      |
| Offline cold start fails after a successful install                 | Confirm all required application, model, and Segmentation assets were delivered before disabling connectivity; retain the failure and recovery trace.                  |
| A cancelled or crashed request leaves the app busy                  | Preserve the trace and storage state, verify temporary-file and active-request cleanup, then run the failure-recovery matrix. Do not clear data to conceal the defect. |

## Related Documents

- [PRD](./PRD_AI_Sticker_Generator.md)
- [Architecture](./ARCHITECTURE.md)
- [Integration Contracts](./INTEGRATION_CONTRACTS.md)
- [Week 1 Feasibility Spike](./FEASIBILITY_SPIKE.md)
- [Model Pipeline](./MODEL_PIPELINE.md)
- [User Flows](./USER_FLOWS.md)
- [Safety and Privacy](./SAFETY_AND_PRIVACY.md)
- [Testing and Release](./TESTING_AND_RELEASE.md)
- [Delivery Roadmap](./ROADMAP.md)

# Local Development

## Document Control

**Status:** Reproducible contributor workflow for the Android-first target release.

**Authority:** The [PRD](./PRD_AI_Sticker_Generator.md) is authoritative. This guide implements
the [Android release constraints](./PRD_AI_Sticker_Generator.md#constraints), the
[on-device architecture](./PRD_AI_Sticker_Generator.md#8-system-design--architecture), and the
[Week 1 feasibility workflow](./PRD_AI_Sticker_Generator.md#week-1--feasibility-spike--gono-go).
Native behavior and fixture vocabulary come from the
[Integration Contracts](./INTEGRATION_CONTRACTS.md).

**Current versus target:** The repository currently contains an Expo/TypeScript mock UI scaffold.
Its start scripts are useful for UI work, but the custom on-device inference bridge, selected
Plan A/B/C runtime, release Android application ID, and production build configuration have not
yet been implemented. Those scaffold commands are not evidence that native inference works. The
target workflow below becomes executable as the native bridge and build configuration land.

Expo version claims in this guide are bound to the official
[Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/),
[SDK 57 DevClient reference](https://docs.expo.dev/versions/v57.0.0/sdk/dev-client/),
[SDK 57 Expo Go library boundary](https://docs.expo.dev/versions/v57.0.0/sdk/third-party-overview/),
and [Expo CLI reference](https://docs.expo.dev/more/expo-cli/).

## Supported Host Setup

Use Windows, Linux, or macOS with:

- Git;
- Android Studio, an Android SDK, and a Java toolchain compatible with the checked-in Android
  project once that project exists;
- `adb` available from the Android SDK Platform Tools;
- npm and the Node.js version listed below; and
- a USB-debuggable physical Android device for native, performance, thermal, recovery, and release
  evidence.

An Android emulator may be used for layout, routing, and deterministic application tests. It does
not replace the representative physical-device evidence required by the
[PRD device floor](./PRD_AI_Sticker_Generator.md#constraints) or the
[feasibility device matrix](./FEASIBILITY_SPIKE.md#device-test-matrix).

## Required Versions

| Tool or framework | Required version                    | Source of truth                                                      |
| ----------------- | ----------------------------------- | -------------------------------------------------------------------- |
| Node.js           | `22.13.x` or newer                  | Expo SDK 57 minimum; CI and contributor machines must satisfy it     |
| Expo SDK          | `57.x` (`expo` currently `~57.0.7`) | `package.json` and the SDK 57 reference                              |
| React Native      | `0.86` (currently `0.86.0`)         | `package.json` and the SDK 57 reference                              |
| React             | `19.2.3`                            | `package.json` and the SDK 57 reference                              |
| npm dependencies  | Exact lockfile resolution           | `package-lock.json`; install with `npm ci`                           |
| Contract          | `1.0`                               | [Integration Contracts](./INTEGRATION_CONTRACTS.md#document-control) |

Expo SDK 57 targets React Native 0.86 and React 19.2.3 and requires Node.js 22.13.x at minimum.
The checked-in patch versions remain authoritative for this repository.

Do not replace the checked-in dependency versions with a generic latest version. Expo documents
that React Native packages must match the installed React Native/Expo combination; validate the
lockfile installation with `npx expo install --check`.

## Repository Setup

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

No environment variable or local service is required for the target core generation flow. After
installation, capability evaluation, prompt moderation, generation, Segmentation, persistence,
gallery access, and OS sharing are local as required by the
[offline guarantee](./USER_FLOWS.md#offline-guarantees).

## Expo Application Workflow

For the **current mock scaffold**, start Metro with:

```powershell
npm run start
```

The current `npm run android` script asks Expo CLI to open the scaffold on Android. Until the native
bridge and development-client configuration are committed, this is only a mock/UI loop and cannot
prove the target inference path.

For JavaScript/TypeScript changes after a development build has been installed, start Metro for the
development client with:

```powershell
npx expo start --dev-client
```

Use the same release-plan configuration, contract version, and model fixture identity as the work
being verified. Never substitute a web build or an Expo Go session for native bridge, model,
Segmentation, persistence, or device evidence.

## Android Development Build

The selected inference runtime requires a custom native module. Expo Go contains a fixed set of
native code and therefore cannot host that module. Once the bridge and development-client
configuration exist, install an Android development build on a connected device:

```powershell
adb devices
npx expo run:android --device
```

Expo CLI may generate the Android native directory when it is absent. Treat any generated native
changes as reviewable source: inspect them, do not commit secrets, and follow the repository's
chosen Continuous Native Generation policy. The first native build requires Android Studio and
Java to be installed and configured.

Rebuild the development binary after any change to native module code, config plugins, native
dependencies, Android configuration, bundled models, or the model/runtime adapter. A Metro reload
is sufficient only for code and assets that do not alter the native runtime.

Development builds are debugging tools, not release evidence by themselves. Performance, thermal,
install-size, offline cold-start, crash recovery, and Play acceptance tests use the exact
release-like or release-candidate binary named by the evidence package.

## Native Module Workflow

1. Read the [Application Generation Port](./INTEGRATION_CONTRACTS.md#application-generation-port),
   [Native Bridge Contract](./INTEGRATION_CONTRACTS.md#native-bridge-contract), and
   [Progress and Cancellation](./INTEGRATION_CONTRACTS.md#progress-and-cancellation) before
   changing the bridge.
2. Add or update a contract fixture before changing observable behavior. Run each affected fixture
   against every producer and every consumer; implementation-local tests do not replace consumer
   conformance.
3. Build and install a new Android development build. Record the source commit, build identifier,
   contract version, device, Android build, native runtime version, and selected delegate.
4. Verify one admitted request produces one correlated terminal result; invalid pre-admission
   requests produce the defined bridge error and no work.
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
logs, bridge captures, generated-asset records, screenshots, or evidence packages. Preserve only a
one-way prompt digest where the contract requires provenance.

## Verification Commands

Run from the repository root before requesting review:

```powershell
npx expo install --check
npm run typecheck
npm run lint
npm test
npm run format:check
```

These are the commands exposed by the current scaffold. Record each command, UTC time, source
commit, tool versions, exit code, and complete output in CI or the evidence package. As native and
device harnesses are added, run their documented contract, Android, golden, failure-recovery, and
device suites in addition to these commands; do not imply they are covered by the TypeScript suite.

## Local Data Reset

The target production reset is **not implemented yet**, and the repository has no production
Android application ID. Consequently, there is currently no reproducible target in-app reset
route/action and no valid target `adb` reset command. Target reset acceptance remains blocked until
both are implemented and documented.

The current mock scaffold exposes a `/debug` **Clear Local Data** action (currently rendered as
`Xóa dữ liệu mô phỏng`) that calls the mock service's local-data clear operation and resets the mock
session/query cache. It is scaffold-only behavior: it does not implement the target gallery,
generated-asset, prompt-history, telemetry, safety-baseline, or rollback-protection lifecycle and
is not acceptance evidence.

Before target reset tests can pass, the implementation change must:

1. provide and test the exact production in-app reset route and action against
   [Safety and Privacy](./SAFETY_AND_PRIVACY.md#deletion-and-reset);
2. commit the production Android application ID; and
3. update this section with that exact UI route/action and an executable command in place of the
   unresolved placeholder `adb shell pm clear <resolved.production.applicationId>`.

Do not run that placeholder and do not invent an application ID. The final documented `adb` command
must name the resolved production ID literally. Android app-storage clear or uninstall/reinstall is
used only when a test explicitly requires a clean install; record the exact operation because it
also removes application state and may require model or Segmentation asset delivery again. A
clean-install run and an offline-after-install cold start are different cases and must not be
conflated.

Do not use the obsolete repository reset scripts for target application evidence; they address the
historical scaffold rather than the Android local-data contract.

## Common Failures

| Symptom                                                       | Required response                                                                                                                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native inference module is unavailable in Expo Go             | Install and launch the Android development build; do not add a JavaScript fallback that bypasses the bridge.                                                           |
| Expo reports incompatible package versions                    | Restore the lockfile installation with `npm ci`, run `npx expo install --check`, and review any intentional dependency update.                                         |
| Metro runs but native changes are absent                      | Rebuild and reinstall the development binary; native changes are not delivered by a Metro reload.                                                                      |
| Device is not listed by `adb devices`                         | Reconnect the device, authorize USB debugging, and verify Android Platform Tools before rebuilding.                                                                    |
| Device fails the capability gate                              | Confirm `DeviceCapabilities`; below-floor or runtime-incompatible devices are negative fixtures, not supported test devices.                                           |
| Model preparation reports an integrity or compatibility error | Compare the exact `ModelManifest`, checksum, runtime, memory, and delegate evidence. Do not retry with an unnamed artifact.                                            |
| Offline cold start fails after a successful install           | Confirm all required application, model, and Segmentation assets were delivered before disabling connectivity; retain the failure and recovery trace.                  |
| A cancelled or crashed request leaves the app busy            | Preserve the trace and storage state, verify temporary-file and active-request cleanup, then run the failure-recovery matrix. Do not clear data to conceal the defect. |

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

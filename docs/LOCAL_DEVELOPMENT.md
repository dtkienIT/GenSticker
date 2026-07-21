# Local Development

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

| Symptom                                                       | Required response                                                                                                                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current scaffold fails Expo dependency validation             | Restore the lockfile installation with `npm ci`, run `npx expo install --check`, and review any intentional scaffold dependency update.                                |
| Current scaffold runs but target behavior is absent           | Use the target Kotlin/Compose project after `W1-07`; the Expo scaffold cannot validate target application or on-device behavior.                                       |
| Target Kotlin or runtime-native changes are absent on device  | Rebuild and reinstall with the target project's checked-in Gradle workflow.                                                                                            |
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

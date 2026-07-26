# GenSticker On-Device Architecture

> **Binding MVP architecture:** Expo SDK 57/React Native 0.86 owns UI and orchestration. The Android-only local Expo module at `modules/expo-sticker-runtime` owns DownloadManager setup, digest verification and atomic promotion, ONNX Runtime inference, ML Kit segmentation, cancellation, and temporary PNG creation. It runs only in a development build; Expo Go is unsupported. Model assets come from an immutable GitHub Release manifest and never enter Git.

## Document Control

**Purpose:** Define the Android-first target system boundaries and responsibilities for the on-device text-to-sticker release.

**Authority:** [`PRD_AI_Sticker_Generator.md`](./PRD_AI_Sticker_Generator.md), especially its scope, user-flow, system-design, and technology sections. This document is subordinate to the PRD and must be corrected if the two conflict.

**Scope:** The target release architecture. It distinguishes the current repository scaffold from the intended release and does not claim feasibility before the Week 1 spike records evidence in [`FEASIBILITY_SPIKE.md`](./FEASIBILITY_SPIKE.md).

**Last updated:** July 21, 2026

## Architectural Drivers

- Run the core text-to-sticker flow fully on-device after install, with no custom production backend ([PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope)).
- Ship Android first and support only devices that meet the PRD capability floor ([PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope)).
- Keep the user-visible pipeline simple: prompt, generation request, generated asset, transparent PNG, preview, save, and share.
- Preserve the fixed five-week delivery window with the PRD contingency plan: Plan A, Plan B, or Plan C is chosen from Week 1 evidence ([PRD § 11 Risk Register & Contingency Plan](./PRD_AI_Sticker_Generator.md#11-risk-register--contingency-plan)).
- Treat input safety, failure recovery, local asset ownership, and native sharing as architecture concerns rather than UI afterthoughts.

## Current Repository State

The current repository contains an Expo/TypeScript mock application with simulated generation and local placeholder assets. An unused FastAPI scaffold remains from an earlier prototype. Neither represents the target release architecture: the mock has no production on-device inference pipeline, and the historical scaffold is not a target release dependency.

## Target System Context

The release is an Android-first Kotlin application with a Jetpack Compose app shell, Room-backed gallery metadata, WorkManager-owned best-effort safety configuration sync, and an explicit on-device runtime boundary. The app invokes on-device safety, generation, segmentation, local asset, and platform-sharing capabilities through versioned observable behavior defined in [`INTEGRATION_CONTRACTS.md`](./INTEGRATION_CONTRACTS.md).

The Kotlin application depends on the abstract contract in `INTEGRATION_CONTRACTS.md`; it does not select a concrete inference implementation. The Week 1 feasibility spike chooses the runtime implementation based on evidence from representative supported devices. The architecture deliberately does not lock MediaPipe Image Generator, or any other candidate runtime, as the production path.

## Component Responsibilities

### App shell

The App shell renders prompt entry, loading, preview, gallery, supported-device messaging, and recovery UI. It owns presentation state and invokes contract-defined operations; it does not embed model-specific behavior.

### Capability gate

The Capability gate evaluates whether the device meets the supported floor and whether required local capabilities are ready. It runs before the generation experience, permits supported devices to continue, and provides the defined unsupported-device state otherwise.

### Safety filter

The Safety filter implements `PromptSafetyEvaluator` and evaluates the normalized prompt on-device before a `GenerationRequest` can exist. `SafetyEvaluationResult.Evaluated` wraps an allow or block policy decision. `SafetyEvaluationResult.Failed` represents unavailable/invalid rules or evaluator failure, fails closed without constructing a generation request, and exposes only safe retry after eligible-package recovery at or above `maximumAcceptedRevision`. An operational failure is never represented as a policy block and never logs the raw prompt. The fixed safety negative prompt is separate bundled runtime/model configuration applied internally after an allowed decision; it is never a request field or user-controlled. The filter does not perform output-image classification in this release.

### Generation orchestrator

The Generation orchestrator coordinates a permitted generation request, progress stages, cancellation, retries, error mapping, and handoff between the model runtime, segmentation, and asset repository. It isolates each stage so a failure has a recoverable user-visible result rather than destabilizing the application.

### Model runtime

The Model runtime executes the selected on-device generation path and produces a raw image. Its concrete native implementation, model format, delegate configuration, and compatibility rules remain behind the integration contract until the feasibility spike supplies evidence for the selected contingency plan.

### Segmentation

Segmentation converts raw model output into a subject cutout with transparent background. It reports progress stages and recoverable failures to the generation orchestrator, and it is evaluated against stylized output during the feasibility spike.

### Asset repository

The Asset repository implements `GalleryRepository`, owns local generated-asset files plus Room prompt-history/favorite metadata, and confines every resolved path to the app-owned asset root. It creates durable transparent PNG records, lists and retrieves gallery items without regeneration, and is the only component allowed to delete the asset, metadata, and prompt history together.

### Platform sharing

Platform sharing implements `PlatformAssetExporter` and exposes Android photo-library save and OS share-sheet operations for a resolved gallery asset. It distinguishes success, permission denial, cancellation, unavailable capability, and failure while leaving gallery ownership and contents intact for every outcome.

### Safety configuration sync worker

WorkManager owns the best-effort signed blocklist/config update path required by the [PRD patch channel](./PRD_AI_Sticker_Generator.md#patch-channel-for-post-launch-gaps). Periodic work uses the unique name `gensticker.safety-config.periodic`, `ExistingPeriodicWorkPolicy.UPDATE`, and `NetworkType.CONNECTED`. User/admin-triggered immediate checks use `gensticker.safety-config.immediate`, `ExistingWorkPolicy.KEEP`, and the same network constraint. The approved interval and backoff values remain configuration decisions; no exact run time is promised. Work persists across application process restarts and device reboots under WorkManager semantics. It requests only signed compatible revisions at or above `maximumAcceptedRevision`, verifies two next-generation app-private copies, and atomically commits the active/redundant pair plus the monotonic floor. If no qualifying local package remains, the unique connected request may restore safety later but generation stays failed closed until then.

## End-to-End Data Flow

```mermaid
flowchart TD
    CG[Capability gate] --> PUI[Prompt UI]
    PUI --> SF[Safety filter]
    SF --> GO[Generation orchestrator]
    GO --> MR[Model runtime]
    MR --> SEG[Segmentation]
    SEG --> PNG[Transparent PNG]
    PNG --> LG[Local gallery]
    LG --> SS[Save/share]
    WM[WorkManager safety-config sync] -. verified dual-slot rules at revision floor .-> SF
```

The Safety filter may stop a blocked prompt before the Generation orchestrator starts. For an allowed generation request, the orchestrator maps contract-defined progress stages and errors through generation and segmentation, then records the final transparent PNG generated asset in the local gallery for preview and platform sharing.

## Application-to-Runtime Boundary

The App shell communicates with the on-device capabilities through the abstract, versioned contract in [`INTEGRATION_CONTRACTS.md`](./INTEGRATION_CONTRACTS.md). The contract defines generation, progress, cancellation, safety evaluation, gallery list/get/delete, save/share, model-manifest, and generated-asset behavior without exposing a runtime implementation.

The Kotlin application and any runtime-native libraries contain platform-specific model execution, segmentation integration, local file handling needed by Android APIs, and save/share adapters. The boundary allows the Week 1 spike to evaluate candidate runtimes without forcing UI consumers to depend on a selected runtime's internal API.

## Storage and Asset Lifecycle

Generated assets remain on the device. After segmentation succeeds, the Asset repository persists a transparent PNG and its Room metadata as a gallery item. The metadata references, rather than duplicates, the generated-asset record and adds only item-local prompt history and favorite state. Preview reads that local record; save and share resolve its local reference through the repository; regeneration creates a distinct asset rather than mutating a prior successful result.

Deletion removes the local gallery metadata and associated local asset according to the privacy and lifecycle rules in [`SAFETY_AND_PRIVACY.md`](./SAFETY_AND_PRIVACY.md). No custom production backend owns generation history, image files, or gallery records.

## Failure Isolation and Recovery

Each pipeline stage reports contract-defined failures independently:

- Capability failures stop entry into generation and show the unsupported-device state.
- Safety blocks show a friendly rejection that does not reveal filter internals.
- Model-runtime failures expose retry, prompt-edit, cancellation, or contingency behavior as defined by the user flow.
- Segmentation failures prevent an incomplete asset from entering the gallery and offer the applicable recovery action.
- Gallery path violations fail closed without reading or deleting external paths; deletion reports success only after owned bytes, metadata, and prompt history are removed.
- Every photo-library save/share outcome preserves the existing gallery asset and reports its distinct contract subtype.
- Safety-evaluation operational failure enters the application failure path, starts no generation work, and recovers only through explicit retry after verification of a package at or above `maximumAcceptedRevision`; an older bundle cannot recover it.
- WorkManager sync retries transient failures with the approved backoff, never lowers the revision floor, and atomically replaces both verified slots only with a qualifying signed package; invalid candidates never replace them.

Best-effort non-core service failure does not block offline generation while an eligible verified safety package remains local. If every package at or above the floor is unreadable or corrupt, generation intentionally fails closed until recovery. Failure evidence, recovery behavior, and test coverage are specified in [`TESTING_AND_RELEASE.md`](./TESTING_AND_RELEASE.md).

## Capability Gate

The Capability gate enforces the [PRD's Android device floor](./PRD_AI_Sticker_Generator.md#5-scope): Snapdragon 7-series / Google Tensor G2-equivalent and above, plus runtime readiness required by the selected path. Its user-facing message must make unsupported status clear and must not expose a partial generation experience on devices below that floor.

The gate is a release boundary, not a performance optimization. Device capability criteria, measurement evidence, and the selected Plan A, Plan B, or Plan C remain governed by the PRD, feasibility spike, and roadmap.

## Explicit Non-Goals

The v1 exclusions below implement the [PRD's explicitly out-of-scope release boundaries](./PRD_AI_Sticker_Generator.md#explicitly-out-of-scope-this-release).

- No custom production backend or remote inference dependency for the core generation flow.
- No selfie generation, character profiles, or user-image upload pipeline.
- No sticker fusion or combination generation in this release.
- No iOS release work in this Android-first release.
- No native installable messenger sticker-pack integration; v1 uses native save and OS sharing.
- No output-image moderation or classifier in v1.
- No final native model runtime selection before Week 1 feasibility evidence.

## Related Documents

- [`PRD_AI_Sticker_Generator.md`](./PRD_AI_Sticker_Generator.md) — authoritative scope, constraints, and contingency policy.
- [`INTEGRATION_CONTRACTS.md`](./INTEGRATION_CONTRACTS.md) — versioned application-to-runtime observable behavior.
- [`FEASIBILITY_SPIKE.md`](./FEASIBILITY_SPIKE.md) — runtime selection evidence and contingency decision.
- [`MODEL_PIPELINE.md`](./MODEL_PIPELINE.md) — offline model preparation and runtime artifact provenance.
- [`SAFETY_AND_PRIVACY.md`](./SAFETY_AND_PRIVACY.md) — safety, local-data, deletion, and telemetry constraints.
- [`USER_FLOWS.md`](./USER_FLOWS.md) — user-visible transitions and recovery behavior.
- [`TESTING_AND_RELEASE.md`](./TESTING_AND_RELEASE.md) — validation evidence and release gates.
- [`ROADMAP.md`](./ROADMAP.md) — implementation status, ownership, blockers, and evidence.

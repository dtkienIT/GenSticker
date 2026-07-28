# GenSticker Integration Contracts

> **Binding MVP bridge:** `ExpoStickerRuntime` exposes `getCapabilities`, `getModelBundleState`, `startModelDownload`, `cancelModelDownload`, `prepareModel`, `generate`, idempotent `cancel`, `onModelDownloadProgress`, and `onGenerationProgress`. `GeneratedOutput.temporary` marks native scratch output, deleted only after durable gallery persistence. The Expo TypeScript adapter is normative for this MVP; mock mode requires an explicit development setting.

## Document Control

**Contract version:** `1.0`
**Document role:** Binding interface for the Android and iOS target release
**Authority:** [PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope), [PRD § 7 User Flow](./PRD_AI_Sticker_Generator.md#7-user-flow), [PRD § 8 System Design & Architecture](./PRD_AI_Sticker_Generator.md#8-system-design--architecture), [PRD § 9 Tech Stack & Design Justification](./PRD_AI_Sticker_Generator.md#9-tech-stack--design-justification), and [PRD § 10 Content Safety & Moderation](./PRD_AI_Sticker_Generator.md#10-content-safety--moderation).
**Architecture alignment:** [Architecture component responsibilities](./ARCHITECTURE.md#component-responsibilities) and [application-to-runtime boundary](./ARCHITECTURE.md#application-to-runtime-boundary).

This document is the single observable interface between the application, native runtime, model pipeline, local storage, safety, and QA workstreams. Implementations may change internally only when their behaviour remains compatible with this contract. The PRD remains authoritative if this contract conflicts with it.

Android reports `expo-sticker-runtime-onnx`; iOS reports `expo-sticker-runtime-coreml`. Both retain
the same request, readiness, progress, cancellation, generated-output, and model-lifecycle shapes
at contract version `1.0`.

## Contract Principles

- The core flow is on-device and remains usable without network access after install; no contract operation requires a custom production backend ([PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope)).
- The application depends on these versioned ports, never on a selected inference runtime or delegate ([PRD § 8 System Design & Architecture](./PRD_AI_Sticker_Generator.md#8-system-design--architecture)).
- Every cross-boundary request, response, event, manifest, and asset record carries or is governed by contract version `1.0`.
- The on-device runtime boundary reports observable state and stable error codes. It does not expose model prompts, raw images, delegate internals, or storage implementation details beyond the fields below.
- A successful generation creates one immutable, local, transparent PNG asset. Regeneration creates a different asset and never overwrites an earlier successful asset ([PRD § 7 User Flow](./PRD_AI_Sticker_Generator.md#7-user-flow)).
- V1 is Android-first; OS save and share use a local asset reference and do not transfer asset ownership ([PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope)).

## Ownership Matrix

| Contract area                                | Architecture components                              | Accountable owner | Required deliverable                                                                             |
| -------------------------------------------- | ---------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| Application contracts and generation port    | App shell, Capability gate, Generation orchestrator  | Mobile lead       | Kotlin types, request validation, UI error/progress mapping                                      |
| On-device runtime and generation wire        | Generation orchestrator, Model runtime, Segmentation | Native/ML lead    | Runtime adapter, wire mapping, model-readiness and execution behaviour                           |
| Model manifest and artifact provenance       | Model runtime                                        | Native/ML lead    | Signed-off `ModelManifest` for each shippable artifact                                           |
| Gallery persistence and deletion             | Asset repository                                     | Mobile lead       | `GalleryRepository`, confined paths, Room metadata, deletion outcomes                            |
| Platform save and share                      | Platform sharing                                     | Mobile lead       | `PlatformAssetExporter`, OS result mapping, asset-preservation tests                             |
| Safety evaluation and decisions              | Safety filter                                        | Safety owner      | `PromptSafetyEvaluator`, allow/block policy, fail-closed operational recovery, adversarial cases |
| Acceptance fixtures and compatibility checks | All components                                       | QA                | Versioned fixtures, conformance results, release evidence                                        |

The named accountable owner approves changes in its row; cross-row changes also require all affected producers and consumers. The product owner resolves PRD-scope conflicts.

The Kotlin declarations below are the normative target-application interfaces. Only generation crosses the selected runtime/process boundary and uses the language-neutral JSON envelopes defined below. Safety evaluation, Room-backed gallery access, deletion, save, and share are in-process Kotlin ports and require no JSON bridge. Any TypeScript adapter retained for the current Expo scaffold is non-normative and cannot own or redefine these contracts.

## Application Generation Port

**Binding PRD basis:** [PRD § 7 User Flow](./PRD_AI_Sticker_Generator.md#7-user-flow) requires prompt-to-preview generation, cancellation, recovery, and local save/share; [PRD § 8 System Design & Architecture](./PRD_AI_Sticker_Generator.md#8-system-design--architecture) requires an explicit on-device runtime boundary.

The target Kotlin application calls this port. A concrete TFLite, ONNX Runtime Mobile, or template adapter is an implementation detail.

```kotlin
const val CONTRACT_VERSION = "1.0"

interface StickerGenerationEngine {
    suspend fun getCapabilities(): DeviceCapabilities
    suspend fun prepareModel(request: PrepareModelRequest): ModelReadiness
    suspend fun generate(
        request: GenerationRequest,
        onProgress: (GenerationProgressEvent) -> Unit,
    ): GenerationResult
    suspend fun cancel(requestId: String): CancelResult
}
```

```kotlin
data class GenerationRequest(
    val contractVersion: String = CONTRACT_VERSION,
    val requestId: String,
    val prompt: String, // From SafetyEvaluationResult.Evaluated(SafetyDecision.Allowed) only.
    val stylePresetId: String,
    val seed: Long,
    val outputWidth: Int,
    val outputHeight: Int,
)

data class PrepareModelRequest(
    val contractVersion: String = CONTRACT_VERSION,
    val modelId: String,
    val modelVersion: String,
)

sealed interface ModelReadiness {
    val contractVersion: String
    val modelId: String
    val modelVersion: String
    val ready: Boolean
    val error: GenerationError?

    data class Ready(
        override val contractVersion: String = CONTRACT_VERSION,
        override val modelId: String,
        override val modelVersion: String,
    ) : ModelReadiness {
        override val ready: Boolean get() = true
        override val error: GenerationError? get() = null
    }

    data class NotReady(
        override val contractVersion: String = CONTRACT_VERSION,
        override val modelId: String,
        override val modelVersion: String,
        override val error: GenerationError,
    ) : ModelReadiness {
        override val ready: Boolean get() = false
    }
}

enum class DeviceSupportReasonCode(val wireValue: String) {
    SUPPORTED("SUPPORTED"),
    DEVICE_UNSUPPORTED("DEVICE_UNSUPPORTED"),
    RUNTIME_UNAVAILABLE("RUNTIME_UNAVAILABLE"),
    INSUFFICIENT_MEMORY("INSUFFICIENT_MEMORY"),
}

enum class UnsupportedDeviceReasonCode(val wireCode: DeviceSupportReasonCode) {
    DEVICE_UNSUPPORTED(DeviceSupportReasonCode.DEVICE_UNSUPPORTED),
    RUNTIME_UNAVAILABLE(DeviceSupportReasonCode.RUNTIME_UNAVAILABLE),
    INSUFFICIENT_MEMORY(DeviceSupportReasonCode.INSUFFICIENT_MEMORY),
}

sealed interface DeviceCapabilities {
    val contractVersion: String
    val supported: Boolean
    val reasonCode: DeviceSupportReasonCode
    val totalMemoryClassMb: Int
    val availableDelegates: List<AccelerationDelegate>
    val runtimeVersion: String

    data class Supported(
        override val contractVersion: String = CONTRACT_VERSION,
        override val totalMemoryClassMb: Int,
        override val availableDelegates: List<AccelerationDelegate>,
        override val runtimeVersion: String,
    ) : DeviceCapabilities {
        override val supported: Boolean get() = true
        override val reasonCode: DeviceSupportReasonCode get() = DeviceSupportReasonCode.SUPPORTED
    }

    data class Unsupported(
        override val contractVersion: String = CONTRACT_VERSION,
        val reason: UnsupportedDeviceReasonCode,
        override val totalMemoryClassMb: Int,
        override val availableDelegates: List<AccelerationDelegate>,
        override val runtimeVersion: String,
    ) : DeviceCapabilities {
        override val supported: Boolean get() = false
        override val reasonCode: DeviceSupportReasonCode get() = reason.wireCode
    }
}

enum class AccelerationDelegate { CPU, GPU, NNAPI, NPU }
```

`DeviceCapabilities.Supported` is available only when the device meets the Snapdragon 7-series or Google Tensor G2-equivalent-and-above floor plus selected-plan runtime readiness ([PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope)). The sealed types make a supported/non-`SUPPORTED` or ready/error contradiction unrepresentable. JSON serialization writes `reasonCode.wireValue` exactly, including uppercase `SUPPORTED`, `DEVICE_UNSUPPORTED`, `RUNTIME_UNAVAILABLE`, and `INSUFFICIENT_MEMORY`; it never relies on an enum serializer's default naming policy.

`requestId` identifies exactly one generation attempt and must be unique while that attempt is active. `prompt` is the Unicode-normalized, trimmed, non-empty value returned only by `SafetyEvaluationResult.Evaluated(SafetyDecision.Allowed)`; blocked input and operational safety-evaluation failure cannot create a `GenerationRequest`. The fixed safety negative prompt is bundled runtime/model safety configuration, is applied internally after an allowed decision, is not a `GenerationRequest` field, and is never user-controlled. V1 `outputWidth` and `outputHeight` must be positive integers, equal (square), and each less than or equal to both selected-manifest maximum bounds: `inputWidth` and `inputHeight`. Schema, normalization, seed, preset, and dimension validation failures return `INVALID_REQUEST`; they are never silently corrected or resized.

## On-Device Runtime Wire Contract

**Binding PRD basis:** [PRD § 8 System Design & Architecture](./PRD_AI_Sticker_Generator.md#8-system-design--architecture) keeps model execution and segmentation on device; [PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope) excludes remote inference.

The runtime adapter serializes port calls as versioned JSON envelopes. `generation.generate` emits zero or more `generation.progress` events and one final `generation.result`; all other operations emit one response. Fields use camelCase exactly as written.

| Envelope                                     | Required JSON fields                                                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `capabilities.get` request                   | `type`, compatible `contractVersion`, unique `commandId`                                                                                             |
| `model.prepare` request                      | `type`, unique `commandId`, `payload` containing compatible `contractVersion`, `modelId`, and `modelVersion`                                         |
| `generation.generate` request                | `type`, `payload` containing compatible `contractVersion`, `requestId`, `prompt`, `stylePresetId`, integer `seed`, `outputWidth`, and `outputHeight` |
| `generation.cancel` request                  | `type`, `payload` containing compatible `contractVersion` and `requestId`                                                                            |
| `generation.progress` event                  | `type`, `payload` matching `GenerationProgressEvent`                                                                                                 |
| `generation.result` event                    | `type`, `requestId`, `payload` matching `GenerationResult`; the envelope and payload request IDs must match                                          |
| `capabilities.get` response                  | `type`, `commandId`, `payload` matching `DeviceCapabilities`                                                                                         |
| `model.prepare` response                     | `type`, `commandId`, `payload` matching `ModelReadiness`                                                                                             |
| `generation.cancel` response                 | `type`, `requestId`, `payload` matching `CancelResult`                                                                                               |
| `generation.accepted` response               | `type`, compatible `contractVersion`, `requestId`                                                                                                    |
| `error` response for capability/model        | `type`, `command`, compatible `contractVersion`, `correlationId` equal to `commandId`, and `error`; omit `requestId`                                 |
| `error` response for generation/cancellation | `type`, `command`, compatible `contractVersion`, `correlationId` equal to `requestId`, matching `requestId`, and `error`                             |

Serialization writes computed Boolean discriminators for cancellation `accepted`, model `ready`, and capability `supported`; generation `status`, cancellation `outcome`, and capability `reasonCode` use their enum `wireValue` exactly. Deserialization selects the subtype from those discriminators and rejects missing, unknown, or contradictory discriminator/field combinations before work begins. `generation.generate` never contains the fixed safety negative prompt. Safety, gallery, deletion, photo-library save, and OS sharing remain in-process Kotlin calls and do not add wire commands.

Every wire command carries a compatible version string matching `^1\.\d+$`; the Kotlin application port continues to require exact `CONTRACT_VERSION` value `1.0`. The runtime adapter rejects an unsupported major or malformed version with `MODEL_INCOMPATIBLE`, then normalizes an accepted `1.x` payload into the internal `1.0` Kotlin type while ignoring unknown optional minor-version fields.

Every command can return the `error` response defined above. `generation.result.requestId` must equal `payload.requestId` and is present for both terminal success and failure.

`generation.generate` has one terminal transport rule. Before admission—version, schema, and dimension validation; unsupported device or model; or `GENERATION_BUSY`—it returns only a correlated `error` response and emits neither progress nor `generation.result`. Once admitted, it returns `generation.accepted` with the `requestId`, may emit progress, and terminates exactly once with `generation.result`. Timeout, cancellation, inference, segmentation, encoding, and storage failures after admission use a failed `GenerationResult`; they never produce a second `error` response. The `StickerGenerationEngine.generate` suspend function returns an immediate rejection as a failed `GenerationResult`, or returns from the single correlated terminal result after `generation.accepted`; it neither waits indefinitely nor returns twice. Only an allowed normalized prompt is serialized into `generation.generate`; a blocked prompt never reaches this boundary.

## Progress and Cancellation

**Binding PRD basis:** [PRD § 7 User Flow](./PRD_AI_Sticker_Generator.md#7-user-flow) requires visible generation, background removal, retry, and cancellation; [PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope) requires transparent-background stickers.

The only V1 progress order is:

```text
validating -> preparing_model -> generating -> removing_background -> encoding -> completed
```

```kotlin
enum class GenerationStage(val wireValue: String) {
    VALIDATING("validating"),
    PREPARING_MODEL("preparing_model"),
    GENERATING("generating"),
    REMOVING_BACKGROUND("removing_background"),
    ENCODING("encoding"),
    COMPLETED("completed"),
}

data class GenerationProgressEvent(
    val contractVersion: String = CONTRACT_VERSION,
    val requestId: String,
    val sequence: Int,
    val stage: GenerationStage,
    val stageProgress: Double, // Inclusive range: 0 through 1.
    val elapsedMs: Long, // Monotonic for a request.
)

enum class CancelOutcome(val wireValue: String) {
    CANCELLATION_REQUESTED("cancellation_requested"),
    ALREADY_CANCELLATION_REQUESTED("already_cancellation_requested"),
    ALREADY_CANCELLED("already_cancelled"),
    ALREADY_TERMINAL("already_terminal"),
    NOT_FOUND("not_found"),
}

enum class CancelRejectionReason(val outcome: CancelOutcome) {
    ALREADY_CANCELLATION_REQUESTED(CancelOutcome.ALREADY_CANCELLATION_REQUESTED),
    ALREADY_CANCELLED(CancelOutcome.ALREADY_CANCELLED),
    ALREADY_TERMINAL(CancelOutcome.ALREADY_TERMINAL),
    NOT_FOUND(CancelOutcome.NOT_FOUND),
}

sealed interface CancelResult {
    val contractVersion: String
    val requestId: String
    val accepted: Boolean
    val outcome: CancelOutcome

    data class CancellationRequested(
        override val contractVersion: String = CONTRACT_VERSION,
        override val requestId: String,
    ) : CancelResult {
        override val accepted: Boolean get() = true
        override val outcome: CancelOutcome get() = CancelOutcome.CANCELLATION_REQUESTED
    }

    data class Rejected(
        override val contractVersion: String = CONTRACT_VERSION,
        override val requestId: String,
        val reason: CancelRejectionReason,
    ) : CancelResult {
        override val accepted: Boolean get() = false
        override val outcome: CancelOutcome get() = reason.outcome
    }
}
```

For a successful request, the engine emits each exact stage once and only once in the listed order, ending with `completed`. The first event has `sequence: 1`; every later event increments `sequence` by exactly one. `elapsedMs` is a non-negative integer that never decreases. `stageProgress` is a finite number in the inclusive range `0` through `1`; `completed` has `stageProgress: 1`. A stage’s single event has no earlier event for that same stage, so stage progress cannot regress. `completed` is the last progress event and is emitted only for a successful result. Early failure or cancellation may emit only an ordered prefix of the stages and must never emit `completed`.

The first cancellation of an active request returns `accepted: true` with `cancellation_requested`. Repeated cancellation while cancellation is pending returns `accepted: false` with `already_cancellation_requested`; a repeated call after the cancelled terminal result returns `accepted: false` with `already_cancelled`. A call after another terminal result returns `accepted: false` with `already_terminal`; an unknown `requestId` returns `accepted: false` with `not_found`. These outcomes are idempotent and do not start additional work. A cancelled request resolves as a failed `GenerationResult` with `GENERATION_CANCELLED`, emits no later `completed` event, and leaves no gallery item.

## Model Manifest Contract

**Binding PRD basis:** [PRD § 9 Tech Stack & Design Justification](./PRD_AI_Sticker_Generator.md#9-tech-stack--design-justification) requires a selected on-device model runtime and bundled artifact; [PRD § 11 Risk Register & Contingency Plan](./PRD_AI_Sticker_Generator.md#11-risk-register--contingency-plan) requires compatibility evidence across device delegates.

```kotlin
data class ModelManifest(
    val manifestVersion: String,
    val modelId: String,
    val modelVersion: String,
    val runtime: String,
    val runtimeVersion: String,
    val quantization: String,
    val artifactSha256: String,
    val artifactBytes: Long,
    val minimumMemoryMb: Int,
    val supportedDelegates: List<AccelerationDelegate>,
    val inputWidth: Int,
    val inputHeight: Int,
    val licenseId: String,
)
```

The Week 1 feasibility evidence selects Plan A, Plan B, or Plan C; no production runtime is selected before that spike ([PRD § 11 Risk Register & Contingency Plan](./PRD_AI_Sticker_Generator.md#11-risk-register--contingency-plan)). The model pipeline publishes one manifest per exact selected-plan artifact. Before preparation or generation, the native/ML implementation verifies `artifactSha256`, runtime compatibility, memory requirement, and a usable delegate. It returns `MODEL_NOT_AVAILABLE`, `MODEL_INCOMPATIBLE`, or `INSUFFICIENT_MEMORY` as applicable. `inputWidth` and `inputHeight` are the V1 maximum bounds used to validate the square generation request.

For Plan C, `ModelManifest` remains the compatibility adapter for the local template bundle: `modelId` is exactly `template-fallback`; `runtime` is exactly `template-bundle`; `runtimeVersion` identifies the adapter version; `quantization` is exactly `none`; `artifactSha256`, `artifactBytes`, and `licenseId` describe the local template bundle; and dimensions describe the bundle’s supported square output. In Plan C, `prepareModel` prepares and verifies that local template bundle instead of an inference artifact, while preserving the same readiness, progress, error, asset, and cancellation semantics.

## Generated Asset Contract

**Binding PRD basis:** [PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope) requires local save/share rather than sticker-pack integration; [PRD § 7 User Flow](./PRD_AI_Sticker_Generator.md#7-user-flow) requires transparent PNG output and a persistent gallery.

```kotlin
data class GeneratedAsset(
    val assetId: String,
    val requestId: String,
    val localUri: String,
    val mimeType: String, // Must equal "image/png".
    val width: Int,
    val height: Int,
    val byteSize: Long,
    val sha256: String,
    val createdAt: String, // ISO 8601 UTC timestamp.
    val promptDigest: String,
    val modelId: String,
    val modelVersion: String,
    val seed: Long,
)

enum class GenerationResultStatus(val wireValue: String) {
    SUCCEEDED("succeeded"),
    FAILED("failed"),
}

sealed interface GenerationResult {
    val contractVersion: String
    val requestId: String
    val status: GenerationResultStatus

    data class Succeeded(
        override val contractVersion: String = CONTRACT_VERSION,
        override val requestId: String,
        val asset: GeneratedAsset,
    ) : GenerationResult {
        override val status: GenerationResultStatus get() = GenerationResultStatus.SUCCEEDED
    }

    data class Failed(
        override val contractVersion: String = CONTRACT_VERSION,
        override val requestId: String,
        val error: GenerationError,
    ) : GenerationResult {
        override val status: GenerationResultStatus get() = GenerationResultStatus.FAILED
    }
}
```

Only the Asset repository creates a `GeneratedAsset`; it does so after successful encoding and durable local persistence. `assetId` is immutable and unique, `localUri` is app-local, and `sha256` verifies the encoded PNG bytes. For a succeeded result, `GenerationResult.requestId` must equal `asset.requestId`. `promptDigest` is a one-way digest of the normalized allowed prompt and is retained for provenance; raw prompts are not stored in the asset record. Save/share consumers receive `assetId` or the resolved `localUri` and may not delete or mutate the asset.

## Gallery Repository Contract

**Binding PRD basis:** [PRD § 7 User Flow](./PRD_AI_Sticker_Generator.md#7-user-flow) requires a persistent local gallery; [PRD § 9 Application Stack](./PRD_AI_Sticker_Generator.md#application-stack-client) requires Room metadata with prompt text, timestamps, and favorite state.

```kotlin
interface GalleryRepository {
    suspend fun listGalleryItems(): ListGalleryItemsResult
    suspend fun getGalleryItem(assetId: String): GetGalleryItemResult
    suspend fun deleteGalleryItem(assetId: String): DeleteGalleryItemResult
}

data class LocalPromptHistory(
    val promptText: String,
    val submittedAt: String, // ISO 8601 UTC timestamp.
)

data class GalleryItem(
    val asset: GeneratedAsset,
    val promptHistory: LocalPromptHistory,
    val favorited: Boolean,
)

enum class GalleryOutcome(val wireValue: String) {
    SUCCEEDED("succeeded"),
    FOUND("found"),
    DELETED("deleted"),
    NOT_FOUND("not_found"),
    PATH_CONFINEMENT_REJECTED("path_confinement_rejected"),
    FAILED("failed"),
}

enum class GalleryFailureCode {
    READ_FAILED,
    DELETE_FAILED,
    METADATA_CORRUPT,
}

data class GalleryFailure(
    val code: GalleryFailureCode,
    val message: String,
    val retryable: Boolean,
)

sealed interface ListGalleryItemsResult {
    val outcome: GalleryOutcome

    data class Succeeded(val items: List<GalleryItem>) : ListGalleryItemsResult {
        override val outcome: GalleryOutcome get() = GalleryOutcome.SUCCEEDED
    }

    data class PathConfinementRejected(val assetId: String) : ListGalleryItemsResult {
        override val outcome: GalleryOutcome get() = GalleryOutcome.PATH_CONFINEMENT_REJECTED
    }

    data class Failed(val failure: GalleryFailure) : ListGalleryItemsResult {
        override val outcome: GalleryOutcome get() = GalleryOutcome.FAILED
    }
}

sealed interface GetGalleryItemResult {
    val assetId: String
    val outcome: GalleryOutcome

    data class Found(val item: GalleryItem) : GetGalleryItemResult {
        override val assetId: String get() = item.asset.assetId
        override val outcome: GalleryOutcome get() = GalleryOutcome.FOUND
    }

    data class NotFound(override val assetId: String) : GetGalleryItemResult {
        override val outcome: GalleryOutcome get() = GalleryOutcome.NOT_FOUND
    }

    data class PathConfinementRejected(override val assetId: String) : GetGalleryItemResult {
        override val outcome: GalleryOutcome get() = GalleryOutcome.PATH_CONFINEMENT_REJECTED
    }

    data class Failed(
        override val assetId: String,
        val failure: GalleryFailure,
    ) : GetGalleryItemResult {
        override val outcome: GalleryOutcome get() = GalleryOutcome.FAILED
    }
}

sealed interface DeleteGalleryItemResult {
    val assetId: String
    val outcome: GalleryOutcome

    data class Deleted(override val assetId: String) : DeleteGalleryItemResult {
        override val outcome: GalleryOutcome get() = GalleryOutcome.DELETED
    }

    data class NotFound(override val assetId: String) : DeleteGalleryItemResult {
        override val outcome: GalleryOutcome get() = GalleryOutcome.NOT_FOUND
    }

    data class PathConfinementRejected(override val assetId: String) : DeleteGalleryItemResult {
        override val outcome: GalleryOutcome get() = GalleryOutcome.PATH_CONFINEMENT_REJECTED
    }

    data class Failed(
        override val assetId: String,
        val failure: GalleryFailure,
    ) : DeleteGalleryItemResult {
        override val outcome: GalleryOutcome get() = GalleryOutcome.FAILED
    }
}
```

`GalleryItem` references one `GeneratedAsset`; it does not duplicate asset fields. Room owns only the item-local prompt history and favorite state around that asset. Before list, read, export, share, or deletion, the repository canonicalizes the resolved asset path and requires it to remain inside the app-owned asset root. A missing identifier returns the applicable `NotFound`; a traversal or symlink escape returns `PathConfinementRejected` and performs no read or deletion. `Deleted` is returned only after the owned PNG, Room metadata, and prompt history are all removed. A partial filesystem/database failure returns `Failed`, never `Deleted`, and must be reconciled before the item can be reported as successfully removed.

## Platform Asset Export Contract

**Binding PRD basis:** [PRD § 5 Deployable Release Scope](./PRD_AI_Sticker_Generator.md#deployable-release-scope-5-weeks--fixed-deadline) and [PRD § 7 User Flow](./PRD_AI_Sticker_Generator.md#7-user-flow) require external save and operating-system sharing without native sticker-pack installation.

```kotlin
interface PlatformAssetExporter {
    suspend fun saveToPhotoLibrary(assetId: String): PhotoLibrarySaveResult
    suspend fun shareAsset(assetId: String): ShareResult
}

enum class AssetExportOutcome(val wireValue: String) {
    SUCCEEDED("succeeded"),
    PERMISSION_DENIED("permission_denied"),
    CANCELLED("cancelled"),
    UNAVAILABLE("unavailable"),
    FAILED("failed"),
}

enum class PhotoLibrarySaveFailureCode(val wireValue: String) {
    ASSET_NOT_FOUND("asset_not_found"),
    PATH_INVALID("path_invalid"),
    STORAGE_UNAVAILABLE("storage_unavailable"),
    WRITE_FAILED("write_failed"),
}

enum class ShareFailureCode(val wireValue: String) {
    ASSET_NOT_FOUND("asset_not_found"),
    PATH_INVALID("path_invalid"),
    ASSET_READ_FAILED("asset_read_failed"),
    SHARE_INVOCATION_FAILED("share_invocation_failed"),
}

sealed interface PhotoLibrarySaveResult {
    val assetId: String
    val outcome: AssetExportOutcome

    data class Succeeded(override val assetId: String) : PhotoLibrarySaveResult {
        override val outcome: AssetExportOutcome get() = AssetExportOutcome.SUCCEEDED
    }

    data class PermissionDenied(override val assetId: String) : PhotoLibrarySaveResult {
        override val outcome: AssetExportOutcome get() = AssetExportOutcome.PERMISSION_DENIED
    }

    data class Cancelled(override val assetId: String) : PhotoLibrarySaveResult {
        override val outcome: AssetExportOutcome get() = AssetExportOutcome.CANCELLED
    }

    data class Unavailable(override val assetId: String) : PhotoLibrarySaveResult {
        override val outcome: AssetExportOutcome get() = AssetExportOutcome.UNAVAILABLE
    }

    data class Failed(
        override val assetId: String,
        val code: PhotoLibrarySaveFailureCode,
        val safeMessage: String,
        val retryable: Boolean,
    ) : PhotoLibrarySaveResult {
        override val outcome: AssetExportOutcome get() = AssetExportOutcome.FAILED
    }
}

sealed interface ShareResult {
    val assetId: String
    val outcome: AssetExportOutcome

    data class Succeeded(override val assetId: String) : ShareResult {
        override val outcome: AssetExportOutcome get() = AssetExportOutcome.SUCCEEDED
    }

    data class PermissionDenied(override val assetId: String) : ShareResult {
        override val outcome: AssetExportOutcome get() = AssetExportOutcome.PERMISSION_DENIED
    }

    data class Cancelled(override val assetId: String) : ShareResult {
        override val outcome: AssetExportOutcome get() = AssetExportOutcome.CANCELLED
    }

    data class Unavailable(override val assetId: String) : ShareResult {
        override val outcome: AssetExportOutcome get() = AssetExportOutcome.UNAVAILABLE
    }

    data class Failed(
        override val assetId: String,
        val code: ShareFailureCode,
        val safeMessage: String,
        val retryable: Boolean,
    ) : ShareResult {
        override val outcome: AssetExportOutcome get() = AssetExportOutcome.FAILED
    }
}
```

Both operations resolve the asset through `GalleryRepository` and enforce the same path confinement before invoking an Android platform API. A repository `NotFound` maps to the operation-specific `ASSET_NOT_FOUND` failure code, and `PathConfinementRejected` maps to `PATH_INVALID`; neither is platform `Unavailable` or export success. Photo-library storage absence and write failure use only `PhotoLibrarySaveFailureCode.STORAGE_UNAVAILABLE` and `WRITE_FAILED`. Share-side read and invocation failures use only `ShareFailureCode.ASSET_READ_FAILED` and `SHARE_INVOCATION_FAILED`. Kotlin therefore cannot construct a photo-save failure with a share-only code or a share failure with a save-only code. `PermissionDenied`, `Cancelled`, and `Unavailable` remain dedicated result subtypes for their platform outcomes. Every outcome—including success—leaves the original gallery asset, Room metadata, prompt history, and ownership intact. These ports are in-process Kotlin calls and have no JSON wire envelope; the `wireValue` strings are stable diagnostic/fixture tokens rather than runtime JSON commands.

## Safety Decision Contract

**Binding PRD basis:** [PRD § 10 Content Safety & Moderation](./PRD_AI_Sticker_Generator.md#10-content-safety--moderation) requires on-device input filtering before generation and a friendly non-revealing rejection.

```kotlin
interface PromptSafetyEvaluator {
    suspend fun evaluate(request: PromptSafetyRequest): SafetyEvaluationResult
}

data class PromptSafetyRequest(
    val contractVersion: String = CONTRACT_VERSION,
    val requestId: String,
    val normalizedPrompt: String,
)

enum class SafetyDecisionKind(val wireValue: String) {
    ALLOWED("allowed"),
    BLOCKED("blocked"),
}

enum class SafetyBlockReasonCode(val wireValue: String) {
    PROMPT_BLOCKED("prompt_blocked"),
}

sealed interface SafetyDecision {
    val contractVersion: String
    val requestId: String
    val decision: SafetyDecisionKind

    data class Allowed(
        override val contractVersion: String = CONTRACT_VERSION,
        override val requestId: String,
        val normalizedPrompt: String,
    ) : SafetyDecision {
        override val decision: SafetyDecisionKind get() = SafetyDecisionKind.ALLOWED
    }

    data class Blocked(
        override val contractVersion: String = CONTRACT_VERSION,
        override val requestId: String,
        val reasonCode: SafetyBlockReasonCode = SafetyBlockReasonCode.PROMPT_BLOCKED,
    ) : SafetyDecision {
        override val decision: SafetyDecisionKind get() = SafetyDecisionKind.BLOCKED
    }
}

enum class SafetyEvaluationOutcome(val wireValue: String) {
    EVALUATED("evaluated"),
    FAILED("failed"),
}

enum class SafetyEvaluationFailureCode(
    val wireValue: String,
    val retryable: Boolean,
) {
    RULESET_UNAVAILABLE("ruleset_unavailable", true),
    RULESET_INVALID_OR_CORRUPT("ruleset_invalid_or_corrupt", true),
    EVALUATOR_FAILED("evaluator_failed", true),
}

data class SafetyEvaluationFailure(
    val code: SafetyEvaluationFailureCode,
    val safeMessage: String, // Safe for user display; no raw prompt, ruleset detail, or exception text.
) {
    val retryable: Boolean get() = code.retryable
}

sealed interface SafetyEvaluationResult {
    val contractVersion: String
    val requestId: String
    val outcome: SafetyEvaluationOutcome

    data class Evaluated(
        val decision: SafetyDecision,
    ) : SafetyEvaluationResult {
        override val contractVersion: String get() = decision.contractVersion
        override val requestId: String get() = decision.requestId
        override val outcome: SafetyEvaluationOutcome get() = SafetyEvaluationOutcome.EVALUATED
    }

    data class Failed(
        override val contractVersion: String = CONTRACT_VERSION,
        override val requestId: String,
        val failure: SafetyEvaluationFailure,
    ) : SafetyEvaluationResult {
        override val outcome: SafetyEvaluationOutcome get() = SafetyEvaluationOutcome.FAILED
    }
}
```

The application Unicode-normalizes and trims the prompt, then calls `PromptSafetyEvaluator.evaluate` before it can create a `GenerationRequest`. An empty normalized prompt is invalid. `SafetyEvaluationResult.Evaluated` wraps exactly one policy decision: `SafetyDecision.Allowed` returns the exact normalized value that generation may use, while `SafetyDecision.Blocked` uses only the dedicated `SafetyBlockReasonCode`. A block cannot carry `UNKNOWN_ERROR` or any general generation error.

`SafetyEvaluationResult.Failed` represents an operational inability to evaluate policy and can never be mistaken for a policy block. It creates no `GenerationRequest`, runtime payload, progress, generated asset, or gallery item and logs no raw prompt. It enters the user-visible `failed` state with only `safeMessage` and the recovery below; it never enters `blocked` and never maps to `GenerationError`.

`maximumAcceptedRevision` is the monotonic safety-ruleset floor. App-private rollback-protected storage maintains two independently readable copies of the complete signed package at that floor: one active slot and one redundant last-valid slot. To activate revision `r`, the app first requires `r >= maximumAcceptedRevision` and `r >= buildMinimumRevision`, verifies compatibility, expiry, signature, and payload digest, writes the package to both next-generation slots, rereads and verifies each copy, then atomically commits the active/redundant slot manifest and raises `maximumAcceptedRevision` to `r`. A crash before that commit leaves the previous verified pair and floor active. A backup is never promoted until its signature and digest are reverified.

On active-slot corruption, the app may promote only a readable, verified, compatible redundant package whose revision equals `maximumAcceptedRevision`; a verified compatible package above the floor is promoted only through the same atomic commit while raising the floor. The bundled baseline is another signed candidate, not a rollback exception: it may activate only when its revision is at least `maximumAcceptedRevision` and the build minimum. An app update may ship a newer signed bundled baseline and atomically raise the build minimum and `maximumAcceptedRevision`, but it never lowers either value.

| Failure code                                                | Fixed retryable | Fail-closed application recovery                                                                                                                                                                           |
| ----------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RULESET_UNAVAILABLE` / `ruleset_unavailable`               | `true`          | Verify a redundant or bundled package at or above `maximumAcceptedRevision`; if none exists, remain failed closed and request the unique connected WorkManager refresh for revision at or above the floor. |
| `RULESET_INVALID_OR_CORRUPT` / `ruleset_invalid_or_corrupt` | `true`          | Quarantine the corrupt active copy, verify/promote only an eligible redundant or bundled package, and otherwise remain failed closed while WorkManager seeks a qualifying signed revision.                 |
| `EVALUATOR_FAILED` / `evaluator_failed`                     | `true`          | Keep the current verified active package, offer one clean evaluator retry, and reverify the redundant copy before any promotion if the operational failure repeats.                                        |

If no readable verified compatible package at or above `maximumAcceptedRevision` exists, safety evaluation remains failed closed even offline: the application creates no `GenerationRequest` and shows a safe retry message until a qualifying signed package is installed. WorkManager may restore service when connectivity returns, but cannot lower the requested floor. Reset never lowers or purges the floor. The evaluator is an in-process Kotlin port with no JSON wire envelope. Failure-code `wireValue` strings are stable diagnostic and fixture tokens only; diagnostics exclude the prompt and filter internals.

After `SafetyEvaluationResult.Evaluated(SafetyDecision.Allowed)`, the runtime applies the fixed safety negative prompt internally from the bundled, versioned model/safety configuration. The negative prompt is not accepted by `PromptSafetyRequest` or `GenerationRequest`, never appears in a wire payload, and is never displayed or user-controlled. V1 does not add output-image moderation ([PRD § 10 Content Safety & Moderation](./PRD_AI_Sticker_Generator.md#10-content-safety--moderation)).

## Error Taxonomy

**Binding PRD basis:** [PRD § 7 User Flow](./PRD_AI_Sticker_Generator.md#7-user-flow) requires recoverable user-visible failure states; [PRD § 11 Risk Register & Contingency Plan](./PRD_AI_Sticker_Generator.md#11-risk-register--contingency-plan) names device, memory, model, segmentation, and safety risks.

```kotlin
enum class GenerationErrorCode {
    INVALID_REQUEST,
    DEVICE_UNSUPPORTED,
    MODEL_NOT_AVAILABLE,
    MODEL_INCOMPATIBLE,
    INSUFFICIENT_MEMORY,
    GENERATION_BUSY,
    GENERATION_TIMEOUT,
    GENERATION_CANCELLED,
    INFERENCE_FAILED,
    SEGMENTATION_FAILED,
    ASSET_ENCODING_FAILED,
    ASSET_STORAGE_FAILED,
    UNKNOWN_ERROR,
}

data class GenerationError(
    val contractVersion: String = CONTRACT_VERSION,
    val code: GenerationErrorCode,
    val message: String, // Safe for user display; no raw prompt or internal rule detail.
    val retryable: Boolean,
)
```

These codes are stable generation identifiers, not user-facing copy. `INVALID_REQUEST` is returned for invalid request schema, normalized prompt, seed, style preset, or dimensions. Safety policy blocks use `SafetyBlockReasonCode.PROMPT_BLOCKED`, and operational safety failures use `SafetyEvaluationFailureCode`; neither is a `GenerationError`. `GENERATION_CANCELLED` is the required terminal error for a cancellation. `SEGMENTATION_FAILED`, `ASSET_ENCODING_FAILED`, and `ASSET_STORAGE_FAILED` must not leave a gallery item. Save/share uses the dedicated platform-export result types above. Failures without a stable more-specific generation mapping use `UNKNOWN_ERROR`.

## Compatibility and Versioning

**Binding PRD basis:** [PRD § 11 Risk Register & Contingency Plan](./PRD_AI_Sticker_Generator.md#11-risk-register--contingency-plan) allows runtime contingency changes while preserving the release’s observable user flow.

Contract versions use semantic versioning: `MAJOR.MINOR`. This document defines `1.0`. The current producer emits the exact `CONTRACT_VERSION` value `1.0`; the wire parser accepts same-major `1.x` values only when they match `^1\.\d+$`, parse as a finite non-negative integer minor, and do not require unknown fields. A future `1.x` document publishes its own exact producer value while retaining this same-major parser rule.

- Additive optional fields are minor-compatible and consumers must ignore unknown optional fields.
- Removed fields, renamed fields, changed meanings, or reordered required progress semantics require a major version.
- A producer must not emit a new major version to an older consumer. Consumers reject malformed or unsupported-major versions before work starts with `MODEL_INCOMPATIBLE`.
- Runtime, model artifact, delegate, and implementation substitutions may occur without a contract version change only if every `1.0` observable behaviour, manifest field, error mapping, and fixture result remains compatible.
- The `contractVersion` sent by a request and returned by a response/event/result identifies the version actually used; it is never inferred from app build number or model version.

## Contract Test Fixtures

**Binding PRD basis:** [PRD § 12 Development Plan & Timeline](./PRD_AI_Sticker_Generator.md#12-development-plan--timeline) requires device-matrix validation, adversarial safety testing, and end-to-end pipeline evidence before release.

QA owns and versions these fixtures under the contract version. Every producer runs the applicable fixture before integration; every consumer asserts the listed observable outcome.

| Fixture ID                           | Input / setup                                                                                                                                                 | Required observable outcome                                                                                                                                                                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `capabilities-supported-1.0`         | Snapdragon 7-series or Tensor G2-equivalent-and-above device; compatible ready manifest                                                                       | `supported: true`, exact wire token `reasonCode: "SUPPORTED"`, usable delegate, runtime version, and no generation error                                                                                                                                                            |
| `capabilities-unsupported-1.0`       | Below-floor or unavailable runtime device                                                                                                                     | `supported: false` with exact `reasonCode.wireValue` token `"DEVICE_UNSUPPORTED"`, `"RUNTIME_UNAVAILABLE"`, or `"INSUFFICIENT_MEMORY"`; generation does not start                                                                                                                   |
| `safety-allowed-1.0`                 | Valid `PromptSafetyRequest` accepted by the local policy                                                                                                      | One request-correlated `SafetyEvaluationResult.Evaluated(SafetyDecision.Allowed)` with the exact normalized prompt; only then may a `GenerationRequest` be constructed                                                                                                              |
| `allowed-generation-1.0`             | Allowed normalized prompt, positive square in-bounds dimensions, fixed seed                                                                                   | Request contains no negative-prompt field; runtime applies the bundled fixed safety negative prompt exactly once; each stage occurs once through `completed`; result is `GenerationResult.Succeeded` with valid transparent PNG and matching provenance                             |
| `invalid-request-1.0`                | Empty/invalid normalized prompt, invalid seed/preset, or non-positive/non-square/out-of-bounds dimensions                                                     | Correlated wire `error` response with `INVALID_REQUEST`; no inference, progress, `generation.result`, or gallery item                                                                                                                                                               |
| `blocked-prompt-1.0`                 | `PromptSafetyRequest` classified as blocked                                                                                                                   | `SafetyEvaluationResult.Evaluated(SafetyDecision.Blocked)` with only `SafetyBlockReasonCode.PROMPT_BLOCKED`; no `GenerationRequest`, runtime payload, raw-prompt log, progress, or gallery item                                                                                     |
| `safety-evaluation-failure-1.0`      | Inject unavailable, invalid/corrupt ruleset, then evaluator exception                                                                                         | Matching `SafetyEvaluationResult.Failed` code/wire token for all three causes; enter `failed`, never `blocked`; no request/runtime work/gallery item/raw-prompt log; only a verified package at or above `maximumAcceptedRevision` can restore evaluation                           |
| `safety-revision-floor-recovery-1.0` | Corrupt active with valid redundant copy at floor; then corrupt both with bundled baseline below floor; then deliver signed compatible package at/above floor | Verified redundant copy at the floor is promoted and generation can resume after explicit reevaluation; older bundle is rejected and remains fail closed offline; unique WorkManager fetch installs the qualifying package through dual-slot atomic commit and later retry succeeds |
| `cancel-generation-1.0`              | Cancel during `generating`; repeat while pending and after cancellation                                                                                       | `generation.accepted`; first result `accepted: true/cancellation_requested`; repeats report `false/already_cancellation_requested` then `false/already_cancelled`; one request-correlated failed result `GENERATION_CANCELLED`, no later `completed`, and no gallery item           |
| `model-incompatible-1.0`             | Runtime or artifact mismatch                                                                                                                                  | Correlated wire `error` response with `MODEL_INCOMPATIBLE`; inference, progress, and `generation.result` do not start                                                                                                                                                               |
| `segmentation-failure-1.0`           | Injected segmentation failure                                                                                                                                 | `SEGMENTATION_FAILED`, no encoded asset or gallery item                                                                                                                                                                                                                             |
| `asset-storage-failure-1.0`          | Injected persistence failure after encoding                                                                                                                   | `ASSET_STORAGE_FAILED`, no gallery item                                                                                                                                                                                                                                             |
| `gallery-list-get-1.0`               | Two confined assets plus Room prompt history and favorite metadata                                                                                            | `listGalleryItems` returns two `GalleryItem` values without duplicating `GeneratedAsset`; `getGalleryItem` returns `Found`; unknown ID returns `NotFound`                                                                                                                           |
| `gallery-path-rejected-1.0`          | Gallery metadata resolves outside the owned root through traversal or symlink                                                                                 | List/get/delete returns `PathConfinementRejected`; no external bytes are read or deleted                                                                                                                                                                                            |
| `gallery-delete-1.0`                 | Existing item, repeated deletion, and injected filesystem/database failure                                                                                    | First call returns `Deleted` only after PNG/metadata/history removal; repeat returns `NotFound`; injected partial failure returns `Failed`, never `Deleted`, and is reconciled                                                                                                      |
| `photo-save-outcomes-1.0`            | Persisted asset plus missing/path-invalid/storage-unavailable/write-failure injections and each platform outcome                                              | `saveToPhotoLibrary` returns fixed `PhotoLibrarySaveResult` subtypes; `Failed` uses only `asset_not_found`, `path_invalid`, `storage_unavailable`, or `write_failed`; the gallery item remains intact in every case                                                                 |
| `share-outcomes-1.0`                 | Persisted asset plus missing/path-invalid/read/invocation-failure injections and each platform outcome                                                        | `shareAsset` returns fixed `ShareResult` subtypes; `Failed` uses only `asset_not_found`, `path_invalid`, `asset_read_failed`, or `share_invocation_failed`; the gallery item remains intact in every case                                                                           |

Fixtures contain synthetic or approved safe prompts only. They must not contain a blocked raw prompt, production user prompt, or unlicensed model artifact.

## Change Procedure

**Binding PRD basis:** [PRD § 11 Risk Register & Contingency Plan](./PRD_AI_Sticker_Generator.md#11-risk-register--contingency-plan) makes the Plan A/B/C decision and release roadmap evidence-based; [PRD § 12 Development Plan & Timeline](./PRD_AI_Sticker_Generator.md#12-development-plan--timeline) fixes the five-week delivery and test gates.

Before any contract change is implemented, the change request must list:

1. Contract version and a precise description of the changed observable behaviour.
2. All producers and consumers.
3. Added, changed, and retired acceptance fixtures, plus expected conformance results.
4. Migration steps, including compatibility window and rollback path.
5. Roadmap impact, including Plan A/B/C, device-matrix, safety, schedule, and release-gate effects where applicable.
6. Required approvals: accountable owners in the Ownership Matrix, QA for fixture changes, Safety owner for safety-impacting changes, and product owner for PRD-scope or roadmap changes.

The mobile lead records the compatibility classification. The Native/ML lead verifies runtime-adapter and wire conformance. QA publishes fixture results before integration. No breaking change ships without a major contract version, an approved migration, and passing fixtures for every supported consumer.

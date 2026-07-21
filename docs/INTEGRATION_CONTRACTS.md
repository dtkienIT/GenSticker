# GenSticker Integration Contracts

## Document Control

**Contract version:** `1.0`
**Status:** Binding interface for the Android-first target release
**Authority:** [PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope), [PRD § 7 User Flow](./PRD_AI_Sticker_Generator.md#7-user-flow), [PRD § 8 System Design & Architecture](./PRD_AI_Sticker_Generator.md#8-system-design--architecture), [PRD § 9 Tech Stack & Design Justification](./PRD_AI_Sticker_Generator.md#9-tech-stack--design-justification), and [PRD § 10 Content Safety & Moderation](./PRD_AI_Sticker_Generator.md#10-content-safety--moderation).
**Architecture alignment:** [Architecture component responsibilities](./ARCHITECTURE.md#component-responsibilities) and [native boundary](./ARCHITECTURE.md#native-boundary).

This document is the single observable interface between the application, native runtime, model pipeline, local storage, safety, and QA workstreams. Implementations may change internally only when their behaviour remains compatible with this contract. The PRD remains authoritative if this contract conflicts with it.

## Contract Principles

- The core flow is on-device and remains usable without network access after install; no contract operation requires a custom production backend ([PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope)).
- The application depends on these versioned ports, never on a selected inference runtime or delegate ([PRD § 8 System Design & Architecture](./PRD_AI_Sticker_Generator.md#8-system-design--architecture)).
- Every cross-boundary request, response, event, manifest, and asset record carries or is governed by contract version `1.0`.
- The native boundary reports observable state and stable error codes. It does not expose model prompts, raw images, delegate internals, or storage implementation details beyond the fields below.
- A successful generation creates one immutable, local, transparent PNG asset. Regeneration creates a different asset and never overwrites an earlier successful asset ([PRD § 7 User Flow](./PRD_AI_Sticker_Generator.md#7-user-flow)).
- V1 is Android-first; OS save and share use a local asset reference and do not transfer asset ownership ([PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope)).

## Ownership Matrix

| Contract area                                | Architecture components                                                | Accountable owner | Required deliverable                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------ |
| Application contracts and application port   | App shell, Capability gate, Generation orchestrator                    | Mobile lead       | TypeScript types, request validation, UI error/progress mapping          |
| Native bridge and runtime contracts          | Generation orchestrator, Model runtime, Segmentation, Platform sharing | Native/ML lead    | Bridge adapter, runtime mapping, model-readiness and execution behaviour |
| Model manifest and artifact provenance       | Model runtime                                                          | Native/ML lead    | Signed-off `ModelManifest` for each shippable artifact                   |
| Asset persistence and metadata               | Asset repository                                                       | Mobile lead       | Durable local gallery record and lifecycle implementation                |
| Safety decisions                             | Safety filter                                                          | Safety owner      | On-device allow/block policy, reason-code mapping, adversarial cases     |
| Acceptance fixtures and compatibility checks | All components                                                         | QA                | Versioned fixtures, conformance results, release evidence                |

The named accountable owner approves changes in its row; cross-row changes also require all affected producers and consumers. The product owner resolves PRD-scope conflicts.

## Application Generation Port

**Binding PRD basis:** [PRD § 7 User Flow](./PRD_AI_Sticker_Generator.md#7-user-flow) requires prompt-to-preview generation, cancellation, recovery, and local save/share; [PRD § 8 System Design & Architecture](./PRD_AI_Sticker_Generator.md#8-system-design--architecture) requires an application-to-native boundary.

The application calls this port. A concrete native module is an implementation detail.

```ts
interface StickerGenerationEngine {
  getCapabilities(): Promise<DeviceCapabilities>;
  prepareModel(request: PrepareModelRequest): Promise<ModelReadiness>;
  generate(
    request: GenerationRequest,
    onProgress: (event: GenerationProgressEvent) => void,
  ): Promise<GenerationResult>;
  cancel(requestId: string): Promise<CancelResult>;
}
```

```ts
type ContractVersion = '1.0';
type CompatibleWireContractVersion = `1.${number}`;

interface GenerationRequest {
  contractVersion: ContractVersion;
  requestId: string;
  prompt: string; // normalized by the application before the safety decision
  stylePresetId: string;
  seed: number;
  outputWidth: number;
  outputHeight: number;
}

interface PrepareModelRequest {
  contractVersion: ContractVersion;
  modelId: string;
  modelVersion: string;
}

type ModelReadiness =
  | {
      contractVersion: ContractVersion;
      modelId: string;
      modelVersion: string;
      ready: true;
    }
  | {
      contractVersion: ContractVersion;
      modelId: string;
      modelVersion: string;
      ready: false;
      error: GenerationError;
    };

type DeviceCapabilities =
  | {
      contractVersion: ContractVersion;
      supported: true;
      reasonCode: 'SUPPORTED';
      totalMemoryClassMb: number;
      availableDelegates: AccelerationDelegate[];
      runtimeVersion: string;
    }
  | {
      contractVersion: ContractVersion;
      supported: false;
      reasonCode: Exclude<DeviceSupportReasonCode, 'SUPPORTED'>;
      totalMemoryClassMb: number;
      availableDelegates: AccelerationDelegate[];
      runtimeVersion: string;
    };

type DeviceSupportReasonCode =
  'SUPPORTED' | 'DEVICE_UNSUPPORTED' | 'RUNTIME_UNAVAILABLE' | 'INSUFFICIENT_MEMORY';

type AccelerationDelegate = 'CPU' | 'GPU' | 'NNAPI' | 'NPU';
```

`DeviceCapabilities` is supported only when the device meets the Snapdragon 7-series or Google Tensor G2-equivalent-and-above floor plus selected-plan runtime readiness ([PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope)). `ModelReadiness` cannot report `ready: true` with an error, and cannot report `ready: false` without one.

`requestId` identifies exactly one generation attempt and must be unique while that attempt is active. `prompt` is Unicode-normalized, trimmed, and non-empty before it reaches `generate`. V1 `outputWidth` and `outputHeight` must be positive integers, equal (square), and each less than or equal to both selected-manifest maximum bounds: `inputWidth` and `inputHeight`. Schema, normalization, seed, preset, and dimension validation failures return `INVALID_REQUEST`; they are never silently corrected or resized.

## Native Bridge Contract

**Binding PRD basis:** [PRD § 8 System Design & Architecture](./PRD_AI_Sticker_Generator.md#8-system-design--architecture) keeps model execution and segmentation on device; [PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope) excludes remote inference.

The native bridge serializes the port calls as versioned envelopes. `generate` emits zero or more `generation.progress` events and one final `generation.result`; all other operations emit one response. Fields are JSON-compatible and use camelCase exactly as written.

```ts
type NativeBridgeCommand =
  'capabilities.get' | 'model.prepare' | 'generation.generate' | 'generation.cancel';

type WirePrepareModelRequest = Omit<PrepareModelRequest, 'contractVersion'> & {
  contractVersion: CompatibleWireContractVersion;
};

type WireGenerationRequest = Omit<GenerationRequest, 'contractVersion'> & {
  contractVersion: CompatibleWireContractVersion;
};

interface WireCancelRequest {
  contractVersion: CompatibleWireContractVersion;
  requestId: string;
}

type NativeBridgeRequest =
  | {
      type: 'capabilities.get';
      contractVersion: CompatibleWireContractVersion;
      commandId: string;
    }
  | { type: 'model.prepare'; commandId: string; payload: WirePrepareModelRequest }
  | { type: 'generation.generate'; payload: WireGenerationRequest }
  | { type: 'generation.cancel'; payload: WireCancelRequest };

type NativeBridgeEvent =
  | { type: 'generation.progress'; payload: GenerationProgressEvent }
  | {
      type: 'generation.result';
      requestId: string;
      payload: GenerationResult;
    };

type NativeBridgeResponse =
  | { type: 'capabilities.get'; commandId: string; payload: DeviceCapabilities }
  | { type: 'model.prepare'; commandId: string; payload: ModelReadiness }
  | { type: 'generation.cancel'; requestId: string; payload: CancelResult }
  | {
      type: 'generation.accepted';
      contractVersion: CompatibleWireContractVersion;
      requestId: string;
    }
  | NativeBridgeErrorResponse;

type NativeBridgeErrorResponse =
  | {
      type: 'error';
      command: 'capabilities.get' | 'model.prepare';
      contractVersion: CompatibleWireContractVersion;
      correlationId: string; // commandId
      error: GenerationError;
    }
  | {
      type: 'error';
      command: 'generation.generate' | 'generation.cancel';
      contractVersion: CompatibleWireContractVersion;
      correlationId: string; // requestId
      requestId: string;
      error: GenerationError;
    };
```

Every wire command carries `CompatibleWireContractVersion`; the internal application port continues to use the exact current `ContractVersion` literal `1.0`. The bridge validates a wire version against `^1\.\d+$`, rejects an unsupported major with `MODEL_INCOMPATIBLE`, then normalizes an accepted `1.x` payload into the internal `1.0` port type while ignoring unknown optional minor-version fields. A malformed version is also rejected before work begins with `MODEL_INCOMPATIBLE`.

Every command can return `NativeBridgeErrorResponse`. `correlationId` equals `commandId` for capability and model commands, and equals `requestId` for generation and cancellation commands; `requestId` is required for generation/cancellation errors and omitted for capability errors. `generation.result.requestId` must equal `payload.requestId` and is present for both terminal success and failure.

`generation.generate` has one terminal transport rule. Before admission—version, schema, and dimension validation; unsupported device or model; or `GENERATION_BUSY`—it returns only `NativeBridgeErrorResponse` and emits neither progress nor `generation.result`. Once admitted, it returns `generation.accepted` with the `requestId`, may emit progress, and terminates exactly once with `generation.result`. Timeout, cancellation, inference, segmentation, encoding, and storage failures after admission use a failed `GenerationResult`; they never produce a second `NativeBridgeErrorResponse`. The `StickerGenerationEngine.generate` adapter resolves its Promise from an immediate rejection by converting that correlated error to a failed `GenerationResult`, or from the single correlated terminal result after `generation.accepted`; it neither waits indefinitely nor resolves twice. Only an allowed normalized prompt is serialized into `generation.generate`; a blocked prompt never reaches this boundary.

## Progress and Cancellation

**Binding PRD basis:** [PRD § 7 User Flow](./PRD_AI_Sticker_Generator.md#7-user-flow) requires visible generation, background removal, retry, and cancellation; [PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope) requires transparent-background stickers.

The only V1 progress order is:

```text
validating -> preparing_model -> generating -> removing_background -> encoding -> completed
```

```ts
type GenerationStage =
  | 'validating'
  | 'preparing_model'
  | 'generating'
  | 'removing_background'
  | 'encoding'
  | 'completed';

interface GenerationProgressEvent {
  contractVersion: ContractVersion;
  requestId: string;
  sequence: number;
  stage: GenerationStage;
  stageProgress: number; // inclusive range: 0 through 1
  elapsedMs: number; // monotonic for a request
}

type CancelResult =
  | {
      contractVersion: ContractVersion;
      requestId: string;
      accepted: true;
      outcome: 'cancellation_requested';
    }
  | {
      contractVersion: ContractVersion;
      requestId: string;
      accepted: false;
      outcome:
        'already_cancellation_requested' | 'already_cancelled' | 'already_terminal' | 'not_found';
    };
```

For a successful request, the engine emits each exact stage once and only once in the listed order, ending with `completed`. The first event has `sequence: 1`; every later event increments `sequence` by exactly one. `elapsedMs` is a non-negative integer that never decreases. `stageProgress` is a finite number in the inclusive range `0` through `1`; `completed` has `stageProgress: 1`. A stage’s single event has no earlier event for that same stage, so stage progress cannot regress. `completed` is the last progress event and is emitted only for a successful result. Early failure or cancellation may emit only an ordered prefix of the stages and must never emit `completed`.

The first cancellation of an active request returns `accepted: true` with `cancellation_requested`. Repeated cancellation while cancellation is pending returns `accepted: false` with `already_cancellation_requested`; a repeated call after the cancelled terminal result returns `accepted: false` with `already_cancelled`. A call after another terminal result returns `accepted: false` with `already_terminal`; an unknown `requestId` returns `accepted: false` with `not_found`. These outcomes are idempotent and do not start additional work. A cancelled request resolves as a failed `GenerationResult` with `GENERATION_CANCELLED`, emits no later `completed` event, and leaves no gallery item.

## Model Manifest Contract

**Binding PRD basis:** [PRD § 9 Tech Stack & Design Justification](./PRD_AI_Sticker_Generator.md#9-tech-stack--design-justification) requires a selected on-device model runtime and bundled artifact; [PRD § 11 Risk Register & Contingency Plan](./PRD_AI_Sticker_Generator.md#11-risk-register--contingency-plan) requires compatibility evidence across device delegates.

```ts
interface ModelManifest {
  manifestVersion: string;
  modelId: string;
  modelVersion: string;
  runtime: string;
  runtimeVersion: string;
  quantization: string;
  artifactSha256: string;
  artifactBytes: number;
  minimumMemoryMb: number;
  supportedDelegates: AccelerationDelegate[];
  inputWidth: number;
  inputHeight: number;
  licenseId: string;
}
```

The Week 1 feasibility evidence selects Plan A, Plan B, or Plan C; no production runtime is selected before that spike ([PRD § 11 Risk Register & Contingency Plan](./PRD_AI_Sticker_Generator.md#11-risk-register--contingency-plan)). The model pipeline publishes one manifest per exact selected-plan artifact. Before preparation or generation, the native/ML implementation verifies `artifactSha256`, runtime compatibility, memory requirement, and a usable delegate. It returns `MODEL_NOT_AVAILABLE`, `MODEL_INCOMPATIBLE`, or `INSUFFICIENT_MEMORY` as applicable. `inputWidth` and `inputHeight` are the V1 maximum bounds used to validate the square generation request.

For Plan C, `ModelManifest` remains the compatibility adapter for the local template bundle: `modelId` is exactly `template-fallback`; `runtime` is exactly `template-bundle`; `runtimeVersion` identifies the adapter version; `quantization` is exactly `none`; `artifactSha256`, `artifactBytes`, and `licenseId` describe the local template bundle; and dimensions describe the bundle’s supported square output. In Plan C, `prepareModel` prepares and verifies that local template bundle instead of an inference artifact, while preserving the same readiness, progress, error, asset, and cancellation semantics.

## Generated Asset Contract

**Binding PRD basis:** [PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope) requires local save/share rather than sticker-pack integration; [PRD § 7 User Flow](./PRD_AI_Sticker_Generator.md#7-user-flow) requires transparent PNG output and a persistent gallery.

```ts
interface GeneratedAsset {
  assetId: string;
  requestId: string;
  localUri: string;
  mimeType: 'image/png';
  width: number;
  height: number;
  byteSize: number;
  sha256: string;
  createdAt: string; // ISO 8601 UTC timestamp
  promptDigest: string;
  modelId: string;
  modelVersion: string;
  seed: number;
}

type GenerationResult =
  | {
      contractVersion: ContractVersion;
      requestId: string;
      status: 'succeeded';
      asset: GeneratedAsset;
    }
  | {
      contractVersion: ContractVersion;
      requestId: string;
      status: 'failed';
      error: GenerationError;
    };
```

Only the Asset repository creates a `GeneratedAsset`; it does so after successful encoding and durable local persistence. `assetId` is immutable and unique, `localUri` is app-local, and `sha256` verifies the encoded PNG bytes. For a succeeded result, `GenerationResult.requestId` must equal `asset.requestId`. `promptDigest` is a one-way digest of the normalized allowed prompt and is retained for provenance; raw prompts are not stored in the asset record. Save/share consumers receive `assetId` or the resolved `localUri` and may not delete or mutate the asset.

## Safety Decision Contract

**Binding PRD basis:** [PRD § 10 Content Safety & Moderation](./PRD_AI_Sticker_Generator.md#10-content-safety--moderation) requires on-device input filtering before generation and a friendly non-revealing rejection.

```ts
type SafetyDecision =
  | {
      contractVersion: ContractVersion;
      decision: 'allowed';
      normalizedPrompt: string;
    }
  | {
      contractVersion: ContractVersion;
      decision: 'blocked';
      reasonCode: 'PROMPT_BLOCKED';
    };
```

The Safety filter evaluates a normalized prompt before the native generation boundary. Only an `allowed` decision may create a `GenerationRequest`. A `blocked` decision returns `PROMPT_BLOCKED`, never crosses the native generation boundary, never creates a gallery item, and never logs raw prompt text. The application presents a generic safe rejection and does not reveal the matched rule, token, or filter internals. V1 does not add output-image moderation ([PRD § 10 Content Safety & Moderation](./PRD_AI_Sticker_Generator.md#10-content-safety--moderation)).

## Error Taxonomy

**Binding PRD basis:** [PRD § 7 User Flow](./PRD_AI_Sticker_Generator.md#7-user-flow) requires recoverable user-visible failure states; [PRD § 11 Risk Register & Contingency Plan](./PRD_AI_Sticker_Generator.md#11-risk-register--contingency-plan) names device, memory, model, segmentation, and safety risks.

```ts
type GenerationErrorCode =
  | 'INVALID_REQUEST'
  | 'DEVICE_UNSUPPORTED'
  | 'MODEL_NOT_AVAILABLE'
  | 'MODEL_INCOMPATIBLE'
  | 'INSUFFICIENT_MEMORY'
  | 'PROMPT_BLOCKED'
  | 'GENERATION_BUSY'
  | 'GENERATION_TIMEOUT'
  | 'GENERATION_CANCELLED'
  | 'INFERENCE_FAILED'
  | 'SEGMENTATION_FAILED'
  | 'ASSET_ENCODING_FAILED'
  | 'ASSET_STORAGE_FAILED'
  | 'SHARE_UNAVAILABLE'
  | 'UNKNOWN_ERROR';

interface GenerationError {
  contractVersion: ContractVersion;
  code: GenerationErrorCode;
  message: string; // safe for user display; no raw prompt or internal rule detail
  retryable: boolean;
}
```

These codes are stable identifiers, not user-facing copy. `INVALID_REQUEST` is returned for invalid request schema, normalized prompt, seed, style preset, or dimensions. `PROMPT_BLOCKED` is produced only by the Safety filter. `GENERATION_CANCELLED` is the required terminal error for a cancellation. `SEGMENTATION_FAILED`, `ASSET_ENCODING_FAILED`, and `ASSET_STORAGE_FAILED` must not leave a gallery item. `SHARE_UNAVAILABLE` is emitted only by the platform-sharing operation after a successful asset already exists; it must preserve that asset. Failures without a stable more-specific mapping use `UNKNOWN_ERROR`.

## Compatibility and Versioning

**Binding PRD basis:** [PRD § 11 Risk Register & Contingency Plan](./PRD_AI_Sticker_Generator.md#11-risk-register--contingency-plan) allows runtime contingency changes while preserving the release’s observable user flow.

Contract versions use semantic versioning: `MAJOR.MINOR`. This document defines `1.0`. The current producer emits the exact `ContractVersion` literal `1.0`; the wire parser accepts same-major `1.x` values only when they match `^1\.\d+$`, parse as a finite non-negative integer minor, and do not require unknown fields. A future `1.x` document publishes its own exact producer literal while retaining this same-major parser rule.

- Additive optional fields are minor-compatible and consumers must ignore unknown optional fields.
- Removed fields, renamed fields, changed meanings, or reordered required progress semantics require a major version.
- A producer must not emit a new major version to an older consumer. Consumers reject malformed or unsupported-major versions before work starts with `MODEL_INCOMPATIBLE`.
- Runtime, model artifact, delegate, and implementation substitutions may occur without a contract version change only if every `1.0` observable behaviour, manifest field, error mapping, and fixture result remains compatible.
- The `contractVersion` sent by a request and returned by a response/event/result identifies the version actually used; it is never inferred from app build number or model version.

## Contract Test Fixtures

**Binding PRD basis:** [PRD § 12 Development Plan & Timeline](./PRD_AI_Sticker_Generator.md#12-development-plan--timeline) requires device-matrix validation, adversarial safety testing, and end-to-end pipeline evidence before release.

QA owns and versions these fixtures under the contract version. Every producer runs the applicable fixture before integration; every consumer asserts the listed observable outcome.

| Fixture ID                     | Input / setup                                                                                             | Required observable outcome                                                                                                                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `capabilities-supported-1.0`   | Snapdragon 7-series or Tensor G2-equivalent-and-above device; compatible ready manifest                   | `supported: true`, `reasonCode: SUPPORTED`, usable delegate, runtime version, and no generation error                                                                                                                                                                     |
| `capabilities-unsupported-1.0` | Below-floor or unavailable runtime device                                                                 | `supported: false` with stable reason code; generation does not start                                                                                                                                                                                                     |
| `allowed-generation-1.0`       | Allowed normalized prompt, positive square in-bounds dimensions, fixed seed                               | Each exact stage once in order through one `completed`; request-correlated succeeded result; valid transparent PNG asset; matching request/model/seed provenance                                                                                                          |
| `invalid-request-1.0`          | Empty/invalid normalized prompt, invalid seed/preset, or non-positive/non-square/out-of-bounds dimensions | Correlated `NativeBridgeErrorResponse` with `INVALID_REQUEST`; no inference, progress, `generation.result`, or gallery item                                                                                                                                               |
| `blocked-prompt-1.0`           | Prompt classified as blocked                                                                              | `PROMPT_BLOCKED`; no bridge generation payload, no raw-prompt log, no progress, no gallery item                                                                                                                                                                           |
| `cancel-generation-1.0`        | Cancel during `generating`; repeat while pending and after cancellation                                   | `generation.accepted`; first result `accepted: true/cancellation_requested`; repeats report `false/already_cancellation_requested` then `false/already_cancelled`; one request-correlated failed result `GENERATION_CANCELLED`, no later `completed`, and no gallery item |
| `model-incompatible-1.0`       | Runtime or artifact mismatch                                                                              | Correlated `NativeBridgeErrorResponse` with `MODEL_INCOMPATIBLE`; inference, progress, and `generation.result` do not start                                                                                                                                               |
| `segmentation-failure-1.0`     | Injected segmentation failure                                                                             | `SEGMENTATION_FAILED`, no encoded asset or gallery item                                                                                                                                                                                                                   |
| `asset-storage-failure-1.0`    | Injected persistence failure after encoding                                                               | `ASSET_STORAGE_FAILED`, no gallery item                                                                                                                                                                                                                                   |
| `share-unavailable-1.0`        | Valid persisted asset and unavailable OS share target                                                     | `SHARE_UNAVAILABLE` while the existing asset remains resolvable                                                                                                                                                                                                           |

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

The mobile lead records the compatibility classification. The native/ML lead verifies bridge and runtime conformance. QA publishes fixture results before integration. No breaking change ships without a major contract version, an approved migration, and passing fixtures for every supported consumer.

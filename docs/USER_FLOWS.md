# GenSticker User Flows

> **Binding first-run flow:** capability gate → exact model size and Wi-Fi guidance → download with cancel/resume/retry → verify every part and canonical digest → initialize dynamic ML Kit segmentation → offline-ready. Generation performs NFKC normalization and fail-closed local safety before native work, permits one request, uses only `chibi` at 512×512, persists success, then deletes temporary output. Failure or cancellation creates no gallery item.

## Document Control

**Document role:** State and recovery guidance for v1.

**Binding PRD basis:** [PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope), [PRD § 7 User Flow](./PRD_AI_Sticker_Generator.md#7-user-flow), [PRD § 8 System Design & Architecture](./PRD_AI_Sticker_Generator.md#8-system-design--architecture), and [PRD § 10 Content Safety & Moderation](./PRD_AI_Sticker_Generator.md#10-content-safety--moderation). Error codes, progress stages, cancellation results, and generated-asset terms are defined only in [Integration Contracts](./INTEGRATION_CONTRACTS.md).

## Shared State Model

The application uses these user-visible states only:

| State                 | Meaning                                                                               | Allowed next state or action                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `checking_capability` | Capability check is running before generation is available.                           | `unsupported`, `ready`, or `failed`                                                                                   |
| `unsupported`         | The device or required local runtime cannot support v1.                               | Read the explanation; leave the feature or recheck on a later launch or after an app update. Generation cannot start. |
| `ready`               | Home prompt entry and local gallery access are available.                             | Submit a prompt, open the gallery, or edit the prompt. Submit is disabled while an admitted request is active.        |
| `moderating`          | The local input-side safety evaluation is in progress.                                | `blocked`, `preparing`, or fail closed in `failed` for invalid input or operational evaluation failure.               |
| `blocked`             | The prompt was rejected safely.                                                       | Read the generic message, edit the prompt, then return to `ready`.                                                    |
| `preparing`           | An admitted request is performing contract-defined preparation work.                  | `generating`, `failed`, or `cancelled`                                                                                |
| `generating`          | The contract-defined generation work is in progress.                                  | `removing_background`, `failed`, or `cancelled`                                                                       |
| `removing_background` | The contract-defined background-removal work is in progress.                          | `encoding`, `failed`, or `cancelled`                                                                                  |
| `encoding`            | The contract-defined encoding and local persistence work is in progress.              | `preview`, `failed`, or `cancelled`                                                                                   |
| `preview`             | A successful local asset is available on the neutral checkered backdrop.              | Save, share, regenerate, edit the prompt, or open the gallery.                                                        |
| `saving`              | The user has initiated an allowed local save/export action from a successful preview. | Return to `preview` whether the action finishes or the platform declines it.                                          |
| `sharing`             | The operating-system share surface is being opened for a successful local asset.      | Return to `preview`; every `ShareResult`, including `Unavailable`, preserves the existing asset.                      |
| `failed`              | A safe, recoverable failure message is shown.                                         | Retry or recheck when the contract marks it retryable, edit the prompt, or return to `ready`.                         |
| `cancelled`           | A generation request reached the contract-defined cancelled terminal result.          | Return to `ready`, edit the prompt, or submit a new attempt.                                                          |

The application renders the progress order and terminal semantics by reference to [Integration Contracts: Progress and Cancellation](./INTEGRATION_CONTRACTS.md#progress-and-cancellation). It does not invent intermediate stages, duplicate terminal results, or infer completion before the contract reports success.

## First Launch and Capability Gate

1. On launch, enter `checking_capability` and query the local capability contract.
2. A valid supported capability result enters `ready`; the user can access prompt entry and the local gallery.
3. Any valid capability result with `supported: false` enters `unsupported`, whether its exact `reasonCode.wireValue` is `DEVICE_UNSUPPORTED`, `RUNTIME_UNAVAILABLE`, or `INSUFFICIENT_MEMORY`, and shows the clear device-not-supported explanation required by the PRD. Generation controls remain unavailable; the app does not offer a partial or cloud fallback.
4. A correlated `capabilities.get` error enters `failed`, presents its safe contract message, and offers retry or recheck. It must not be converted to `unsupported`.
5. The user may leave the feature and may receive a new capability result on a later launch or after an app update. This does not imply an in-session bypass of the device floor.

## Prompt Submission and Moderation

1. From `ready`, the user submits a non-empty prompt, the application normalizes and trims it, calls `PromptSafetyEvaluator.evaluate(PromptSafetyRequest)`, and enters `moderating`.
2. `SafetyEvaluationResult.Evaluated(SafetyDecision.Blocked)` enters `blocked`; the user sees a friendly generic rejection that neither echoes the prompt nor identifies a matching word or rule.
3. From `blocked`, Edit prompt returns the user to `ready` with editable input. A blocked request creates neither progress nor a gallery item.
4. `SafetyEvaluationResult.Failed` enters `failed`, never `blocked`. The UI shows only its safe message and offers explicit retry after the app verifies an active, redundant, bundled, or newly fetched signed package at or above `maximumAcceptedRevision`. An older bundled baseline is never offered as recovery. If no eligible package exists, remain failed closed offline while the unique WorkManager refresh waits for connectivity; no `GenerationRequest`, runtime payload, progress, asset, or gallery item is created, and the raw prompt is not logged.
5. Only `SafetyEvaluationResult.Evaluated(SafetyDecision.Allowed)` supplies the normalized prompt from which the application may construct `GenerationRequest`; the fixed negative prompt remains bundled internal runtime configuration and is never a request or wire field. Admission moves to `preparing`. A request validation failure enters `failed` and is handled by the contract's stable error code rather than a new UI-specific error.

## Generation and Progress

The application maps the contract-defined progress stages without creating a separate user state:

| Contract progress stage            | User-visible state                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `validating` and `preparing_model` | `preparing`                                                                                                                |
| `generating`                       | `generating`                                                                                                               |
| `removing_background`              | `removing_background`                                                                                                      |
| `encoding`                         | `encoding`                                                                                                                 |
| `completed`                        | Remain in `encoding` with a finishing indication until exactly one successful terminal generation result enters `preview`. |

The ordering, completion, early-failure, and cancellation semantics remain those in [Integration Contracts: Progress and Cancellation](./INTEGRATION_CONTRACTS.md#progress-and-cancellation). The user can request cancellation while an admitted generation is active. The UI remains on the current active state until the correlated terminal result resolves it as `cancelled` or `failed`; a failed or cancelled request never reaches `preview`. The preview displays the transparent local PNG on a neutral checkered backdrop, as required by [PRD § 7 User Flow](./PRD_AI_Sticker_Generator.md#7-user-flow). The existing local asset and its provenance remain governed by [Integration Contracts: Generated Asset Contract](./INTEGRATION_CONTRACTS.md#generated-asset-contract).

## Cancellation

1. The first cancellation request uses the contract-defined cancellation operation for the active request.
2. A repeated request is handled idempotently according to the cancellation result in [Integration Contracts: Progress and Cancellation](./INTEGRATION_CONTRACTS.md#progress-and-cancellation); it does not begin another generation or change the active request identity.
3. When the terminal cancellation result arrives, enter `cancelled`, show a safe confirmation, and offer return to `ready` or prompt editing.
4. A cancelled request has the contract-defined cancellation error, produces no later completed progress, and creates no gallery item.

## Successful Preview

`preview` is reached only after encoding and durable in-app gallery persistence have succeeded. The user may inspect transparency, regenerate, edit the prompt, save, share, or navigate to the local gallery. Regenerate starts a new request and never overwrites the prior successful local asset; Edit prompt returns to `ready` for a newly moderated submission.

After repeated regeneration attempts on the same prompt, the UI may give the PRD's gentle suggestion to rephrase. The suggestion does not silently block further attempts or alter the prompt.

## Save and Share

1. The generated asset is already durable in the in-app gallery before `preview`. From `preview`, Save enters `saving` and calls `PlatformAssetExporter.saveToPhotoLibrary(assetId)` only to make an optional external device photo-library copy; it does not create or replace the gallery asset.
2. `PhotoLibrarySaveResult.Succeeded` confirms the copy. `PermissionDenied`, `Cancelled`, and `Unavailable` keep their dedicated platform meanings. `Failed` reports only a `PhotoLibrarySaveFailureCode` for missing asset, invalid path, unavailable storage, or write failure. Every subtype returns or remains in `preview` and preserves the existing gallery asset.
3. From `preview`, Share enters `sharing` and calls `PlatformAssetExporter.shareAsset(assetId)` to invoke the operating-system share surface. `ShareResult.Succeeded`, `PermissionDenied`, `Cancelled`, and `Unavailable` each return to `preview` with the applicable confirmation or safe recovery. `ShareResult.Failed` reports only a `ShareFailureCode` for missing asset, invalid path, asset-read failure, or share invocation failure.
4. Every share outcome preserves the original gallery asset for retry, external save, and gallery use; the exporter cannot mutate or delete it.
5. V1 does not create native installable sticker packs or transfer ownership of an asset through save or share.

## Regenerate and Edit Prompt

- **Regenerate:** From `preview`, begin a new attempt from the same prompt. It returns through `moderating` before any generation work, and its result is a separate asset if successful. While the attempt is admitted, another submit control is disabled. If a race still returns `GENERATION_BUSY` for a secondary request, show only a correlated inline busy notice and retain the active request's state, progress, and cancellation controls.
- **Edit prompt:** From `preview`, `blocked`, `failed`, or `cancelled`, return to `ready` with an editable prompt. A resubmission always returns through `moderating`; no previously blocked or failed request is resumed across the safety boundary.

## Local Gallery

The local gallery is available from `ready` and `preview` through the callable [Gallery Repository contract](./INTEGRATION_CONTRACTS.md#gallery-repository-contract). `GalleryRepository.listGalleryItems()` lists only successfully persisted items, and `getGalleryItem(assetId)` resolves a selected item for preview, save, or share without regeneration. `NotFound`, `PathConfinementRejected`, and `Failed` are explicit recovery outcomes; path rejection fails closed without reading external bytes. Blocked, cancelled, and failed attempts create no item, and gallery access requires no connectivity.

Deletion calls `GalleryRepository.deleteGalleryItem(assetId)`. The UI confirms removal only for `DeleteGalleryItemResult.Deleted`; `NotFound`, `PathConfinementRejected`, and `Failed` do not claim deletion. A successful deletion removes the owned PNG, Room metadata, and item-local prompt history together, but cannot remove any external photo-library copy or content already shared outside the app.

## Failure and Recovery Matrix

Use the operation-specific stable result and failure types in [Integration Contracts](./INTEGRATION_CONTRACTS.md); generation failures use its [Error Taxonomy](./INTEGRATION_CONTRACTS.md#error-taxonomy). The UI shows only contract-safe user messages and follows the supplied retryability; it does not expose raw prompts, filter details, native internals, or define substitute error codes.

| Condition                                                          | Stable contract code or source                                                                                                       | User state and recovery                                                                                                                                                                     |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invalid normalized request                                         | `INVALID_REQUEST`                                                                                                                    | Enter `failed`; let the user edit the prompt or return to `ready`.                                                                                                                          |
| Valid capability result reports unsupported                        | `supported: false` with `DEVICE_UNSUPPORTED`, `RUNTIME_UNAVAILABLE`, or `INSUFFICIENT_MEMORY` from the capability contract           | Enter `unsupported`; do not start generation or offer a cloud fallback.                                                                                                                     |
| Correlated capability-query error                                  | Error returned by `capabilities.get` under the Integration Contracts                                                                 | Enter `failed`; show the safe contract message and offer retry or recheck. Do not enter `unsupported`.                                                                                      |
| Required model/runtime is unavailable, incompatible, or cannot fit | `MODEL_NOT_AVAILABLE`, `MODEL_INCOMPATIBLE`, or `INSUFFICIENT_MEMORY`                                                                | Enter `failed`; permit the recovery indicated by contract retryability. If capability itself is unsupported, use `unsupported`.                                                             |
| Secondary request races an active generation                       | `GENERATION_BUSY`                                                                                                                    | Retain the active request's state, progress, and cancellation controls; show only a correlated inline busy notice for the secondary request.                                                |
| Admitted pipeline cannot finish                                    | `GENERATION_TIMEOUT`, `INFERENCE_FAILED`, `SEGMENTATION_FAILED`, `ASSET_ENCODING_FAILED`, `ASSET_STORAGE_FAILED`, or `UNKNOWN_ERROR` | Enter `failed`; offer the contract-allowed retry or prompt editing. Failed segmentation, encoding, and storage never produce a gallery item.                                                |
| User cancellation reaches its terminal result                      | `GENERATION_CANCELLED`                                                                                                               | Enter `cancelled`; no later completed progress and no gallery item.                                                                                                                         |
| Prompt is rejected by safety policy                                | `SafetyEvaluationResult.Evaluated(SafetyDecision.Blocked)` with `SafetyBlockReasonCode.PROMPT_BLOCKED`                               | Enter `blocked`, not `failed`; offer a generic rewrite path without revealing the match.                                                                                                    |
| Safety policy cannot be evaluated operationally                    | `SafetyEvaluationResult.Failed` with a stable `SafetyEvaluationFailureCode`                                                          | Enter `failed`, never `blocked`; construct no generation request; retry only after a verified package at/above `maximumAcceptedRevision`; wait safely for connected refresh if none exists. |
| OS share target is unavailable                                     | `ShareResult.Unavailable`                                                                                                            | Return to `preview`; preserve the successful local asset and offer retry, save, or gallery use.                                                                                             |

## Unsupported Device Flow

`unsupported` is a capability gate, not a recoverable generation attempt. It communicates that the device does not meet the v1 floor or required local runtime conditions, keeps generation unavailable, and preserves a clean exit from the feature. The app does not spend generation compute, create a gallery item, or route the request to a remote fallback.

## Offline Guarantees

After installation, every core flow above works with no connectivity while at least one readable verified compatible safety package at or above `maximumAcceptedRevision` is available: capability evaluation, input moderation, generation, background removal, local persistence, preview, gallery access, save, and the operating-system share handoff. A routine blocklist-update check and user-enabled telemetry upload are background-only and best-effort and cannot replace the verified local safety package with a lower revision. If all active/redundant/bundled packages at or above the floor are unavailable or corrupt, input moderation and generation temporarily fail closed offline until a qualifying signed package is restored; gallery, save, and share remain local and available.

# Safety and Privacy

## Document Control

**Document role:** Implementation policy for v1.

**Binding PRD basis:** [PRD § 4 Goals & Success Metrics](./PRD_AI_Sticker_Generator.md#4-goals--success-metrics), [PRD § 5 Scope](./PRD_AI_Sticker_Generator.md#5-scope), [PRD § 6 Assumptions, Constraints & Dependencies](./PRD_AI_Sticker_Generator.md#6-assumptions-constraints--dependencies), [PRD § 8 System Design & Architecture](./PRD_AI_Sticker_Generator.md#8-system-design--architecture), and [PRD § 10 Content Safety & Moderation](./PRD_AI_Sticker_Generator.md#10-content-safety--moderation). Error codes, progress, cancellation, and generated-asset behaviour are defined only in [Integration Contracts](./INTEGRATION_CONTRACTS.md).

## Scope and Accepted Residual Risk

V1 generates text-to-sticker content entirely on-device after installation. It has no cloud inference, no cloud moderation, no cloud generation fallback, and no cloud gallery sync. Connectivity may be used only for the best-effort blocklist update and user-enabled lightweight telemetry described below; neither is required for generation.

Safety is deliberately input-side in v1. Input filtering and the fixed safety negative prompt reduce risk, but can be bypassed by novel wording, misspellings, synonyms, and language coverage gaps. V1 explicitly accepts this residual risk and does not add output-image classification. The Safety owner must re-evaluate this decision when measured device-floor headroom permits a future output-side approach.

## Layered Input-Side Safety

1. The on-device Safety filter implements [`PromptSafetyEvaluator`](./INTEGRATION_CONTRACTS.md#safety-decision-contract) and evaluates the normalized prompt before a `GenerationRequest` can exist. `SafetyEvaluationResult.Evaluated` wraps the allow/block policy decision. A blocked decision does not cross the generation boundary, does not create an asset or gallery item, and receives the generic, non-revealing user response required by Integration Contracts.
2. `SafetyEvaluationResult.Failed` represents an operational evaluation failure, never a policy block. It fails closed before generation, logs no raw prompt, and permits only the safe retry/baseline-recovery behavior below.
3. After an evaluated allowed decision, every admitted generation uses the fixed safety negative prompt internally as a second, always-on model-conditioning layer. It is defense in depth, not a substitute for input filtering.
4. The filter and negative prompt are reviewed together whenever rules or model configuration change. The filter's matched rule, token, and internal scoring are never displayed to users.

## Prompt Handling and Logging Rules

- Raw prompts are used only for transient on-device processing needed to make the safety decision and, if allowed, to start generation, plus the required app-private local prompt-history record. They must not enter application logs, crash reports, diagnostics, telemetry, remote blocklist sync, support exports, or share payloads by default.
- [PRD § 9 Tech Stack & Design Justification](./PRD_AI_Sticker_Generator.md#9-tech-stack--design-justification) requires local metadata including prompt text. Room (or equivalent app-local gallery metadata) must retain the raw prompt text locally for that item's prompt history; it is not copied into the generated-asset contract, logs, diagnostics, telemetry, remote sync, or share payloads. It is retained only until that gallery item is deleted or local data is reset.
- A blocked prompt must never be serialized to the generation boundary. The rejection must not echo the prompt or reveal the rule that matched it.
- Generated images, image bytes, thumbnails, and full local URIs must not enter logs, diagnostics, crash reports, telemetry, or support exports.
- Diagnostics may use non-content operational data only, such as app version, coarse device capability outcome, contract error code, duration bucket, and the telemetry consent state. Any prompt-derived provenance remains governed by the generated-asset terms in [Integration Contracts](./INTEGRATION_CONTRACTS.md#generated-asset-contract), rather than being copied into diagnostics.

## Fixed Safety Negative Prompt

The safety negative prompt is bundled and versioned with the selected local runtime/model safety configuration and applied internally to every admitted generation after `PromptSafetyEvaluator` returns `SafetyEvaluationResult.Evaluated(SafetyDecision.Allowed)`. It is not a field in `PromptSafetyRequest`, `GenerationRequest`, or the runtime wire envelope; it is never displayed, exposed as a preference, accepted from the user, or user-editable. Changes to it require the same safety review and release process as a filtering-logic change; a blocklist update cannot alter it.

## Local Blocklist

The app ships with a reviewed, signed local baseline blocklist so that safety enforcement works without connectivity from first launch. Each app build declares a minimum revision and the baseline's signed revision. `maximumAcceptedRevision` is the monotonic effective floor and is at least the build minimum. Rules are versioned in rollback-protected app-private storage as an active signed package plus an independently readable redundant last-valid package at that floor. A candidate ruleset is validated before activation; invalid, incomplete, unreadable, incompatible, expired, or below-floor rules never replace either verified copy.

The active ruleset is the only one consulted for a safety decision. Safety test fixtures and red-team evidence use synthetic or approved safe prompts only; they do not retain production prompts or blocked raw prompts.

## Fail-Closed Evaluation Failure

If the active ruleset cannot be read, is invalid/corrupt, or the evaluator itself fails, the filter returns the matching `SafetyEvaluationResult.Failed` and dedicated `SafetyEvaluationFailureCode`. It must not return `SafetyDecision.Blocked`, a general generation error, or an allowed decision. The application enters `failed`, constructs no `GenerationRequest`, starts no progress/runtime work, creates no asset or gallery item, and records no raw prompt in logs, diagnostics, telemetry, or evidence.

For `RULESET_UNAVAILABLE`, the application reverifies the redundant slot and bundled package and may use only a readable compatible package with a valid signature/digest and revision at least `maximumAcceptedRevision`. For `RULESET_INVALID_OR_CORRUPT`, it quarantines the invalid active slot before that same verification. A redundant package exactly at the floor may be promoted; a compatible package above the floor uses the normal atomic activation and raises the floor. For `EVALUATOR_FAILED`, the app may offer one clean retry against the current verified active package; a repeated failure reverifies the redundant package before any promotion.

The bundled baseline is not a rollback exception. If its signed revision is below `maximumAcceptedRevision`, it is rejected even when both app-private slots are unreadable or corrupt. When no verified compatible package at or above the floor remains, safety stays fail closed with `RULESET_UNAVAILABLE` or `RULESET_INVALID_OR_CORRUPT` as applicable. Offline generation is then temporarily unavailable for safety: no `GenerationRequest` is constructed, and the UI offers a safe retry while the unique WorkManager refresh waits for connectivity to fetch a signed revision at or above the floor. User copy is generic and does not reveal the prompt, matched rules, scoring, revision details, or failure internals.

## Opportunistic Signed Blocklist Updates

When connectivity is available, the app may check for a blocklist update in the background. The check must not delay capability checks, prompt moderation, generation, save, share, or gallery access. Android [WorkManager](https://developer.android.com/develop/background-work/background-tasks/persistent) owns this persistent work; no ad hoc service, timer, or UI lifecycle owns it.

The periodic request uses `WorkManager.enqueueUniquePeriodicWork` with unique name `gensticker.safety-config.periodic`, `ExistingPeriodicWorkPolicy.UPDATE`, and a `Constraints` value requiring `NetworkType.CONNECTED`. An install, reset, or explicit approved refresh trigger uses `WorkManager.enqueueUniqueWork` with unique name `gensticker.safety-config.immediate`, `ExistingWorkPolicy.KEEP`, and the same network constraint. Unique names prevent duplicate concurrent work. The periodic interval, flex, and backoff delay are configurable release values approved by the Safety and Mobile owners; this document does not claim an exact execution time.

Before activation, an update must include its revision, `issuedAt`, `expiresAt`, and build-compatibility declaration, then pass authenticity verification against the pinned signing authority, integrity validation, compatibility validation, and rollback protection. The app rejects an update that is older than the build minimum or `maximumAcceptedRevision`, expired, invalid, or incompatible with the installed build, even when it is otherwise authentic. Recovery-triggered work requests a revision at or above the floor; the service response cannot authorize a lower revision.

The worker downloads into staging, validates every required field, verifies the signature and package digest against the pinned authority, checks build compatibility/expiry, and enforces the floor before activation. It then writes the complete signed candidate to both next-generation app-private slots and independently rereads and verifies each copy. Only one atomic manifest commit switches the active/redundant slot pair and raises `maximumAcceptedRevision` to the candidate revision. A stopped worker, failed copy verification, or validation failure leaves the prior verified pair and floor intact and discards staging; a backup is never promoted before signature/digest verification.

The app keeps `maximumAcceptedRevision` and both signed slots outside the user-content reset domain. An in-app reset neither lowers nor purges the floor or verified slot pair. It reverifies the active and redundant copies; it may activate the bundled baseline only when the bundle is signed, compatible, and at or above the floor. If no eligible package remains, reset leaves safety failed closed and requests the one-time unique refresh for the next connected opportunity without duplicating or erasing periodic work. A platform app-data clear or uninstall is a destructive new-install boundary rather than this in-app reset; the newly installed build must enforce its current build minimum and signed bundled revision and must not claim retention of a prior installation's app-private floor.

An app update may include a newer signed bundled baseline and raise the build minimum and `maximumAcceptedRevision`. The update verifies and commits the newer package through the same dual-slot procedure before evaluation. Neither an update nor a reset may lower those values.

A transient network/service failure returns `Result.retry()` and uses the request's approved `BackoffPolicy.EXPONENTIAL` criteria. An invalid, expired, incompatible, or rollback package fails that run without replacing the active configuration; the next periodic opportunity remains scheduled. Sync failure alone does not block offline generation while a verified compatible package at or above the floor remains active. If all eligible active/redundant/bundled copies are unavailable or corrupt, generation remains fail closed until a qualifying package is installed. A rules-only update can close a rule-coverage gap; a filtering-logic or fixed-negative-prompt change requires a reviewed app update.

## Adversarial Red-Team Protocol

Before release, and after any material safety change, the Safety owner runs a dedicated adversarial pass separate from normal functional QA. It exercises bypass categories identified in [PRD § 10 Content Safety & Moderation](./PRD_AI_Sticker_Generator.md#10-content-safety--moderation), including misspellings, synonyms, non-English phrasing, and combinations that attempt to evade input filtering.

The report records the test category, ruleset revision, result, and remediation decision without preserving raw blocked prompts. A newly found gap is triaged as either a signed ruleset update when rules can address it, or a filtering-logic/model-configuration patch when it cannot. Release evidence includes the red-team outcome and the active ruleset revision.

## Local Data Lifecycle

Generation runs locally. A successful generated asset is created, persisted, and made available to the local gallery only under the generated-asset rules in [Integration Contracts](./INTEGRATION_CONTRACTS.md#generated-asset-contract). In particular, it is a local transparent PNG asset with immutable identity; save and share consumers receive the contract-defined local reference and do not gain authority to mutate or delete it.

App-local data consists of persisted gallery assets and their contract-defined metadata, the permitted item-local prompt-history metadata, the active safety ruleset, and any unsent user-enabled telemetry queue. No raw prompt, generated image, or full local URI is copied into logs or diagnostics. Sharing hands the existing local asset to the operating-system share surface; it does not upload the asset for the core product flow or transfer ownership of the gallery record.

Before preview, gallery read, share, external save/export, or deletion, the asset repository canonicalizes and resolves the contract-defined `localUri` and requires the resolved path to remain inside the app-owned asset root. A traversal path, a symlink escape, or any other resolved external path is rejected. Repository cleanup removes only the owned local asset and metadata; it never deletes a user-visible copy previously exported outside the asset root.

## Deletion and Reset

The asset repository, not a save or share consumer, owns removal of a gallery asset and its app-local metadata. A repository-directed removal must remove the corresponding owned local asset, its contract-defined metadata, and its item-local raw-prompt history together, then leave no gallery entry. A platform-initiated app-data clear, uninstall, or in-app reset (when provided) removes app-local gallery data, prompt history, and queued unsent telemetry.

An in-app reset handles safety configuration exactly as specified in [Opportunistic Signed Blocklist Updates](#opportunistic-signed-blocklist-updates): it preserves `maximumAcceptedRevision` and the verified dual-slot state, never activates an older bundle, and remains fail closed when no qualifying package exists. Any local reset sets local telemetry collection to off and requires new local affirmative opt-in before collection resumes, regardless of a historical remote/service consent record. A reset cannot remove a copy the user has independently saved or shared outside the app; those external copies are outside the app's local-data lifecycle. The UI must make this distinction clear before it offers a reset action.

## Lightweight Opt-In Telemetry

Telemetry is off until the user affirmatively opts in. Before consent, the app does not create, queue, or upload telemetry. Consent is revocable at any time; revocation stops future collection and deletes any unsent local telemetry queue. After any local reset, collection is off again and requires a new local affirmative opt-in before any telemetry is created, queued, or uploaded.

When enabled, telemetry is limited to the lightweight measurements authorized by [PRD § 4 Goals & Success Metrics](./PRD_AI_Sticker_Generator.md#4-goals--success-metrics), such as reliability, coarse generation latency, save/share outcomes, and the optional thumbs up/down output feedback with the separate inappropriate-content bucket. It excludes raw prompts, generated images, image bytes, full local URIs, filter rules, and matched-rule details. Upload is opportunistic and cannot block any offline user flow.

## Incident and Patch Response

For a reported or observed safety gap, preserve only non-content evidence needed to reproduce the category, assess whether the active local ruleset covers it, and record the remediation decision. Do not solicit or retain raw blocked prompts in routine diagnostics.

If a rule change is sufficient, publish it only through the authenticated, rollback-protected update path and monitor adoption through non-content operational signals. If code, the filter, or the fixed safety negative prompt must change, prepare a reviewed app patch; the remote ruleset channel narrows the exposure window but does not replace store-reviewed code changes.

## Explicit V1 Exclusions

- Output-image classification or any other output-side moderation.
- Cloud inference, cloud moderation, cloud generation fallback, and cloud gallery sync.
- Heavy behavioural analytics or telemetry without affirmative user consent.
- Native installable sticker-pack integration; v1 uses local save and the operating-system share sheet.

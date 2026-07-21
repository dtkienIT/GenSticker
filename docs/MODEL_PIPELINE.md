# On-Device Model Pipeline

## Document Control

**Status:** Delivery protocol; production model, runtime, quantization, delegate support, and
packaging strategy remain undecided pending the Week 1 physical-device spike.

**Owner:** Native/ML lead. QA approves validation and reproducibility evidence; the Product owner
approves the selected Plan A/B/C consequence; the Safety owner approves safety-impacting inputs.

**Authority:** The [PRD](./PRD_AI_Sticker_Generator.md) is authoritative. Model and tooling choices
bind to [PRD § 9 — Tech Stack & Design Justification](./PRD_AI_Sticker_Generator.md#9-tech-stack--design-justification),
while selection and release eligibility bind to the
[formal contingency ladder](./PRD_AI_Sticker_Generator.md#contingency-ladder-formalized) and the
[Week 1 feasibility milestone](./PRD_AI_Sticker_Generator.md#week-1--feasibility-spike--gono-go).
Observable fields and errors come from the
[Integration Contracts](./INTEGRATION_CONTRACTS.md#model-manifest-contract).

## Scope and Separation of Concerns

This guide controls the lifecycle of a model or template artifact from an approved source to an
integrity-checked release bundle. The canonical path is:

```text
source model -> pinned conversion environment -> converted artifact -> quantized artifact -> checksum -> manifest -> device validation -> release bundle
```

Two environments are deliberately separate:

| Workstation preparation tooling                                                                                                                                            | Shipped Android runtime                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Python, source-model libraries, conversion/export tools, quantization/calibration tools, validation scripts, license/provenance records, and optional LoRA training tools. | Exactly one selected-plan runtime and exact validated artifact(s), manifest reader, integrity checks, delegate adapter, on-device generation sequence, Segmentation integration, and contract bridge. |
| May use a workstation GPU and source checkpoints to prepare and compare artifacts.                                                                                         | Must run on representative physical devices at the PRD floor, locally after installation, with no cloud inference fallback.                                                                           |
| Produces immutable artifacts and reproducibility evidence; it is not an app feature.                                                                                       | Consumes only approved release artifacts and exposes the versioned `StickerGenerationEngine` behavior.                                                                                                |

Python, TensorFlow Lite/ONNX conversion tools, Hugging Face `diffusers`, source checkpoints,
calibration data, training data, and workstation GPU dependencies do not run on-device and do not
ship in the app binary. This distinction follows the PRD's explicit offline workstation pipeline
([PRD § 9 — Model Development Tooling](./PRD_AI_Sticker_Generator.md#model-development-tooling-offline-workstation-pipeline--not-shipped-in-the-app)).

## Candidate Selection Criteria

A candidate record must identify:

- source repository/revision, immutable digest, model family/version, architecture, parameter and
  component inventory, output dimensions, and intended prompt distribution;
- Plan A open-ended, Plan B constrained prompt-builder, or Plan C template-bundle applicability;
- a documented TFLite or ONNX Runtime Mobile conversion route for Plan A/B, or the
  `template-fallback`/`template-bundle` adapter for Plan C;
- candidate runtime and version, model format, precision/quantization variants, memory estimate,
  artifact-size estimate, and expected `CPU`/`GPU`/`NNAPI`/`NPU` support;
- source and derivative license/provenance status, attribution obligations, use restrictions, and
  redistribution rights; and
- deterministic validation inputs: safe prompt case IDs, style preset, seed, output dimensions,
  source-output references, and calibration-data digest where quantization applies.

For Plan A/B, evaluate the PRD's LCM-distilled Stable Diffusion 1.5-architecture candidate and a
backup with an existing mobile conversion path. Exact model, runtime, precision, and delegates are
empirical choices, not defaults. Ideogram 4.0 remains rejected for direct deployment by the PRD's
compute, licensing, and task-fit analysis
([PRD § 9 — Generation Model](./PRD_AI_Sticker_Generator.md#generation-model)).

Candidate screening may happen on a workstation, but only the
[feasibility spike](./FEASIBILITY_SPIKE.md) can make a candidate shippable.

## License and Provenance Gate

No source, derivative, adapter, LoRA, calibration/training dataset, runtime library, or template
asset may advance to release eligibility without a signed record. The example at
`governance/model_license_registry.example.yaml` demonstrates fields only; it is neither a complete
bill of materials nor legal approval.

For every component, record:

| Field group      | Required record                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity         | Component ID, name/version, source URI, immutable source revision/digest, acquisition date, and custodian.                                                                                        |
| Rights           | License name/version/text digest, copyright owner, commercial-use and redistribution decision, derivative/fine-tuning terms, use restrictions, attribution/notice obligations, and reviewer/date. |
| Provenance       | Chain from source to conversion, quantization, fine-tune/adapter merge, and final artifact; commands/environment IDs; dataset or template provenance and consent where applicable.                |
| Manifest binding | Exact `licenseId`, `modelId`, `modelVersion`, and final `artifactSha256`/`artifactBytes`.                                                                                                         |
| Release decision | `approved`, `rejected`, or `needs review`, rationale, legal/product approver, date, and required notices.                                                                                         |

Only `approved` components may enter a selectable release bundle. `rejected` or unresolved records
block that candidate regardless of performance or schedule. A transformed artifact inherits all
applicable source obligations; conversion or quantization does not erase them. Training data for a
LoRA requires clear licensed/permissive rights or commissioned-original provenance before training,
as required by the PRD risk mitigation
([PRD § 11 — Risk Register](./PRD_AI_Sticker_Generator.md#risk-register)). Plan C template artwork,
fonts, parameters, and bundle metadata pass the same gate.

## Workstation Preparation Pipeline

Each preparation run uses an isolated, pinned environment and produces a machine-readable run
record:

1. Resolve the approved source revision and verify its digest and license/provenance record.
2. Pin operating system/container identity, Python version, package lock, converter/runtime tools,
   source library revisions, hardware, and relevant environment variables. Archive the lock and
   tool output.
3. Materialize source components without modifying the source record. If Plan A/B includes a LoRA,
   record dataset manifest/digest, consent/license status, base revision, training configuration,
   seed, checkpoints, and merge method.
4. Export one converted artifact per runtime candidate. Never overwrite a prior artifact; assign an
   immutable candidate/run ID.
5. Produce separately identified precision/quantization variants using versioned calibration data
   where required.
6. Validate workstation outputs against source outputs, calculate checksums, generate a candidate
   `ModelManifest`, and package the files for physical-device testing.
7. Attach the exact commands, logs, duration, warnings, failures, file inventory, and checksums to
   the reproducibility record.

The current `experiments/benchmark/runner.py` mock-backend result may remain a workstation tooling
smoke check, but it cannot validate the shipped model runtime, delegate, `DeviceCapabilities`,
Segmentation, `GenerationResult`, generated-asset provenance, or feasibility.

## Conversion and Quantization

TFLite and ONNX Runtime Mobile are alternative candidates until the spike. A preparation run may
generate variants for comparison, but the release must include only the selected runtime and its
validated artifacts; the app must not carry both runtime dependencies merely because both were
evaluated.

For every conversion:

- record source input/output tensor names, shapes, dtypes, component split, opset/schema, tokenizer
  and scheduler revisions, text-encoder/denoising/decoder wiring, and LCM step configuration;
- record converter name/version/commit, flags, unsupported or rewritten operations, custom ops,
  graph changes, warnings, and resulting artifact inventory;
- preserve deterministic safe validation cases and fixed seeds before and after conversion; and
- fail the run when any expected component is missing or converter output cannot be reproduced.

For every int8, float16, or other quantization variant:

- record algorithm, per-tensor/per-channel choice, calibration dataset ID/digest and provenance,
  excluded operations, input/output dtype, and quantization tool version;
- issue a new artifact ID, `modelVersion` or build identity, byte size, and SHA-256; never reuse the
  converted artifact's identity; and
- validate quality, transparent-edge behavior, latency, memory, battery, thermal, and delegate
  compatibility on physical devices. Quantization is not accepted from workstation size or output
  inspection alone.

No precision is preselected. The PRD identifies int8/float16 as likely options but requires the
choice to be tuned empirically across chip vendors
([PRD § 9 — Generation Model](./PRD_AI_Sticker_Generator.md#generation-model)).

## Validation Against Source Outputs

Use the same versioned safe case ID, normalized prompt, fixed safety negative prompt, style preset,
seed, scheduler/step settings, and dimensions for source, converted, and quantized variants. Retain:

- source, converted, and quantized output references plus SHA-256 and generation metadata;
- component-level numeric comparison data where deterministic comparison is meaningful;
- blinded visual review for subject fidelity, sticker-style usefulness, and conversion/quantization
  regressions;
- Segmentation and transparent-edge review of the final persisted PNG, not only raw model output;
  and
- every divergence, unsupported case, reviewer decision, and candidate disposition.

Source equivalence on a workstation does not establish device feasibility. A candidate advances
only when it also satisfies the Product-owner-approved thresholds and physical-device protocol in
[Week 1 On-Device Feasibility Spike](./FEASIBILITY_SPIKE.md#measurement-protocol). Do not invent a
numeric equivalence tolerance; record the approved criterion and evidence used for the candidate
decision.

## Model Manifest Generation

Publish one immutable manifest for each exact selected-plan artifact. Use the contract field names
and meanings exactly:

```text
manifestVersion
modelId
modelVersion
runtime
runtimeVersion
quantization
artifactSha256
artifactBytes
minimumMemoryMb
supportedDelegates
inputWidth
inputHeight
licenseId
```

Manifest generation must be deterministic from the artifact inventory and signed-off provenance
record. Calculate `artifactSha256` over the exact bytes installed/read by the runtime, record the
exact `artifactBytes`, derive no field from a mutable filename, and validate positive input bounds.
`inputWidth` and `inputHeight` are maximum square-request bounds. `supportedDelegates` is evidence
backed; it is not a wish list from runtime documentation.

Before `prepareModel` or generation, the shipped implementation verifies artifact checksum,
runtime/version compatibility, `minimumMemoryMb`, input bounds, license binding, and at least one
usable delegate reported by `DeviceCapabilities`. Map failures to `MODEL_NOT_AVAILABLE`,
`MODEL_INCOMPATIBLE`, or `INSUFFICIENT_MEMORY` as defined by the
[Model Manifest Contract](./INTEGRATION_CONTRACTS.md#model-manifest-contract).

For Plan C, preserve the contract adapter exactly: `modelId` is `template-fallback`, `runtime` is
`template-bundle`, `quantization` is `none`, `runtimeVersion` identifies the adapter, artifact and
license fields describe the local template bundle, and dimensions describe its supported square
output.

## App Packaging Strategy

Choose packaging only after real artifact and install-size evidence from the spike:

| Candidate strategy                                   | Acceptance responsibility                                                                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bundle in the release app/AAB                        | Verify signed-bundle and installed footprint, artifact integrity after install, first launch, update, rollback, and fully local post-install operation.                              |
| Google Play Asset Delivery, if real size requires it | Verify delivery mode, integrity, interrupted/missing delivery recovery, update/rollback, capability-gate messaging, and fully local operation after the required asset is installed. |

Do not create a cloud inference or custom download service. The PRD allows normal app-store
installation but requires the core experience to run fully locally afterward
([PRD § 6 — Assumptions and Constraints](./PRD_AI_Sticker_Generator.md#6-assumptions-constraints--dependencies)).
The ML Kit Subject Segmentation module is a separate Play-Services-delivered dependency; validate
its first-install flow and offline-after-install behavior in the spike.

The release bundle contains only the selected plan's approved runtime libraries, artifacts,
manifest, required notices, and template assets. Source checkpoints, Python, converters,
calibration/training data, and unused TFLite/ONNX candidate runtime do not ship. Risk #11 leaves
bundling versus Play Asset Delivery open until the real artifact size is known
([PRD § 11 — Risk Register](./PRD_AI_Sticker_Generator.md#risk-register)).

## Runtime Delegate Selection

The production runtime remains undecided until representative physical-device evidence selects
TFLite or ONNX Runtime Mobile for Plan A/B. They are candidates, not simultaneous production
dependencies. For each tested device, retain `DeviceCapabilities.totalMemoryClassMb`,
`availableDelegates`, and `runtimeVersion`, plus the actual delegate used for each run.

The selected runtime adapter must:

1. verify the manifest and artifact before advertising readiness;
2. intersect `ModelManifest.supportedDelegates` with `DeviceCapabilities.availableDelegates`;
3. choose only a delegate validated for that exact runtime/artifact/device class and record the
   choice in device evidence;
4. report unsupported runtime, memory, artifact, or delegate conditions through contract reason
   codes/errors before generation; and
5. avoid an undocumented CPU or alternate-delegate fallback. Any fallback policy must be separately
   measured, manifested as compatible, and included in the supported capability-gate scope.

A documentation claim or emulator success cannot add a delegate to `supportedDelegates`. Runtime,
model, delegate, or implementation substitution is allowed only when all contract `1.0` behavior,
manifest fields, error mappings, and fixtures remain compatible
([Integration Contracts — Compatibility and Versioning](./INTEGRATION_CONTRACTS.md#compatibility-and-versioning)).

## Inference and Segmentation Sequence

The shipped path remains behind `StickerGenerationEngine` and uses the contract's canonical
sequence:

```text
validating -> preparing_model -> generating -> removing_background -> encoding -> completed
```

1. The Capability gate obtains `DeviceCapabilities`; unsupported devices do not start generation.
2. The Safety filter normalizes and evaluates the prompt before the native bridge. Only an allowed
   normalized prompt enters a generation request; a blocked prompt yields `PROMPT_BLOCKED` and no
   native work.
3. `prepareModel` verifies the exact `ModelManifest`, artifact integrity, runtime, memory, dimensions,
   and usable delegate.
4. The Generation orchestrator admits one contract-valid request. The Model runtime applies the
   fixed safety negative prompt and executes locally with the request's style preset, seed, and
   square dimensions.
5. Segmentation converts the raw output to a transparent subject cutout. Encoding produces PNG
   bytes; the Asset repository durably persists them and then creates one immutable
   `GeneratedAsset`.
6. A successful terminal `GenerationResult` references that generated asset. A failed or cancelled
   result creates no gallery item, emits no later `completed`, and cleans partial files.

Generated-asset provenance retains `assetId`, `requestId`, local URI, PNG MIME type, dimensions,
byte size, SHA-256, UTC creation time, one-way `promptDigest`, `modelId`, `modelVersion`, and seed.
Raw prompt text is not persisted in the generated-asset record
([Integration Contracts — Generated Asset Contract](./INTEGRATION_CONTRACTS.md#generated-asset-contract)).

Plan B changes the allowed input distribution, not this lifecycle. Plan C uses the template-bundle
adapter while preserving readiness, progress, errors, output, cancellation, and persistence
semantics.

## Artifact Integrity and Rollback

- Treat every source, converted, quantized, manifest, and release artifact as immutable. A byte
  change produces a new artifact identity and checksum.
- Verify SHA-256 and byte length after preparation, after packaging/extraction or asset delivery,
  before `prepareModel`, and in release verification. Never execute a mismatched artifact.
- Bind each app/release-bundle version to an allowlisted manifest and artifact set. Reject unknown,
  missing, partially delivered, license-unapproved, runtime-incompatible, or memory-incompatible
  artifacts with the contract error taxonomy.
- Retain the previous approved release bundle, manifest, required notices, and evidence reference as
  the rollback unit. Rollback changes the complete compatible set; it does not mix old runtime
  libraries with new weights or manifests.
- Validate fresh install, app update, interrupted delivery where applicable, rollback, offline
  relaunch, and generated-asset compatibility on representative physical devices. Existing local
  generated assets remain immutable and resolvable across rollback.
- Record rollback trigger, approving owner, from/to build and artifact identities, package digests,
  reason, execution evidence, and resulting roadmap/release status. A revoked or incompatible
  license immediately blocks new release use and triggers the approved replacement/rollback path.

Rollback is a packaged release operation, not an unreviewed network model swap. A runtime/artifact
change that alters observable behavior follows the contract
[Change Procedure](./INTEGRATION_CONTRACTS.md#change-procedure).

## Reproducibility Evidence

For each candidate and selected release bundle, archive or link an immutable evidence index with:

- source revisions/digests and complete license/provenance decisions;
- pinned environment/container identity, OS/hardware, package locks, tool revisions, commands,
  configuration, random seeds, start/end timestamps, logs, warnings, and failures;
- dataset/calibration manifests, consent/license status, digests, and transformation records;
- source, converted, and quantized artifact inventories, sizes, SHA-256 values, and validation
  outputs;
- generated `ModelManifest`, deterministic-generation input set, source comparison, and reviewer
  decisions;
- app build/release bundle identity, packaging mode, notices, device matrix, `DeviceCapabilities`,
  actual delegate, contract fixtures, and physical-device measurements;
- Segmentation delivery/quality, terminal `GenerationResult`, generated-asset provenance, failure,
  cleanup, recovery, integrity, update, and rollback evidence; and
- the signed feasibility Decision Record, selected plan/runtime scope, threshold approvals, known
  limitations, and `ROADMAP.md` consequences.

The evidence package uses the canonical
[`CHECKSUMS.sha256` and signed-attestation procedure](./FEASIBILITY_SPIKE.md#canonical-checksum-manifest-package-digest-and-attestation).
Finalize all hashed evidence without a package-digest field; enumerate normalized relative POSIX
paths sorted lexicographically by UTF-8 bytes; exclude exactly root-relative `CHECKSUMS.sha256` and
`PACKAGE_ATTESTATION.json`; serialize lowercase SHA-256 as exact `<sha256>  <path>\n` UTF-8/LF
lines; and hash the final manifest bytes. Then create the excluded RFC 8785 JCS-canonicalized signed
attestation. Signature verification provides the sidecar's authenticity, and the external
roadmap/release decision record references it. Record checksum/signing tool versions and exact
command or script revisions before finalization. Any included evidence-file change produces a new
manifest, digest, signed attestation, package identity, and external reference; never mutate an
approved package in place.

The Native/ML lead signs preparation accuracy and manifest binding. QA independently verifies
checksums, reproduction instructions, contract fixtures, and device evidence. Product-owner and
Safety-owner approvals are attached where required. A workstation-only run, mock backend output,
or mutable latest-version reference is not reproducibility evidence for a release.

## Explicit Non-Goals

- Selecting a production model, runtime, quantization, delegate, or packaging mode before the Week
  1 physical-device decision.
- Shipping both TFLite and ONNX Runtime Mobile because both were evaluated.
- Reviving MediaPipe Image Generator as the default release path or treating Gemini Nano/AICore as
  a text-to-image runtime; the PRD explicitly rejects those shortcuts.
- Shipping workstation Python, converters, source checkpoints, `diffusers`, training/calibration
  data, or development GPU dependencies in the app.
- Adding cloud inference, a custom model-download backend, server-side generation, or a network
  requirement after installation.
- Inventing a new base model from scratch. The release uses pretrained/distilled models, with an
  optional licensed LoRA fine-tune for Plan A/B.
- Expanding V1 to output-image moderation; the pipeline preserves the input Safety filter and fixed
  safety negative prompt only
  ([PRD § 10 — Content Safety & Moderation](./PRD_AI_Sticker_Generator.md#10-content-safety--moderation)).
- Claiming Plan C is open-ended generation, or bypassing license/provenance review for template
  assets.
- Replacing the Integration Contracts, roadmap, release guide, or feasibility evidence package;
  this document defines artifact preparation and delivery responsibilities only.

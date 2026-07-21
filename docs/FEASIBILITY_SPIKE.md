# Week 1 On-Device Feasibility Spike

## Document Control

**Document role:** Experiment protocol. The current feasibility-decision status is recorded only in
[Roadmap `W1-06`](./ROADMAP.md#week-1-feasibility-and-gono-go).

**Owners:** Native/ML lead (execution), QA lead (evidence), Product owner (exit-threshold and
plan approval), and Safety owner (safety evidence).

**Decision date:** Approximately Day 4 of Week 1.

**Authority:** The [PRD](./PRD_AI_Sticker_Generator.md) is authoritative. The spike implements
the [Week 1 feasibility milestone](./PRD_AI_Sticker_Generator.md#week-1--feasibility-spike--gono-go)
and the [formal contingency ladder](./PRD_AI_Sticker_Generator.md#contingency-ladder-formalized).
Observable application/runtime behavior and evidence vocabulary come from the
[Integration Contracts](./INTEGRATION_CONTRACTS.md).

The repository currently has PRD, roadmap, contract, model-license-registry example, and mock
benchmark scaffolding, but no completed repeatable physical-device evidence package. In
particular, `experiments/benchmark/runner.py` exercises a mock backend provider on a workstation;
its output is not evidence of `DeviceCapabilities`, on-device model execution, Segmentation, a
transparent `GeneratedAsset`, or a terminal `GenerationResult`. Desktop or emulator results may
help debug tooling but can never establish a spike pass.

## Decision to Be Made

Select exactly one contingency plan and, for Plan A or Plan B, one production model/runtime
combination:

- **Plan A:** open-ended on-device generative pipeline.
- **Plan B:** constrained prompt-builder using the validated generative pipeline.
- **Plan C:** template-based fallback with no claim of open-ended generation.

The decision also identifies the supported delegate set, artifact, quantization, packaging
strategy, and any capability-gate consequences. TFLite and ONNX Runtime Mobile are candidates;
they are not simultaneous release dependencies. No production runtime or model is selected until
the license gate and this protocol's representative physical-device evidence are complete. This
implements the PRD's empirical model selection and contingency requirements
([PRD § 9 — Generation Model](./PRD_AI_Sticker_Generator.md#generation-model),
[PRD § 11 — Contingency Ladder](./PRD_AI_Sticker_Generator.md#contingency-ladder-formalized)).

## Hypotheses

| ID   | Hypothesis                                                                                                                                                               | Evidence needed                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `H1` | An open-ended candidate can complete the local generation request and Segmentation sequence on the PRD device floor.                                                     | Successful `GenerationResult`, valid transparent `GeneratedAsset`, and complete metric record per device/candidate combination.      |
| `H2` | The candidate clears the approved thresholds across representative floor devices from multiple chip vendors, rather than only on one flagship or delegate.               | Physical-device matrix, `DeviceCapabilities`, delegate used, per-run results, failures, and recovery evidence.                       |
| `H3` | ML Kit Subject Segmentation handles stylized/cartoon output and its Play-Services-delivered module behaves correctly in the install flow.                                | Install/download record, transparent-edge review, segmentation latency, offline-after-install result, and failure/recovery evidence. |
| `H4` | Artifact size, install impact, memory, battery, and thermal behavior permit the selected path to ship without a cloud inference fallback.                                | Approved thresholds and measured median/worst values from the exact release-like artifact and build.                                 |
| `H5` | Every source model, converted/quantized artifact, fine-tune input, and template asset used by a selectable plan has compatible licensing and traceable provenance.       | Signed license/provenance decision linked by `ModelManifest.licenseId` and `artifactSha256`.                                         |
| `H6` | The generation path preserves the contract's progress, terminal-result, cancellation, persistence, and recovery semantics when successful and when deliberately faulted. | Contract fixture results, terminal `GenerationResult`, generated-asset provenance, crash/fault logs, and clean subsequent retry.     |
| `H7` | The selected path preserves the input-side Safety filter boundary and applies the fixed safety negative prompt without introducing output moderation.                    | Safety decision fixture results and wire-capture evidence; no raw blocked prompt in the package.                                     |

The hypotheses bind to the PRD's on-device architecture and full-pipeline latency definition
([PRD § 8 — System Design & Architecture](./PRD_AI_Sticker_Generator.md#8-system-design--architecture))
and its named fragmentation, segmentation, size, and failure risks
([PRD § 11 — Risk Register](./PRD_AI_Sticker_Generator.md#risk-register)).

## Candidate Runtime and Model Matrix

Register one to two candidate base models, including the PRD's primary LCM-distilled Stable
Diffusion 1.5-architecture candidate and a backup with an existing mobile conversion path. Add a
row for every runtime, model, precision/quantization, delegate, and artifact combination actually
tested; do not merge results across artifacts.

| Candidate ID | Model family/version | Source revision and digest | Runtime candidate and version | Converted format | Quantization | `artifactSha256` | `artifactBytes` | `licenseId` | Delegate(s) intended | Status  |
| ------------ | -------------------- | -------------------------- | ----------------------------- | ---------------- | ------------ | ---------------- | --------------- | ----------- | -------------------- | ------- |
| To record    | To record            | To record                  | TFLite or ONNX Runtime Mobile | To record        | To record    | To record        | To record       | To record   | To record            | Pending |

MediaPipe Image Generator is excluded from the release candidate matrix because the PRD rejects
it as the default maintained path. Quantization may include int8 or float16 variants, but the exact
choice remains empirical and every variant receives a distinct artifact identity and manifest
([PRD § 9 — Generation Model](./PRD_AI_Sticker_Generator.md#generation-model)).

## Device Test Matrix

The support floor is **Snapdragon 7-series / Google Tensor G2-equivalent and above**. A device is
eligible only when its contract-defined `DeviceCapabilities` also reports `supported: true`,
the exact explicit wire token `reasonCode: "SUPPORTED"`, a usable `availableDelegates` entry, and
the tested `runtimeVersion`.
Below-floor devices are negative capability-gate fixtures, not evidence that a candidate meets the
floor ([PRD § 5 — Deployable Release Scope](./PRD_AI_Sticker_Generator.md#deployable-release-scope-5-weeks--fixed-deadline),
[Integration Contracts — Application Generation Port](./INTEGRATION_CONTRACTS.md#application-generation-port)).

Use multiple physical devices spanning different chip vendors. Track the PRD's named Qualcomm,
Samsung Exynos, MediaTek, and Google Tensor fragmentation spread; the evidence summary must state
which vendors were represented and explain any unavailable vendor. A single flagship, desktop,
emulator, or cloud simulation is insufficient.

| Device ID | Physical device | Vendor/model/SoC | Android/build | Memory class (MB) | Floor rationale | `DeviceCapabilities` result | Available delegates | Runtime version | Owner     | Evidence path |
| --------- | --------------- | ---------------- | ------------- | ----------------- | --------------- | --------------------------- | ------------------- | --------------- | --------- | ------------- |
| To record | Yes             | To record        | To record     | To record         | To record       | To record                   | To record           | To record       | To record | To record     |

Also record one below-floor physical-device result when available to prove that the capability gate
stops the flow with `DEVICE_UNSUPPORTED`; it does not contribute a candidate pass.

## Test Inputs and Golden Prompts

Version a safe golden-prompt set and store its file digest in the evidence package. It must cover:

- single people, pets, and objects for Segmentation coverage;
- simple and visually complex silhouettes, including fine transparent edges;
- light and dark subjects/backgrounds;
- the open-ended prompt distribution for Plan A;
- every selectable subject, expression, and style-tag combination class for Plan B; and
- deterministic template inputs for Plan C.

Each measured request records golden-set version, prompt case ID, `stylePresetId`, fixed `seed`,
requested square dimensions within `ModelManifest.inputWidth` and `inputHeight`, candidate ID, and
device ID. Store only approved safe prompt text. Safety smoke cases use versioned fixture IDs and
digests; blocked raw prompts and production user prompts must not appear in evidence, logs, wire
captures, or generated-asset records
([Integration Contracts — Contract Test Fixtures](./INTEGRATION_CONTRACTS.md#contract-test-fixtures)).

## Measurement Protocol

### Controlled setup

For each device/candidate combination:

1. Install the release-like build and exact candidate artifact. Record build ID, artifact checksum,
   manifest, install source, power/charging state, battery level, ambient conditions, network state,
   Android build, background-process policy, runtime version, and available delegates.
2. Exercise first-install delivery, including ML Kit Subject Segmentation's Play Services module.
   Then disable connectivity and confirm that the installed core generation path remains local and
   usable, as required by the PRD assumptions
   ([PRD § 6 — Assumptions](./PRD_AI_Sticker_Generator.md#assumptions)).
3. Capture `DeviceCapabilities` before model preparation. Verify `ModelManifest.artifactSha256`,
   runtime compatibility, memory requirement, and a usable delegate before generation.
4. Run one unmeasured warm-up request. Then run at least three measured repetitions for every
   device/candidate/prompt case. Do not discard failed, throttled, or recovered repetitions.
5. Reset only the state required by the measurement definition. Record every reset, pause, and
   deviation. Use monotonic device-side timestamps and retain the raw trace.
6. Report every individual value plus the median and worst observed value for each
   device/candidate/prompt case and in the candidate summary. Never substitute workstation or
   emulator measurements.

### Controlled battery measurement blocks

Battery evidence is a separate repeated-block protocol, not a single before/after reading attached
to the general repetition set. For every physical device/model/configuration combination after its
warm-up:

1. Define a configuration ID that fixes the artifact and `ModelManifest`, runtime/version,
   quantization, delegate, build, prompt-case sequence, seed sequence, dimensions, and thermal
   starting policy.
2. Predeclare and hold constant both the generation count and target block duration. Record actual
   count and elapsed duration; a failed generation remains part of the block.
3. Use a predeclared starting-charge band, keep the device unplugged, and fix screen brightness,
   network state, background-app/process policy, power mode, and other controllable device settings.
   Record the values and every deviation for each block.
4. Run at least three controlled battery measurement blocks per
   device/model/configuration combination. Restore the declared starting conditions before each
   block; do not treat multiple readings from one continuous discharge as independent blocks.
5. Capture raw battery level and every available charge/energy counter immediately before and
   after each block, with monotonic timestamps, thermal state, and the measurement tool/version.
6. For every block, report raw start/end readings, raw delta, delta per successful and attempted
   generation, and delta per minute. Report the median and worst observed normalized deltas across
   blocks without dropping failed or thermally affected blocks.

If the platform/device cannot provide sufficiently granular repeated observations, record the
literal result `measurement unavailable`, the attempted tools/APIs, and the limitation. This is a
blocking evidence gap for Plan A and Plan B. Plan C may treat battery measurement as `N/A` only when
the Product owner records an approval, date, and plan-specific rationale in the Decision Record;
absence of a granular counter is not an automatic waiver.

### Crash and recovery fault matrix

Execute the following matrix against the exact release-like build on every representative device.
Each matrix cell is an independently identified fault case and receives at least three repetitions
after the normal warm-up. Retain the injection timestamp/stage, progress prefix, terminal transport
or termination evidence, files/database state, relaunch trace, and retry result for every
repetition.

| Fault point           | Controlled component exception                                                                                                                                                                                                                   | App-process termination                                                                                                                   | OS termination                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `preparing_model`     | Inject a deterministic model-load/preparation exception after the request is admitted; expect exactly one failed `GenerationResult` with `MODEL_NOT_AVAILABLE` (or `MODEL_INCOMPATIBLE` only when the injected condition is an incompatibility). | Kill only the app process after the `preparing_model` progress stage is observed.                                                         | Use a documented OS/test-harness force-stop or low-memory-kill mechanism while preparation is active; retain the system termination reason.    |
| `generating`          | Inject a deterministic Model runtime exception; expect exactly one failed `GenerationResult` with `INFERENCE_FAILED`.                                                                                                                            | Kill only the app process while the Model runtime is executing.                                                                           | Use a documented OS/test-harness force-stop or low-memory-kill mechanism while generation is active; retain the system termination reason.     |
| `removing_background` | Inject a deterministic Segmentation exception; expect exactly one failed `GenerationResult` with `SEGMENTATION_FAILED`.                                                                                                                          | Kill only the app process while Segmentation is active.                                                                                   | Use a documented OS/test-harness force-stop or low-memory-kill mechanism while Segmentation is active; retain the system termination reason.   |
| `encoding`            | Inject a deterministic PNG-encoding exception; expect exactly one failed `GenerationResult` with `ASSET_ENCODING_FAILED`.                                                                                                                        | Kill only the app process while encoding is active.                                                                                       | Use a documented OS/test-harness force-stop or low-memory-kill mechanism while encoding is active; retain the system termination reason.       |
| Asset persistence     | Inject a deterministic durable-write/repository exception; expect exactly one failed `GenerationResult` with `ASSET_STORAGE_FAILED`.                                                                                                             | Kill only the app process after the temporary/partial write begins but before durable persistence and `GeneratedAsset` creation complete. | Use a documented OS/test-harness force-stop or low-memory-kill mechanism in the same persistence window; retain the system termination reason. |

A **controlled component exception** leaves the process alive and must produce the listed single
failed `GenerationResult`. An **app-process termination** kills only this process and therefore may
prevent a terminal result from being delivered. An **OS termination** is initiated/recorded by the
OS or a documented harness and must not be relabeled as an injected component exception or app-only
kill. If an OS termination method cannot be made deterministic for a cell, record
`measurement unavailable` as an evidence gap and apply the all-plan applicability/N/A rules below;
do not silently substitute another fault class.

For every fault class and point, verify all of the following:

- no `completed` progress event occurs after the injected failure or termination; process/OS kills
  have no later event emitted by a resurrected stale request;
- temporary and partial model/output/PNG files are removed or safely quarantined, no gallery item or
  orphan `GeneratedAsset` is created, and prior generated assets remain intact;
- the app relaunches to a valid non-busy state, persistent storage and manifest state remain
  readable, `prepareModel` can re-establish readiness where applicable, and no request is silently
  resumed;
- a new request with a new `requestId` succeeds after recovery; and
- state-corruption checks cover database integrity, duplicate IDs/rows, stuck active-request flags,
  checksum/manifest state, and user-visible recovery behavior.

### Measurements and decision fields

The PRD defines the device floor but does not provide numeric exit values for the following
measurements. Consequently, each row's decision field is explicitly **Spike exit threshold
requiring product-owner approval**. The approved numeric value, unit, direction, scope, approver,
and approval date must be entered in the Decision Record for every applicable selected-plan field.
An applicable incomplete field blocks that Plan A, Plan B, or Plan C selection. `N/A` requires a
Product-owner approval, date, and plan-specific rationale; it is never implied by missing evidence.
A reference value in the PRD, such as ML Kit's approximately 200 ms Pixel 7 Pro figure, is
context—not a pass threshold
([PRD § 9 — Background Removal](./PRD_AI_Sticker_Generator.md#background-removal)).

| Measurement                                | Start/stop and evidence definition                                                                                                                                                                                      | Required summary                                                                                                                                                                          | Decision field                                        |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Cold start                                 | Release-like process start with model unloaded through terminal `GenerationResult`; separately retain model-prepare, generation, Segmentation, encoding, and persistence timestamps.                                    | Median and worst milliseconds; outcome/error per run.                                                                                                                                     | Spike exit threshold requiring product-owner approval |
| Warm generation                            | Admitted generation request with the exact artifact already prepared through raw model output; no Segmentation time included.                                                                                           | Median and worst milliseconds; delegate and outcome per run.                                                                                                                              | Spike exit threshold requiring product-owner approval |
| Total generation plus Segmentation latency | Start of admitted generation work through Segmentation output; retain generation and Segmentation sub-durations. This is the PRD's user-relevant combined pipeline measurement, not inference alone.                    | Median and worst milliseconds; terminal outcome per run.                                                                                                                                  | Spike exit threshold requiring product-owner approval |
| Peak resident memory                       | Device-observed process resident memory from pre-request baseline through terminal result; record baseline, peak, delta, and measurement tool.                                                                          | Median and worst peak/delta MB; any `INSUFFICIENT_MEMORY` or OS kill.                                                                                                                     | Spike exit threshold requiring product-owner approval |
| Artifact size                              | Exact bytes of every runtime/model/template payload represented by the `ModelManifest`.                                                                                                                                 | `artifactBytes`, checksum, and total bytes by candidate.                                                                                                                                  | Spike exit threshold requiring product-owner approval |
| Install-size impact                        | Difference between otherwise-equivalent signed release-like builds without and with the candidate payload/runtime; separately record base and installed/device footprints.                                              | Byte totals and delta for download/install footprints.                                                                                                                                    | Spike exit threshold requiring product-owner approval |
| Battery delta                              | At least three independent controlled battery blocks per device/model/configuration after warm-up, with fixed count/duration and controlled starting charge, unplugged state, brightness, network, and background apps. | Raw start/end readings and per-block delta per attempted/successful generation and minute; median and worst normalized block values, or blocking `measurement unavailable`.               | Spike exit threshold requiring product-owner approval |
| Thermal state                              | Device thermal status at setup, before/after each run, and at completion; retain temperature sensors when available and any throttle signal.                                                                            | Worst state/temperature, time to throttle, affected runs, and recovery time.                                                                                                              | Spike exit threshold requiring product-owner approval |
| Crash/recovery behavior                    | At least three repetitions for every controlled-exception, app-process-termination, and OS-termination cell in the required fault matrix across preparation, generation, Segmentation, encoding, and persistence.       | Terminal/error or termination evidence, no later `completed`, cleanup, relaunch/readiness, successful new retry, state-corruption checks, and median/worst failure/recovery observations. | Spike exit threshold requiring product-owner approval |
| Transparent-edge quality                   | Review the persisted transparent PNG at original resolution and composited on light, dark, and checkered backgrounds for subject retention, missing regions, halos, jagged edges, and unwanted background.              | Per-case reviewer verdict/notes, representative crops, failure count, and candidate summary.                                                                                              | Spike exit threshold requiring product-owner approval |

Every successful measured run retains the succeeded `GenerationResult` and generated-asset
provenance: `assetId`, `requestId`, `mimeType`, dimensions, `byteSize`, `sha256`, `createdAt`,
`promptDigest`, `modelId`, `modelVersion`, and `seed`. Raw prompts are not stored in the
`GeneratedAsset`. Every failed run retains its `GenerationError` and confirms that no gallery item
was created ([Integration Contracts — Generated Asset Contract](./INTEGRATION_CONTRACTS.md#generated-asset-contract)).

## Quality Review Protocol

Version the rubric and record its ID/digest in every review sheet and Decision Record. A rubric
change creates a new version and requires the affected sample set to be reviewed again. All scales
run from 1 (unacceptable) through 5 (excellent):

| Dimension                      | 1                                                                                           | 2                                                                                    | 3                                                                                               | 4                                                                                | 5                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Prompt adherence               | Output misses or contradicts the requested subject/action/attributes.                       | Only a minority of requested concepts are recognizable; major contradictions remain. | Core subject is recognizable but one or more important requested concepts are missing or wrong. | All important concepts are present with only minor interpretation drift.         | Requested subject, action, expression, and applicable style concepts are represented accurately and coherently.                           |
| Sticker suitability            | Output is unusable as a sticker: unclear focal subject, composition, or visual read.        | Focal subject/composition is weak and requires major rework before chat use.         | Usable in limited contexts; subject reads, but composition/style has visible weaknesses.        | Clearly usable as a sticker with only minor composition/style issues.            | Immediately readable, expressive, well-composed, and suitable for casual chat use without rework.                                         |
| Subject integrity              | Subject is materially missing, broken, duplicated, or anatomically/structurally incoherent. | Major subject regions are malformed or missing and distract from the result.         | Subject remains recognizable but contains visible local deformation, loss, or duplication.      | Subject is intact with only small defects that do not impair recognition.        | Subject is complete, coherent, and preserved without visible structural defects.                                                          |
| Background transparency / halo | Background remains substantially opaque or severe halo/contamination surrounds the subject. | Large background remnants or strong halo are visible on multiple review backdrops.   | Localized but clearly visible remnants/halo affect usability.                                   | Transparency is correct with only minor, non-distracting remnant/halo artifacts. | Background is fully transparent around the intended subject with no visible halo or contamination on light, dark, or checkered backdrops. |
| Edge cleanliness               | Boundary is severely jagged, clipped, blurred, or noisy around much of the subject.         | Multiple major edge defects or lost fine structures are obvious.                     | Edge is usable but has localized jaggies, clipping, blur, or noisy fine detail.                 | Edge is clean with only minor defects visible on close inspection.               | Boundary is consistently clean and natural, preserving intended fine structures without visible jaggies, clipping, blur, or noise.        |

Review execution is mandatory:

1. Assign randomized sample IDs. Give each reviewer the rendered sample and a safe target
   specification required to judge prompt adherence: either the approved sanitized prompt or an
   explicit approved list of expected subject, action/expression, and style attributes. Version and
   digest the target specification. It must contain no blocked raw prompt or production user prompt.
   Hide candidate ID, physical device, runtime/model, quantization, delegate, seed, contingency
   plan, prompt-case ID, and all other generation metadata. Preserve the sealed mapping separately
   for later analysis.
2. Before any scoring, assign every potential reviewer a stable, opaque, fixed-length ASCII blinded
   reviewer ID. The ID must not encode or reveal identity, role, panel order, candidate, or plan;
   keep the identity mapping sealed. Assign the initial three and potential fourth reviewer's IDs
   before their scores exist. The three initial reviewers independently score every sample on all
   five dimensions from the same safe target specification before seeing another reviewer's scores
   or discussion.
3. Review the persisted transparent PNG at native dimensions and on standardized light, dark, and
   checkered backgrounds. Do not review a workstation re-export.
4. Record randomized sample ID, target-specification ID/digest, rubric version, stable blinded
   reviewer ID, review date, five scores, failure category, and notes. After all independent scoring
   and deterministic disagreement handling are complete, join the sealed case metadata: prompt case
   ID, seed, device, artifact checksum, runtime/model/configuration, and plan distribution.
5. Define reviewer disagreement per sample/dimension as the maximum score minus the minimum score.
   The **reviewer disagreement threshold** is a Spike exit threshold requiring product-owner
   approval; do not invent it. If the range of the initial three scores is less than or equal to the
   approved threshold, the final sample/dimension score is the median of those three scores.
6. If the initial three-score range exceeds the approved threshold `T`, collect a fourth independent
   score from the preassigned additional blinded reviewer, who sees the same sample and safe target
   specification and none of the earlier scores. Let reviewer-score pairs be `(r1, s1)` through
   `(r4, s4)`. Enumerate all four possible three-score subsets exactly:
   `{r1,r2,r3}`, `{r1,r2,r4}`, `{r1,r3,r4}`, and `{r2,r3,r4}`. For each subset, calculate its range
   (`max score - min score`) and its median (the middle score after numeric sort). Select the subset
   deterministically in this order:
   1. smallest subset range;
   2. if tied, smallest absolute distance between the subset median and the median of all four
      scores, where the four-score median is the arithmetic mean of the two middle numerically
      sorted scores; then
   3. if still tied, lexicographically smallest tuple of that subset's three stable blinded reviewer
      IDs after sorting those IDs in ascending ASCII order.
7. If the selected subset range is less than or equal to `T`, mark the excluded reviewer-score pair
   as an adjudicated outlier and use the selected three-score subset's median as the final dimension
   score for threshold comparison. Retain all four raw reviewer-score pairs, all four subset ranges
   and medians, the four-score median, each tie-break value, selected reviewer-ID tuple, excluded
   pair, and final score. Outlier removal is permitted only through this rule; no score may otherwise
   be dropped, replaced, or manually overridden.
8. If the selected subset range exceeds `T`, mark that sample/dimension exactly
   `reviewer_disagreement`; quality evidence is failed/incomplete for plan selection and the sample
   must be generated/reviewed under a new evidence version. There is no undocumented override or
   reviewer discussion that converts unresolved disagreement into a pass.
9. Compare every resolved final sample/dimension score directly with the approved threshold for that
   dimension and candidate plan. A score below threshold is recorded in the worst-case/outlier
   count. For each candidate/device/configuration summary, report final-score median per dimension,
   worst final score per dimension, below-threshold count, and unresolved-disagreement count. Apply
   the Product-owner-approved candidate-level acceptance rule from the Decision Record; do not
   invent an aggregation rule or omit failures by prompt class, chip vendor, or delegate.
10. Compare open-ended cases for Plan A, only the declared constrained distribution for Plan B, and
    only deterministic template capabilities for Plan C. A Plan C output must never be labeled as
    open-ended generation.

Before any plan decision, the Product owner records approved per-dimension quality thresholds,
transparent-edge thresholds, reviewer disagreement threshold, scope, approver, and date in the
Decision Record. The PRD requires generation quality to clear an internal pre-launch bar but
supplies no numeric threshold
([PRD § 4 — Release Acceptance Criteria](./PRD_AI_Sticker_Generator.md#release-acceptance-criteria-pre-launch-gate)).

## Safety Smoke Test

This spike is not the dedicated adversarial red-team pass. It verifies only that the selected-plan
path preserves the V1 safety boundary defined by the PRD
([PRD § 10 — Layered Defense](./PRD_AI_Sticker_Generator.md#layered-defense-v1-scope-input-side-only-no-outputimage-classification)):

- an approved allowed fixture yields
  `SafetyEvaluationResult.Evaluated(SafetyDecision.Allowed)`, and only its normalized prompt
  crosses the on-device runtime adapter;
- a blocked fixture yields `SafetyEvaluationResult.Evaluated(SafetyDecision.Blocked)` with
  `SafetyBlockReasonCode.PROMPT_BLOCKED`, creates no generation request, progress stage,
  `GenerationResult`, generated asset, or gallery item, and reveals neither raw prompt nor matched
  rule in logs or UI;
- each operational failure fixture yields the exact `SafetyEvaluationResult.Failed` code, enters
  failure rather than blocked state, starts no generation/model-runtime work, logs no raw prompt,
  and proves floor-preserving eligible-package recovery;
- the bundled fixed safety negative prompt is applied internally inside every Plan A/Plan B
  generation call without appearing in `GenerationRequest`, a wire payload, or user input; and
- no output/image moderation claim is added to V1.

Record fixture-set version and digest, app/contract/model versions, result, wire-capture path,
log-scan result, owner, and date. Any failed boundary behavior blocks selection until corrected and
retested.

## Evidence Package

Store an immutable package at a recorded path such as
`evidence/feasibility/<YYYY-MM-DD>-<run-id>/`. The path is a naming convention, not evidence by
itself. The package must contain:

| Evidence item       | Required contents                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README`/index      | EvidencePackageId, run ID, UTC start/end, owners, protocol revision, source commit, build ID, selected-plan decision link, checksum tool/version/procedure, and source/artifact/input digests known before package finalization; no packageDigest or attestation-derived value.                                                                                                                                                                                            |
| Candidate inventory | Complete candidate matrix, source provenance, license decision, conversion record, exact `ModelManifest`, artifacts, and checksums.                                                                                                                                                                                                                                                                                                                                        |
| Device inventory    | Complete physical-device matrix, floor rationale, OS/build, memory class, `DeviceCapabilities`, runtime, available and selected delegate, and test owner.                                                                                                                                                                                                                                                                                                                  |
| Golden inputs       | Versioned safe prompt/template set, case metadata, seeds, dimensions, and digest; safety cases referenced only by approved fixture IDs.                                                                                                                                                                                                                                                                                                                                    |
| Raw measurements    | Warm-up markers, every general repetition, at least three controlled battery blocks per device/model/configuration, every fault-matrix repetition, timestamps, metric source, progress/termination traces, `GenerationResult`, failures, battery/thermal/memory traces, and no omitted runs.                                                                                                                                                                               |
| Assets and review   | Persisted transparent PNGs or approved references, generated-asset provenance, rubric and safe-target-specification versions/digests, sealed sample/reviewer-ID maps, independent initial and conditional fourth reviewer-score pairs, every three-score subset range/median and tie-break value, selected/excluded reviewer-ID evidence, final per-dimension scores, threshold comparisons, edge crops, adjudicated-outlier counts, and `reviewer_disagreement` failures. |
| Contract and safety | Capability, allowed, blocked, cancellation, model-incompatible, segmentation-failure, and persistence/recovery fixture results applicable to the spike.                                                                                                                                                                                                                                                                                                                    |
| Summaries           | Per-device/candidate median and worst observations, failure breakdown, vendor/delegate gaps, approved-threshold comparison, and Plan A/B/C recommendation.                                                                                                                                                                                                                                                                                                                 |
| Reproduction        | Pinned workstation conversion environment, commands, source/tool revisions, build configuration, device setup, and known deviations.                                                                                                                                                                                                                                                                                                                                       |
| Decision            | Completed Decision Record, signed approvals, consequences, and linked `ROADMAP.md` changes.                                                                                                                                                                                                                                                                                                                                                                                |

### Canonical checksum manifest, package digest, and attestation

Avoid digest self-reference by using this order exactly:

1. Finalize every evidence file, including the signed Decision Record, with no `packageDigest`,
   checksum-manifest digest, attestation signature, or attestation-derived value written inside the
   hashed content. The evidence index and Decision Record may contain `evidencePackageId`, evidence
   path, checksum tool/version and procedure, but not the resulting package digest.
2. At the evidence-package root, enumerate every regular file except exactly the root-relative files
   `CHECKSUMS.sha256` and `PACKAGE_ATTESTATION.json`. These are the only exclusions. Symlinks,
   absolute paths, `.`/`..` traversal segments, duplicate normalized paths, CR, and LF in filenames
   are forbidden.
3. Express each included path relative to the package root with POSIX `/` separators and no leading
   `./`. Sort normalized relative paths lexicographically by their UTF-8 byte sequences.
4. Calculate SHA-256 over each included file's exact bytes and encode each digest as 64 lowercase
   hexadecimal characters.
5. Serialize `CHECKSUMS.sha256` as exactly one UTF-8-without-BOM line per included file:
   `<sha256>  <path>\n`—digest, two ASCII spaces, normalized relative path, and one LF byte
   (`0x0A`). Use LF for every line including the final line; never serialize CRLF.
6. Hash the final exact bytes of `CHECKSUMS.sha256` with SHA-256. Encode the result as lowercase
   hexadecimal and call it `packageDigest`. `checksumManifestSha256` is the same digest of those
   exact manifest bytes and therefore must equal `packageDigest` in this protocol.
7. Only after that hash is final, create the excluded sidecar `PACKAGE_ATTESTATION.json` containing
   `evidencePackageId`, `packageDigest`, `checksumManifestSha256`, `algorithm`, `signer`, `signedAt`,
   `signatureMetadata`, and `signature`. `algorithm` is `SHA-256`; `signatureMetadata` records the
   organization-approved signature format, signature algorithm, key/certificate identifier, and
   verifier requirements. This protocol does not invent or provision signing infrastructure.

The sidecar has this fixed shape; placeholder values are replaced with actual recorded values:

```json
{
  "algorithm": "SHA-256",
  "checksumManifestSha256": "<64 lowercase hexadecimal characters>",
  "evidencePackageId": "<immutable package identifier>",
  "packageDigest": "<same 64 lowercase hexadecimal characters>",
  "signedAt": "<ISO 8601 UTC timestamp>",
  "signer": {
    "id": "<approved signer identity>",
    "role": "<signer role>"
  },
  "signatureMetadata": {
    "encoding": "<approved signature encoding>",
    "format": "<organization-approved signature format>",
    "keyId": "<approved key or certificate identifier>",
    "signatureAlgorithm": "<organization-approved signature algorithm>",
    "verifierRequirements": "<approved verifier policy/version>"
  },
  "signature": "<encoded signature value>"
}
```

For reproducible signing, remove the top-level `signature` member entirely, then use the RFC 8785
JSON Canonicalization Scheme (JCS) serialization of the remaining attestation object as the
signature input. `signatureMetadata` is inside that signed object. Encode the JCS bytes as UTF-8
and sign them with the organization-approved format identified in `signatureMetadata`; store the
result in `signature` using the encoding declared by that metadata. Verification reconstructs the
same unsigned object, JCS-canonicalizes it, validates the signature with the identified approved
key/certificate, confirms both digest fields are equal, and recomputes the digest from the exact
`CHECKSUMS.sha256` bytes.

`PACKAGE_ATTESTATION.json` is deliberately excluded from `CHECKSUMS.sha256`; its authenticity and
binding are provided by the signature rather than a self-referential digest. The external roadmap
or release decision record—not a hashed evidence file—references `evidencePackageId`, the
attestation path, `packageDigest`, signer/key identifier, and signature verification result.

Record the checksum tool name/version, exact command or script revision, generator platform, and
generation UTC time in the finalized evidence index before hashing. QA regenerates the checksum
manifest from the two-exclusion rule, compares its exact bytes, recomputes both digest fields, and
verifies the attestation signature. Any included evidence-file change creates a new evidence
version/package identity, regenerated manifest/digest, new attestation, and new external reference;
never edit an approved package in place.

The QA lead verifies package completeness and checksums. The Native/ML lead signs runtime,
artifact, and measurement accuracy. The Product owner owns metric thresholds and plan selection;
the Safety owner signs safety evidence.

## Plan A/B/C Decision Rules

### Gate 0: decision prerequisites

Plan selection is blocked, and the roadmap remains **Decision pending Week 1 evidence**, until the
following close sequence is complete:

1. One immutable evidence-package path and results summary.
2. Representative physical-device results at the PRD floor across multiple chip vendors, including
   actual runtime/delegate behavior and any coverage gaps.
3. A signed license/provenance decision for every shipped model, weight, adapter, training input,
   runtime, and template asset. A populated example registry is not legal approval.
4. Exact artifact checksum and `ModelManifest`, plus compatibility, memory, and delegate checks.
5. Completed metric records with median and worst observations and no silently discarded run,
   including controlled battery blocks, fault-matrix repetitions, and rubric summaries.
6. Contract, Segmentation, transparent-asset, failure/recovery, state-corruption, quality-review, and
   safety smoke evidence.
7. Every threshold field applicable to the candidate Plan A, Plan B, or Plan C contains its approved
   value, unit/direction/scope, Product-owner approver, approval date, and evidence comparison.
   Every `N/A` contains Product-owner approval/date and a plan-specific rationale. An incomplete
   applicable field or unapproved `N/A` blocks that plan's selection.
8. The Product owner completes and signs the Decision Record with the candidate selected plan,
   evidencePackageId, consequences, and approvals—but no `packageDigest` or attestation-derived
   value—then all included evidence files are finalized.
9. The canonical `CHECKSUMS.sha256` is generated with only the two exact exclusions, its final bytes
   are hashed, and the excluded signed `PACKAGE_ATTESTATION.json` is created and independently
   verified.
10. The external `ROADMAP.md` contingency/release decision record references the attestation and
    records successful signature/digest verification. Only then is the Plan A/B/C selection
    effective.

`measurement unavailable` is not a pass. It blocks Plan A/B battery evidence and any other plan
whose applicable evidence cannot be produced. Plan C may use `N/A` only under the explicit approval
and rationale rule; all remaining applicable Plan C fields must still be complete.

License incompatibility cannot be waived by performance or schedule. Reject the candidate or use a
compatible alternative and repeat the applicable evidence.

### Selection

| Plan       | Formal selection rule                                                                                                                                                                                                                                                                                                                                                                                                                 | Consequence                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plan A** | Select only when the open-ended on-device generative pipeline clears every applicable approved spike exit threshold on the representative floor-device matrix, has no unavailable battery evidence, produces acceptable transparent generated assets, preserves the contract and safety boundary, and passes the license/provenance gate.                                                                                             | Proceed with open text prompts and the exact validated model, runtime, quantization, delegate support, and packaging constraints.                                                                       |
| **Plan B** | Select when Plan A's open-ended distribution does not clear the approved quality or operational bar, but a declared constrained prompt-builder distribution using the validated generative pipeline clears every applicable approved threshold on the representative device matrix, has no unavailable battery evidence, and passes the same contract, safety, license, and provenance gates.                                         | Remove open-ended claims and inputs; document the allowed subject/expression/style domain and ship only the exact validated generative pipeline.                                                        |
| **Plan C** | Select when even constrained generation does not clear the approved bar or cannot be licensed/delivered inside the fixed window, and the template bundle itself clears every applicable approved threshold, has compatible rights, physical-device evidence, integrity checks, contract behavior, and transparent-output quality. Any `N/A`, including battery, has explicit Product-owner approval/date and plan-specific rationale. | Ship the template-based fallback through the `template-fallback`/`template-bundle` manifest adapter. Make no claim of open-ended generation; move true generative stickers to a later roadmap decision. |

If no plan satisfies Gate 0 and its selection rule, record **No selectable plan** and escalate to the
Product owner; do not manufacture a pass or introduce remote inference. This preserves the PRD's
fixed deadline and no-server constraint
([PRD § 6 — Constraints](./PRD_AI_Sticker_Generator.md#constraints)).

## Decision Record

Complete every field; do not replace the evidence package with this summary.

| Field                                                                 | Recorded value                                                                                                          |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Decision status                                                       | Decision pending Week 1 evidence                                                                                        |
| Decision date (UTC)                                                   | To record                                                                                                               |
| EvidencePackageId/path and checksum procedure/tool/version/command    | To record; do not record packageDigest or attestation-derived values                                                    |
| Source commit / build ID / contract version                           | To record                                                                                                               |
| Candidate and physical-device results summary                         | To record                                                                                                               |
| Battery block protocol/results and unavailable gaps                   | To record                                                                                                               |
| Fault-matrix version/results and unavailable gaps                     | To record                                                                                                               |
| Quality rubric version/digest, reviewer set, and adjudication summary | To record                                                                                                               |
| Chip-vendor and delegate coverage, including gaps                     | To record                                                                                                               |
| License/provenance decision paths and approver                        | To record                                                                                                               |
| Selected plan (`Plan A`, `Plan B`, `Plan C`, or `No selectable plan`) | To record                                                                                                               |
| Selected model/runtime/artifact/quantization, or template bundle      | To record only from evidence                                                                                            |
| Supported capability-gate/device/delegate scope                       | To record                                                                                                               |
| Product owner approval                                                | Name/date/sign-off to record                                                                                            |
| Native/ML lead approval                                               | Name/date/sign-off to record                                                                                            |
| QA lead approval                                                      | Name/date/sign-off to record                                                                                            |
| Safety owner approval                                                 | Name/date/sign-off to record                                                                                            |
| Consequences and user-facing claim                                    | To record                                                                                                               |
| Known limitations and accepted risks                                  | To record                                                                                                               |
| Product-owner-approved `N/A` fields, rationale, and approval date     | To record, or record `none`                                                                                             |
| Required `ROADMAP.md` changes and owner/date                          | To record                                                                                                               |
| Revisit triggers                                                      | New license, physical-device, runtime compatibility, memory, thermal, safety, quality, artifact, or dependency evidence |

This Decision Record is finalized before `CHECKSUMS.sha256` is generated and therefore contains no
package digest. The external roadmap/release decision record references the later signed
`PACKAGE_ATTESTATION.json` and its verification result.

### Approved spike exit thresholds

For each measurement, replace only the recorded-value fields—not the field name. Before selecting
Plan A, Plan B, or Plan C, every row applicable to that plan must be complete. `N/A` is valid only
with Product-owner approval/date and a plan-specific rationale in the same row; an incomplete
applicable row or unapproved `N/A` blocks that plan.

| Measurement                                | Required decision field                               | Candidate-plan applicability (`applicable` or approved `N/A`) and rationale                         | Approved value, unit, direction, and scope | Product owner | Approval date | Evidence comparison |
| ------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------- | ------------- | ------------------- |
| Cold start                                 | Spike exit threshold requiring product-owner approval | To record                                                                                           | To record                                  | To record     | To record     | To record           |
| Warm generation                            | Spike exit threshold requiring product-owner approval | To record                                                                                           | To record                                  | To record     | To record     | To record           |
| Total generation plus Segmentation latency | Spike exit threshold requiring product-owner approval | To record                                                                                           | To record                                  | To record     | To record     | To record           |
| Peak resident memory                       | Spike exit threshold requiring product-owner approval | To record                                                                                           | To record                                  | To record     | To record     | To record           |
| Artifact size                              | Spike exit threshold requiring product-owner approval | To record                                                                                           | To record                                  | To record     | To record     | To record           |
| Install-size impact                        | Spike exit threshold requiring product-owner approval | To record                                                                                           | To record                                  | To record     | To record     | To record           |
| Battery delta                              | Spike exit threshold requiring product-owner approval | To record; `measurement unavailable` blocks Plan A/B; Plan C `N/A` requires approval/date/rationale | To record                                  | To record     | To record     | To record           |
| Thermal state                              | Spike exit threshold requiring product-owner approval | To record                                                                                           | To record                                  | To record     | To record     | To record           |
| Crash/recovery behavior                    | Spike exit threshold requiring product-owner approval | To record                                                                                           | To record                                  | To record     | To record     | To record           |
| Prompt adherence                           | Spike exit threshold requiring product-owner approval | To record                                                                                           | To record                                  | To record     | To record     | To record           |
| Sticker suitability                        | Spike exit threshold requiring product-owner approval | To record                                                                                           | To record                                  | To record     | To record     | To record           |
| Subject integrity                          | Spike exit threshold requiring product-owner approval | To record                                                                                           | To record                                  | To record     | To record     | To record           |
| Background transparency / halo             | Spike exit threshold requiring product-owner approval | To record                                                                                           | To record                                  | To record     | To record     | To record           |
| Edge cleanliness                           | Spike exit threshold requiring product-owner approval | To record                                                                                           | To record                                  | To record     | To record     | To record           |
| Reviewer disagreement                      | Spike exit threshold requiring product-owner approval | To record                                                                                           | To record                                  | To record     | To record     | To record           |

## Reproduction Checklist

- [ ] Record protocol revision, repository commit, release-like build ID, contract version, and UTC
      run window.
- [ ] Pin and archive the workstation conversion environment without treating it as shipped
      runtime evidence.
- [ ] Verify source provenance, license decision, `ModelManifest`, artifact bytes, and SHA-256 before
      installation.
- [ ] Inventory representative physical devices at the PRD floor across multiple chip vendors and
      capture `DeviceCapabilities`.
- [ ] Record the actual runtime version, selected delegate, Android build, memory class, install
      source, battery, thermal, network, and ambient setup.
- [ ] Verify first-install Segmentation delivery and offline-after-install operation.
- [ ] Version and digest safe golden inputs, style presets, seeds, and square output dimensions.
- [ ] Run one unmeasured warm-up followed by at least three measured repetitions for every
      device/candidate/prompt case; retain all failures and outliers.
- [ ] Run at least three independent controlled battery blocks after warm-up for every
      device/model/configuration with fixed generation count/duration, starting charge band,
      unplugged state, brightness, network, and background-app controls; retain raw and normalized
      results, median/worst, and any blocking `measurement unavailable` record.
- [ ] Execute at least three repetitions of every applicable controlled-exception,
      app-process-termination, and OS-termination fault-matrix cell; verify terminal/error behavior,
      no later `completed`, cleanup, relaunch, retry success, and state integrity.
- [ ] Preserve raw timestamps and traces; report individual, median, and worst observations.
- [ ] Validate succeeded and failed `GenerationResult` behavior, transparent generated-asset
      provenance, cancellation, cleanup, recovery, and no orphan gallery item.
- [ ] Preassign stable opaque blinded reviewer IDs; give the initial three reviewers only the
      randomized sample and safe target specification; collect a fourth independent score when
      required; enumerate/select the closest three using both deterministic tie-breaks; retain all
      raw/subset evidence; allow outlier removal only through that rule; fail unresolved
      `reviewer_disagreement`; and compare the selected-three median with its approved dimension
      threshold. Complete safety smoke evidence separately.
- [ ] Enter every applicable Product-owner-approved spike exit threshold for the candidate plan and
      compare the evidence; attach approval/date/rationale to every `N/A`.
- [ ] Finalize the Decision Record and all included evidence without packageDigest/attestation
      values; generate canonical `CHECKSUMS.sha256` excluding exactly it and
      `PACKAGE_ATTESTATION.json`, hash its exact UTF-8/LF bytes, create/verify the JCS-canonicalized
      signed attestation, and add the attestation reference only to the external roadmap/release
      decision record.
- [ ] Record selected plan, consequences, roadmap changes, and revisit triggers without selecting a
      runtime/model unsupported by the physical-device evidence.

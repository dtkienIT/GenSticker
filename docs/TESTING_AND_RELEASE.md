# Testing and Release

## iOS 17 / TestFlight gate

macOS CI must pass `swift test` for the native core, Expo SDK 57 iOS prebuild, CocoaPods resolution,
and an unsigned simulator compile. The simulator profile uses explicit mock mode and is not
performance evidence. Development, preview, and production EAS profiles use native mode.

The approved Core ML release workflow must validate the pinned conversion, publish immutable
assets only after the protected `model-release` approval, and produce the distribution manifest
committed with the app. Verify the signed EAS application contains
`com.apple.developer.kernel.increased-memory-limit=true`.

On a physical iPhone 12 running iOS 17 or newer, record:

- three consecutive transparent 512×512 outputs;
- warm generation at or below 30 seconds and cold generation at or below 60 seconds;
- peak RSS at or below 4 GB with no jetsam or crash;
- offline generation after setup, cancellation followed by a clean retry, and recovery after
  background/foreground and process relaunch;
- durable gallery persistence plus correct add-only Photos export and share-sheet behavior;
- setup success, insufficient storage, interruption/resumption, cancellation, corrupt archive,
  corrupt internal file, upgrade, relaunch, and rollback behavior.

Any failed threshold records a production no-go. Production must not enable cloud inference or
mock fallback.

## Document Control

**Document role:** Binding verification and release-acceptance procedure for the Android-first
target release. It defines required evidence, not current implementation status.

**Authority:** The [PRD](./PRD_AI_Sticker_Generator.md) is authoritative. This procedure binds to
the [pre-launch release gate](./PRD_AI_Sticker_Generator.md#release-acceptance-criteria-pre-launch-gate),
[deployable release scope](./PRD_AI_Sticker_Generator.md#deployable-release-scope-5-weeks--fixed-deadline),
[device and no-server constraints](./PRD_AI_Sticker_Generator.md#constraints),
[user flow](./PRD_AI_Sticker_Generator.md#7-user-flow),
[failure isolation](./PRD_AI_Sticker_Generator.md#failure-isolation),
[adversarial testing](./PRD_AI_Sticker_Generator.md#adversarial-testing-distinct-from-functional-qa),
[Week 4 wide testing](./PRD_AI_Sticker_Generator.md#week-4--integration-wide-testing-begins), and
[Week 5 release](./PRD_AI_Sticker_Generator.md#week-5--hardening--release).

Observable types, events, error codes, and fixtures come only from the
[Integration Contracts](./INTEGRATION_CONTRACTS.md). Week 1 runtime/model selection and measurement
rules come from the [Feasibility Spike](./FEASIBILITY_SPIKE.md). Release status remains in the
[Roadmap](./ROADMAP.md); this guide does not mark an unexecuted gate as passed.

## Quality Gates

No single test layer substitutes for another. A release candidate is eligible for go/no-go review
only when every applicable gate below has immutable evidence tied to the same source commit, build,
contract version, selected Plan A/B/C configuration, and model/template checksum.

| Gate                               | Blocking acceptance condition                                                                                                                              | Primary evidence and owner                                                                                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QG-00` Feasibility decision       | Gate 0 and the Plan A/B/C selection rule are complete; no unresolved blocking or unapproved device/evidence gap remains.                                   | Signed [feasibility evidence package](./FEASIBILITY_SPIKE.md#evidence-package), external Roadmap decision record; Product owner, Native/ML lead, QA lead, Safety owner |
| `QG-01` Unit                       | All affected deterministic application and native units pass, including error paths and cleanup invariants.                                                | Unit reports and coverage inventory; component owners                                                                                                                  |
| `QG-02` Contract                   | Every producer and every consumer passes all applicable version `1.0` fixtures independently and together.                                                 | Fixture matrix with request/event/result captures; QA lead                                                                                                             |
| `QG-03` On-device integration      | The exact Android binary proves capability, wire, runtime, Segmentation, persistence, save/share, checksum, and terminal-result behavior.                  | Physical-device integration report; Native/ML and Mobile leads                                                                                                         |
| `QG-04` Golden regression          | The versioned safe golden set clears approved quality rules without hidden omissions or changed seeds/configuration.                                       | Golden manifest, outputs, blinded rubric results, diffs; QA and Product owners                                                                                         |
| `QG-05` Device/performance/thermal | Representative physical devices at the floor clear approved latency, memory, size, battery, thermal, offline, and crash/recovery thresholds.               | Device matrix and raw traces; QA and Native/ML leads                                                                                                                   |
| `QG-06` Functional/accessibility   | Every user-visible state, recovery path, local-data operation, accessibility path, and unsupported-device path passes.                                     | Functional evidence package; QA and Mobile leads                                                                                                                       |
| `QG-07` Safety red-team            | Dedicated adversarial testing clears the Safety-owner-approved rule independently of functional QA.                                                        | Separate safety evidence package; Safety owner                                                                                                                         |
| `QG-08` Failure recovery           | Required fault/cancellation matrices prove bounded termination, cleanup, readable state, crash-free recovery, and a clean new retry.                       | Fault traces and storage-integrity results; QA, Native/ML, and Mobile leads                                                                                            |
| `QG-09` Wide user                  | Focused users aged 16–30 across the defined device floor clear pre-agreed functional stability, quality, and latency acceptance rules.                     | Anonymized wide-user package and Product approval; QA lead                                                                                                             |
| `QG-10` Play readiness             | The approved binary, declarations, listing, privacy/safety material, signing/versioning, testing track, and submission buffer are complete and consistent. | Submission checklist and Play Console records; Release owner                                                                                                           |

Functional QA and adversarial safety are **independent release gates and independent evidence
packages**. Functional success cannot waive a safety failure. A safety pass cannot demonstrate
functional stability, performance, accessibility, or recovery. Any changed build, artifact,
runtime, ruleset, fixed safety negative prompt, or contract behavior invalidates the affected
evidence and triggers the applicable reruns.

Numeric performance, quality, battery, thermal, disagreement, wide-user, and crash-free thresholds
must be approved with value, unit/direction, scope, owner, and date before execution. The PRD does
not supply those numbers. Missing measurements are not passes; `N/A` is allowed only where the
controlling protocol explicitly permits it with Product-owner approval, date, and plan-specific
rationale.

`QG-00` may carry an unavailable-vendor coverage gap only when the feasibility package documents
the attempted coverage and consequence and the Product owner explicitly approves it as
nonblocking. An unresolved blocking gap or any unapproved device/evidence gap is no-go. License and
provenance gates cannot be waived, and every measurement mandatory for the selected plan must be
present and pass its approved rule.

## Unit Tests

Unit tests run without a device when the subject is deterministic. Cover at minimum:

- request/schema validation, contract-version parsing, prompt normalization, dimensions, seed, and
  style preset validation;
- state transitions for capability gating, moderation, progress, preview, gallery, failure,
  cancellation, and retry as defined by [User Flows](./USER_FLOWS.md#shared-state-model);
- ordered progress and exactly-once terminal-result reducers, including duplicate, missing,
  out-of-order, and late event rejection;
- first and repeated cancellation outcomes and prevention of post-cancellation `completed` events;
- sealed-result construction tests proving contradictory states cannot be built for
  `GenerationResult`, `SafetyDecision`, `SafetyEvaluationResult`, `CancelResult`, gallery deletion,
  and platform save/share outcomes; runtime-wire parsing separately rejects missing, unknown, or
  contradictory generation/cancellation/capability/model discriminators, while in-process ports
  assert stable enum `wireValue` tokens without adding JSON commands;
- model-manifest checksum, runtime, memory, delegate, and dimension validation, plus exact uppercase
  `DeviceSupportReasonCode.wireValue` serialization independent of enum naming configuration;
- `PromptSafetyEvaluator.evaluate(PromptSafetyRequest)` ordering and proof that neither a blocked
  decision nor `SafetyEvaluationResult.Failed` can construct a `GenerationRequest`, start runtime
  work, or log the raw prompt;
- `GalleryRepository` list/get/delete outcomes, `GalleryItem` metadata without duplicated
  `GeneratedAsset` fields, path confinement, atomic deletion, and orphan reconciliation;
- `PlatformAssetExporter` save/share outcomes, including permission denial, cancellation,
  unavailability, every operation-specific failure code/wire value, compile-time prevention of
  cross-operation failure codes, and preservation of the original gallery item;
- generated-asset metadata, immutable IDs, SHA-256, local URI ownership, and persistence transaction;
- safe error mapping and retryability for every contract error code;
- local safety allow/block decisions, internal fixed-negative-prompt application, raw-prompt
  redaction, and ruleset rollback protection;
- the safety-config worker's exact unique periodic/immediate names and policies,
  `NetworkType.CONNECTED` constraint, approved configurable cadence/backoff, staged validation,
  dual-slot write/reread/signature/digest verification, atomic activation, monotonic
  `maximumAcceptedRevision`, transient retry, eligible-package recovery, reset floor preservation,
  and no-duplicate scheduling across process restart; and
- opt-in telemetry defaults, reset behavior, and exclusion of raw prompts, image bytes, full local
  URIs, filter rules, and matched-rule detail.

Label safety-specific unit results for inclusion in the safety package as well as the component's
engineering report. Passing unit tests never establishes native, device, user, or adversarial
behavior.

The repository-level command is:

```powershell
npm test
```

Also run the native runtime's checked-in unit command once that harness exists, and record the exact
command rather than inventing a placeholder here.

## Contract Tests

Contract tests bind to [Integration Contracts version 1.0](./INTEGRATION_CONTRACTS.md#document-control).
Maintain a matrix with one row per fixture and columns for each producer, each consumer, the
integrated path, build, contract version, result, and evidence path. All applicable cells must pass.

The minimum fixture set is the authoritative
[Contract Test Fixtures table](./INTEGRATION_CONTRACTS.md#contract-test-fixtures):

- `capabilities-supported-1.0` and `capabilities-unsupported-1.0`;
- `safety-allowed-1.0`, `allowed-generation-1.0`, and `invalid-request-1.0`;
- `blocked-prompt-1.0`, `safety-evaluation-failure-1.0`, and
  `safety-revision-floor-recovery-1.0`;
- `cancel-generation-1.0`;
- `model-incompatible-1.0`;
- `segmentation-failure-1.0`;
- `asset-storage-failure-1.0`;
- `gallery-list-get-1.0`, `gallery-path-rejected-1.0`, and `gallery-delete-1.0`; and
- `photo-save-outcomes-1.0` and `share-outcomes-1.0`.

Assert correlation IDs, one admission or pre-admission error, monotonic sequence/elapsed time,
exact ordered progress, one terminal result, safe error codes, and absence of forbidden work or
gallery records. Test same-major compatibility and malformed/unsupported contract versions. A
producer pass is incomplete until every consumer proves its interpretation of the same fixture.
Capability captures must contain exactly the explicit `reasonCode.wireValue`; export fixtures must
prove a photo-save `Failed` cannot carry `ShareFailureCode` and a share `Failed` cannot carry
`PhotoLibrarySaveFailureCode`.

Fixtures use synthetic or approved safe inputs. Never store a blocked raw prompt, production user
prompt, or unlicensed artifact in a fixture or capture.

## On-Device Integration Tests

Run these tests in a target Android development build during implementation and repeat the release
gate against the exact release-candidate binary on representative physical devices. The current
Expo scaffold is not the target Kotlin application and is not a valid on-device test environment.

Verify:

1. `getCapabilities` reflects the actual physical device, runtime version, memory class, and usable
   delegates and blocks unsupported devices before model preparation.
2. `prepareModel` verifies the selected `ModelManifest`, exact artifact SHA-256, runtime,
   memory requirement, and delegate before reporting ready. Tampered or mismatched assets never
   reach inference.
3. An allowed request crosses the runtime boundary only after
   `SafetyEvaluationResult.Evaluated(SafetyDecision.Allowed)`, receives exactly one admission,
   emits the contract-defined progress sequence, and resolves exactly once. Every operational
   safety-evaluation failure remains before that boundary and follows the fail-closed recovery path.
4. The on-device runtime uses the selected Plan A/B/C artifact and applies the bundled fixed safety
   negative prompt internally exactly once after an allowed decision; neither `PromptSafetyRequest`,
   `GenerationRequest`, nor wire captures contain a negative-prompt field, blocked raw prompt, or
   implementation-secret detail.
5. Segmentation produces a persisted transparent PNG whose dimensions, bytes, SHA-256, request,
   prompt digest, model identity, and seed match the `GeneratedAsset`.
6. Preview on neutral checkered, light, and dark backgrounds exposes transparency defects; save and
   native OS share consume the existing local asset without mutating gallery ownership.
7. Regeneration creates a new request and asset and preserves earlier successful assets.
8. Every failure maps to the stable error taxonomy, leaves no invalid gallery item, and allows the
   specified retry or clean exit.

Record the device, Android/build, app build, source commit, contract version, selected plan,
runtime/delegate, model/template manifest digest, safety-ruleset version, test command/harness,
timestamps, and raw request/event/result captures.

## Golden Prompt Regression

Version the safe golden-prompt/template set and store its SHA-256 in the evidence index. The set
must cover the selected plan's declared distribution, single people/pets/objects, simple and
complex silhouettes, fine edges, light/dark subjects and backgrounds, and deterministic Plan C
templates where applicable. Each case fixes its case ID, safe target specification, prompt-set
version, `stylePresetId`, seed, square dimensions, selected artifact, plan, and expected contract
outcome.

For every candidate build:

- run the unchanged cases on every required representative configuration;
- retain every success and failure; never drop a slow, throttled, crashed, low-quality, or
  recovered run;
- verify prompt, manifest, and generated-asset digests before comparison;
- review the persisted native PNG rather than a workstation re-export;
- use the blinded, versioned rubric and deterministic disagreement procedure in the
  [Feasibility Spike](./FEASIBILITY_SPIKE.md#quality-review-protocol); and
- report per-dimension median, worst result, below-threshold count, unresolved disagreement,
  transparent-edge defects, and regression from the approved baseline.

Safety bypass strings belong only to the separately controlled safety suite. Golden functional
evidence contains safe cases and may reference a safety fixture ID/digest, never its raw blocked
input.

## Device Performance and Thermal Tests

The supported floor is **Snapdragon 7-series / Google Tensor G2-equivalent and above**, subject to
the contract-defined `DeviceCapabilities`. Use multiple physical devices spanning chip vendors;
the required spread tracks Qualcomm, Samsung Exynos, MediaTek, and Google Tensor, and every gap
needs a written rationale. A single flagship, emulator, desktop run, or cloud simulation cannot
pass the gate. When available, include one below-floor physical device to prove clean
`DEVICE_UNSUPPORTED` gating; it does not count as supported-floor coverage.

For each release-build/device/artifact/delegate combination, use the controlled setup and repeated
battery-block rules in the [Feasibility Spike](./FEASIBILITY_SPIKE.md#measurement-protocol). Record
all individual runs plus median and worst values. Measure at minimum:

- offline cold start from a release-like process start with the model unloaded through the terminal
  `GenerationResult`, retaining prepare, generation, Segmentation, encoding, and persistence times;
- warm generation and combined generation-plus-Segmentation latency;
- baseline, peak, and delta resident memory plus any OS kill or `INSUFFICIENT_MEMORY`;
- exact artifact bytes and signed-build download/install impact;
- controlled battery blocks with raw counters, attempted/successful generations, elapsed time,
  normalized deltas, and unavailable measurements explicitly recorded;
- thermal state before/after every run, available temperature/throttle signals, time to throttle,
  affected runs, recovery time, and repeated-generation behavior; and
- crash/fault recovery at preparation, generation, Segmentation, encoding, and persistence.

Installation/delivery and offline operation are separate cases. First prove the application,
selected model/template artifact, and required Segmentation assets are delivered. Then disable all
connectivity, cold-start the installed release candidate, generate, segment, persist, preview,
open the gallery, and invoke the OS share handoff. Network absence must not block the core flow.

The evidence index identifies measurement tools and versions, power/charging state, battery band,
screen settings, ambient conditions, network state, background-process policy, warm-ups, resets,
and deviations. Do not average across different builds, artifacts, quantization, delegates, or
thermal starting policies.

## Functional and Accessibility QA

Functional QA follows every state and transition in [User Flows](./USER_FLOWS.md), including:

- supported and unsupported first launch;
- empty/invalid input, allowed moderation, generic blocked response, each operational
  safety-evaluation failure, explicit retry after revision-floor-eligible package recovery, and
  edit/resubmit;
- all exact progress stages, cancellation, success, preview transparency, regenerate, and retry;
- all five fixed save outcomes and all five fixed native-share outcomes, local gallery list/get
  reuse, not-found/path-rejection/failure handling, deletion, and reset;
- timeout, memory, model, inference, Segmentation, encoding, storage, and unknown failures;
- background/foreground, rotation/configuration changes, process death, relaunch, and recovery; and
- offline cold start and every core flow after installation.

Accessibility evidence covers the supported Android form factors and includes:

- screen-reader order, names, roles, values, state changes, progress, error, blocked, unsupported,
  preview, gallery, save, and share announcements;
- keyboard and switch-access navigation without traps, hidden actions, or focus loss;
- the largest supported text/display settings without clipped content, obscured actions, or
  keyboard overlap;
- portrait layouts at the smallest supported screen and relevant system appearance/contrast modes;
- non-color cues for selection, status, failure, transparency, and disabled actions; and
- motion/animation behavior that does not prevent task completion under relevant system settings.

Record pass/fail against explicit case IDs with screenshots or recordings where content-safe,
accessibility-service and device settings, tester, build, device, and issue links. Manual
observations and automated assertions must be labeled; a checklist without results is not evidence.

## Safety Red-Team Tests

The Safety owner runs a dedicated adversarial pass before release and after any material change to
the input filter, normalization, bundled embedding model, blocklist/ruleset, fixed safety negative
prompt, wire serialization, or patch channel. This is separate from functional QA and follows the
[Safety and Privacy protocol](./SAFETY_AND_PRIVACY.md#adversarial-red-team-protocol).

Cover misspellings, obfuscation, synonyms, non-English phrasing, composition/bypass attempts, and
the approved audience-risk categories. Verify:

- blocked decisions occur before generation and expose only
  `SafetyBlockReasonCode.PROMPT_BLOCKED` with generic safe copy;
- unavailable, invalid/corrupt, and evaluator-failure injections return only the matching
  `SafetyEvaluationResult.Failed` code, enter `failed` rather than `blocked`, and permit no
  generation request, runtime work, gallery item, or raw-prompt log;
- blocked prompts never enter a generation payload, progress stream, gallery, log, telemetry,
  screenshot, or evidence package;
- allowed requests receive the fixed safety negative prompt exactly once at the on-device runtime boundary;
- ruleset signatures, expiry, rollback protection, atomic dual-slot activation, redundant-package
  recovery, monotonic `maximumAcceptedRevision`, and bundled-baseline floor enforcement behave as
  specified;
- sync/network failure does not block offline generation while an eligible verified local package
  remains, but missing/corrupt active and redundant packages plus an older bundle fail closed until
  a qualifying signed revision is fetched; and
- WorkManager retains the unique periodic request across process death/reboot, prevents duplicate
  immediate requests, retries transient failures with the approved exponential backoff, rejects
  invalid/partial candidates atomically, maintains two verified copies at the revision floor, and
  preserves the floor through reset; and
- the known v1 absence of output-image classification is recorded as accepted residual risk, not
  represented as tested output moderation.

Use opaque case IDs and sanitized category metadata. Store the raw adversarial corpus only in the
approved restricted test system; the release safety package contains corpus version/digest,
category counts, outcomes, non-content traces, defects, remediation/retest evidence, residual-risk
approval, and Safety-owner sign-off. Functional testers may report an observed safety defect, but
their report does not replace the red-team gate.

## Failure-Recovery Tests

Execute the full [Feasibility Spike fault matrix](./FEASIBILITY_SPIKE.md#crash-and-recovery-fault-matrix)
against the exact release-like binary on every representative device. At `preparing_model`,
`generating`, `removing_background`, `encoding`, and asset persistence, test separately:

- a controlled component exception;
- app-process termination; and
- a documented OS/test-harness termination.

Run at least three repetitions per required cell after warm-up and retain the injection/termination
method, stage/time, progress prefix, terminal or termination evidence, file/database state,
relaunch trace, and retry result. An unavailable deterministic OS-termination method is an explicit
evidence gap, not permission to relabel another fault.

Cancellation gets its own matrix at every cancellable active stage. Verify the exact
[contract semantics](./INTEGRATION_CONTRACTS.md#progress-and-cancellation): the first call for an
active request returns `accepted: true` with `cancellation_requested`; a repeat while cancellation
is pending returns `accepted: false` with `already_cancellation_requested`; a repeat after the
cancelled terminal result returns `accepted: false` with `already_cancelled`; a call after another
terminal result returns `accepted: false` with `already_terminal`; and an unknown `requestId`
returns `accepted: false` with `not_found`. The request ends once with `GENERATION_CANCELLED`; no
late `completed` or gallery item appears; temporary model/output/PNG files and active-request state
are removed or safely quarantined; prior assets remain intact; and a new request with a new ID
succeeds.

After every exception, cancellation, process kill, OS kill, and deliberate database/file fault,
verify:

1. no stale request resumes or emits a late event;
2. no partial asset, duplicate row/ID, orphan metadata, corrupt manifest/checksum state, or stuck
   busy flag remains;
3. the app relaunches without another crash to a valid non-busy state;
4. persistence and prior gallery assets remain readable;
5. model readiness can be re-established; and
6. a fresh request completes successfully.

Separately terminate the application during each safety-config worker phase: download, staged
validation, first-slot write, second-slot write, reread verification, and atomic manifest commit.
After relaunch, WorkManager must retain one unique periodic request, partial candidates must remain
inactive, the prior verified active/redundant pair and `maximumAcceptedRevision` must remain intact,
and a transient failure must resume through the configured retry/backoff path. Reset must preserve
the floor and verified slots, reject a bundled baseline below the floor, retain the periodic
schedule, and enqueue at most one immediate connected refresh.

Inject each operational safety-evaluation failure before request construction. Confirm that the
result remains `SafetyEvaluationResult.Failed` across process/background recovery, never becomes a
policy block or generation error, leaves no runtime/progress/gallery state, and logs no raw prompt.
Then restore only a verified compatible active/redundant/bundled/fetched package at or above
`maximumAcceptedRevision` through the defined action and prove an explicit retry can reevaluate
safely; an older signed bundle must remain rejected.

Run the revision-floor sequence as one stateful fixture: corrupt the active slot while the redundant
package is readable, signed, compatible, and at `maximumAcceptedRevision`, then prove verified
promotion and explicit reevaluation succeed. Next corrupt both slots while the bundled baseline is
signed but below the floor; prove the bundle is rejected, offline moderation/generation remains
failed closed, the floor is unchanged, and no request/runtime/gallery state appears. Finally return
connectivity, deliver a signed compatible revision at or above the floor through the unique
WorkManager request, verify both new slots and the atomic manifest commit, and prove a later explicit
retry succeeds. Repeat reset during each state and confirm it never lowers or purges the floor.

Report crash-free recovery as observed repetitions over attempted repetitions per exact fault cell,
not as an unscoped percentage. Any state corruption, hang, repeated recovery crash, silent resume,
or concealed cleanup failure blocks release.

## Wide User Testing

Begin only after the internal functional, safety, contract, native, and device gates are stable
enough to expose to participants and Roadmap `XC-CONFIG` has accepted WorkManager
uniqueness/persistence/dual-slot validation/revision-floor recovery evidence. Distribute the same identified release
candidate through Google Play Internal or Closed Testing to focused users aged 16–30 across the
supported-floor device matrix, consistent with
[Roadmap `W4-03`](./ROADMAP.md#week-4-integration-and-wide-testing).

Before distribution, the Product owner approves the participant/device coverage and the explicit
go/no-go rules for functional stability, generation quality, and end-to-end latency. Record
eligibility/consent without placing participant identity in the evidence package. Capture:

- anonymized participant ID and coarse eligibility record;
- physical device, SoC/vendor, Android/build, capability result, app build, selected runtime and
  delegate;
- scenario/case IDs, successful and failed terminal results, retry/regeneration, latency, save/share
  outcome, accessibility configuration where voluntarily tested, and structured quality rating;
- sanitized issue reports, reproduction status, fix build, and retest result; and
- aggregate coverage, completion, failure/crash, quality, latency, save/share, and open-defect
  summaries compared directly with the pre-approved rules.

Do not collect raw prompts, generated images, full local URIs, or sensitive device/user identifiers
as routine study telemetry. Safety feedback is triaged to the Safety owner and linked by a
non-content incident ID; it does not merge the safety package into functional wide-user evidence.
All release-blocking defects are closed and rerun on the final candidate, or the release decision
is no-go.

## Evidence Package Format

Create two independently immutable packages for the final candidate:

1. a **functional evidence package** containing unit, contract, native, golden, device,
   performance/thermal, accessibility, failure-recovery, and wide-user evidence; and
2. a **safety evidence package** containing the restricted-corpus digest/metadata, safety unit and
   contract results, adversarial outcomes, ruleset/negative-prompt evidence, remediation/retests,
   residual-risk decision, and Safety-owner approval.

Each package has its own immutable `evidencePackageId`, evidence index, checksum manifest, signed
attestation, approvers, and lifecycle. Cross-reference the other package by ID and verified digest;
do not nest one inside the other or use one approval to sign both.

The evidence index records:

| Category      | Required fields                                                                                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity      | Evidence package ID/version/type, creation UTC, source commit, dirty-state declaration, application/package ID, `versionName`/`versionCode`, build identity, contract version, selected Plan A/B/C |
| Configuration | Runtime/model/template IDs and versions, `ModelManifest`, artifact SHA-256/bytes/license ID, quantization, delegate, safety-ruleset and fixture/golden/rubric versions/digests                     |
| Environment   | Physical-device inventory, SoC/vendor, Android/build, memory, capability result, tool/harness versions, network/power/thermal setup, deviations                                                    |
| Execution     | Exact commands/case IDs, start/end UTC, executor, exit/outcome, every raw repetition, logs/traces with prohibited content removed                                                                  |
| Results       | Expected/actual, terminal result/error, generated-asset provenance, median/worst and threshold comparison, defect/retest links, omitted/unavailable count                                          |
| Approvals     | Product, QA, Native/ML, Mobile, Safety, and Release approvals applicable to that package, with identity, role, decision, UTC date, and accepted gaps                                               |
| Reproduction  | Pinned dependencies, build configuration, artifact acquisition/provenance, device preparation, reset/warm-up rules, and known limitations                                                          |

Use the canonical checksum and signed-attestation procedure defined in
[Feasibility Spike — Evidence Package](./FEASIBILITY_SPIKE.md#evidence-package): finalize included
files, generate `CHECKSUMS.sha256` with only the two specified root exclusions, hash its exact bytes,
create excluded `PACKAGE_ATTESTATION.json`, and independently verify file digests and the
organization-approved signature. Any included-file change creates a new package identity,
manifest, attestation, external reference, and affected approvals. Never edit approved evidence in
place.

No evidence package may contain raw blocked or production prompts, generated images unless they are
approved safe golden outputs, full local URIs, secrets, signing keys, personal participant data, or
matched safety rules. A redaction must state what class was removed and preserve enough non-content
metadata to reproduce the case through its approved source system.

## Google Play Readiness

The release owner verifies the following against the final candidate and records evidence paths:

- the effective Week 1 Plan A/B/C decision, user-facing claims, supported device gate, artifact,
  licenses, and known limitations agree across the binary, listing, PRD, and Roadmap;
- the production Android application ID, user-facing version, monotonically valid version code,
  signing ownership/recovery procedure, and signed Android App Bundle are finalized; current mock
  app identity/configuration is not submission-ready;
- the target Kotlin/Jetpack Compose application's checked-in Gradle dependency and verification
  tasks pass; Android compile/target SDK configuration is recorded, and the release owner
  separately rechecks then-current Play policy in Play Console before submission. The current
  Expo scaffold's dependency check is repository-maintenance evidence only, not release evidence;
- the uploaded AAB SHA-256 is recorded as the immutable publishing-artifact digest and matches the
  uploaded Play Console artifact. Do not compare it with installed APK bytes: an AAB is a
  publishing format, and Google Play generates and serves optimized APKs for each device
  configuration, so the AAB and Play-installed APK set have different byte hashes
  ([official Android App Bundle documentation](https://developer.android.com/guide/app-bundle/));
- the Play-installed build is attested separately by its application/package ID,
  `versionName`/`versionCode`, Play track and release ID, app-signing certificate SHA-256, embedded
  build identity/source commit, and embedded model, configuration, and manifest digests. Every
  field must resolve to the approved publishing artifact and release record;
- representative physical-device, offline-after-install, performance/thermal, crash-recovery,
  accessibility, wide-user, and separate safety gates pass on that binary;
- the Data Safety form, privacy policy, in-app disclosures, opt-in telemetry defaults, data
  deletion/reset behavior, crash reporting, remote ruleset sync, and actual network behavior agree
  with [Safety and Privacy](./SAFETY_AND_PRIVACY.md);
- store description, screenshots, content rating/audience declarations, support contact, and
  inappropriate-content feedback path are reviewed and do not claim output moderation, unsupported
  hardware, open-ended generation under Plan B/C, native sticker-pack integration, or remote
  inference;
- all bundled models, templates, fonts, training-derived assets, native libraries, notices, and
  store media have approved commercial rights and provenance;
- permissions and SDKs are limited to reviewed functionality; a release-like network capture
  confirms the core generation path remains local and offline-capable;
- Internal/Closed Testing distribution and feedback records identify the final candidate; and
- the submission date preserves the PRD's larger first-submission review buffer rather than relying
  on a routine-update assumption, with rollback/hold and post-release monitoring owners recorded.

Store approval is necessary but not sufficient for release: all internal quality gates must still
pass. Conversely, internal approval does not predict or replace Play review.

## Release Go/No-Go Checklist

The release meeting records `GO` or `NO-GO`, approver, UTC time, and evidence path for every item.
Any unresolved blocking item yields `NO-GO`; silence is not approval.

- [ ] `QG-00`: The signed, externally recorded Plan A/B/C decision is effective and the release
      uses exactly the selected artifact/runtime/delegate/packaging scope.
- [ ] Source commit, clean-build declaration, application/package ID, `versionName`/`versionCode`,
      contract `1.0`, uploaded AAB SHA-256, model/template and configuration/manifest digests, and
      safety-ruleset version identify one publishing candidate.
- [ ] The Play-installed build is separately attested by application/package ID,
      `versionName`/`versionCode`, Play track/release ID, app-signing certificate SHA-256, embedded
      build identity/source commit, and embedded model/configuration/manifest digests; no gate
      requires its device-specific APK bytes to equal the uploaded AAB bytes.
- [ ] The target Kotlin/Jetpack Compose application's checked-in Gradle build, static checks, unit
      tests, instrumentation/device suites, and format checks pass with complete logs. While the
      current Expo scaffold remains in the repository, its npm install, compatibility, typecheck,
      lint, unit-test, and format checks pass separately as migration-maintenance evidence.
- [ ] Every producer, consumer, and integrated path passes every applicable contract fixture.
- [ ] On-device integration passes in the target Android binary; no current Expo scaffold, web,
      emulator, desktop, or mock result is counted as physical-device inference evidence.
- [ ] The safe golden regression clears all pre-approved quality rules with no omitted run,
      unresolved reviewer disagreement, or unreviewed regression.
- [ ] The representative physical-device matrix at the Snapdragon 7-series/Tensor G2-equivalent
      floor covers the required vendors; any unavailable-vendor gap is documented and explicitly
      Product-owner-approved as nonblocking. Every unresolved blocking or unapproved device/evidence
      gap is no-go, and license gates and mandatory selected-plan measurements are non-waivable.
- [ ] Offline cold start after installation, checksum validation, combined generation plus
      Segmentation latency, memory, size, battery, thermal, and transparent-edge tests clear their
      approved thresholds.
- [ ] Functional and accessibility cases pass on the final candidate, including unsupported device,
      gallery, save/share, local reset, background/foreground, and every failure state.
- [ ] Cancellation cleanup and the complete exception/process/OS failure-recovery matrix pass;
      relaunch is stable, stored state is valid, prior assets survive, and a fresh request succeeds.
- [ ] The independent safety evidence package passes red-team, ruleset, fixed-negative-prompt,
      privacy/logging, and offline-baseline rules with Safety-owner approval.
- [ ] Roadmap `XC-CONFIG` evidence proves WorkManager uniqueness, constraints, persistence,
      dual-slot validation, atomic activation, monotonic revision floor, retry/backoff,
      eligible-package recovery, fail-closed older-bundle handling, and reset behavior; Roadmap
      `XC-RESET` evidence records the production application ID, exact in-app route/action, literal
      ADB command, and required cleanup/security-state assertions.
- [ ] Wide user testing across the supported floor clears pre-approved stability, quality, and
      latency rules; release-blocking defects are closed and retested on the final candidate.
- [ ] Functional and safety evidence packages are independently complete, checksum-verified,
      signature-verified, approved, immutable, and referenced by IDs/digests in the release record.
- [ ] Google Play bundle, signing/versioning, Data Safety, privacy policy, listing/media, content
      declarations, licenses/notices, testing track, support, and submission buffer are ready.
- [ ] Product, QA, Native/ML, Mobile, Safety, and Release owners record the required approvals,
      accepted residual risks, rollback/hold trigger, and post-release monitoring ownership.
- [ ] The Roadmap release record is updated only after the evidence-backed decision and Play review
      status are known.

A no-go records the failed gate, owner, remediation, required reruns, and next decision time. Do not
change the build, artifact, ruleset, or evidence package after a go decision; any such change creates
a new candidate and reopens the affected gates.

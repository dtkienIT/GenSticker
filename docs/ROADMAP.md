# GenSticker Delivery Roadmap

## Document Control

**Authority:** The [PRD](./PRD_AI_Sticker_Generator.md) is authoritative; this document is the sole progress ledger for the Android-first release. Contract ownership and observable-interface terms come from the [Integration Contracts](./INTEGRATION_CONTRACTS.md#ownership-matrix).

**Binding PRD basis:** [PRD § 12 — Development Plan & Timeline](./PRD_AI_Sticker_Generator.md#12-development-plan--timeline).

| Field             | Value                                                 |
| ----------------- | ----------------------------------------------------- |
| Scope             | Fixed five-week Android-first delivery plan           |
| Ledger owner      | Product owner                                         |
| Last reviewed     | 2026-07-21                                            |
| Evidence location | The acceptance-evidence reference on each roadmap row |

## Status Rules

**Binding PRD basis:** [PRD § 12 — Development Plan & Timeline](./PRD_AI_Sticker_Generator.md#12-development-plan--timeline).

Only these statuses are used in roadmap rows: `Not started`, `In progress`, `Blocked`, and `Complete`.

- `Not started` means no acceptance evidence has been recorded.
- `In progress` means work has begun, but the row's acceptance evidence is incomplete.
- `Blocked` means a named dependency or decision prevents the acceptance evidence from being produced.
- `Complete` means the stated acceptance evidence is recorded and reviewed by the accountable owner.

`Last updated` is the date of the latest evidence or status review, not a forecast. A mock, backend seam, or UI simulation is not evidence for an on-device inference row.

## Current Baseline

**Binding PRD basis:** [PRD § 5 — Scope](./PRD_AI_Sticker_Generator.md#5-scope) and [PRD § 9 — Tech Stack & Design Justification](./PRD_AI_Sticker_Generator.md#9-tech-stack--design-justification).

The repository has reusable Expo-shell capabilities: routed screens, strict TypeScript, local state/form handling, local persistence seams, and deterministic mock progress/UI flows. They are implementation context only; they do not satisfy the target Kotlin/Jetpack Compose app-shell milestone or any native-runtime acceptance evidence.

No on-device inference, model readiness, physical-device measurement, segmentation validation, or selected Plan A/B/C evidence is recorded in this ledger. Backend/mock generation is not credited as on-device AI progress.

## Five-Week Delivery Summary

**Binding PRD basis:** [PRD § 12 — Development Plan & Timeline](./PRD_AI_Sticker_Generator.md#12-development-plan--timeline).

| Week | Delivery focus                   | Decision or release gate                                    | Tracking IDs    |
| ---- | -------------------------------- | ----------------------------------------------------------- | --------------- |
| 1    | Feasibility and go/no-go         | Select Plan A, B, or C from physical-device evidence        | `W1-01`–`W1-07` |
| 2    | Core loop                        | Informal soft-MVP check on real target devices              | `W2-01`–`W2-04` |
| 3    | Style, safety, and complete flow | First safety red-team results and supported-device handling | `W3-01`–`W3-04` |
| 4    | Integration and wide testing     | Begin focused wide user testing                             | `W4-01`–`W4-05` |
| 5    | Hardening and release            | Release after final QA and Play submission                  | `W5-01`–`W5-05` |

## Week 1: Feasibility and Go/No-Go

**Binding PRD basis:** [PRD § 12 — Week 1](./PRD_AI_Sticker_Generator.md#week-1--feasibility-spike--gono-go) and [PRD § 11 — Risk Register & Contingency Plan](./PRD_AI_Sticker_Generator.md#11-risk-register--contingency-plan).

| ID      | Deliverable                                                                                                                            | Status      | Owner          | Target          | Dependencies                                                | Acceptance evidence                                                                                                                | Last updated |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------- | --------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `W1-01` | Custom TFLite/ONNX Runtime Mobile pipeline and smoke tests for one to two candidate base models; MediaPipe Image Generator is excluded | Not started | Native/ML lead | Week 1          | Model artifacts; on-device runtime contract                 | Reproducible physical-device smoke-test logs for each candidate, including runtime, delegate, artifact ID, and terminal result     | 2026-07-21   |
| `W1-02` | Physical device matrix at the agreed floor across chip vendors                                                                         | Not started | QA lead        | Week 1          | Access to supported-floor devices; capability-gate contract | Device inventory with chipset/vendor, OS version, memory class, capability result, and test owner for every measured device        | 2026-07-21   |
| `W1-03` | End-to-end latency, memory, and thermal measurements for generation plus background removal                                            | Not started | Native/ML lead | Week 1          | `W1-01`; `W1-02`; `W1-04`                                   | Evidence package records cold/warm runs, combined latency, peak memory, thermal state, failures, and per-device results            | 2026-07-21   |
| `W1-04` | ML Kit Subject Segmentation validation for stylized/cartoon output and Play Services install-flow delivery                             | Not started | Native/ML lead | Week 1          | Candidate outputs; physical devices                         | Segmentation test set, transparent-edge review, install-flow record, and success/failure results by device                         | 2026-07-21   |
| `W1-05` | Candidate model artifact and license validation                                                                                        | Not started | Native/ML lead | Week 1          | Candidate artifacts; model-manifest contract                | Signed-off artifact provenance, `artifactSha256`, runtime compatibility, memory requirement, usable delegate, and license decision | 2026-07-21   |
| `W1-06` | Formal Plan A/B/C contingency decision                                                                                                 | Not started | Product owner  | Day 4 of Week 1 | `W1-01`–`W1-05`; approved decision criteria                 | Completed decision record with evidence package, selected plan, approvers, consequences, and roadmap updates                       | 2026-07-21   |
| `W1-07` | Basic Kotlin + Jetpack Compose app shell and navigation                                                                                | Not started | Mobile lead    | Week 1          | Android project; application-port contract                  | Android build opens the defined navigation shell on a physical device and records the app-shell smoke result                       | 2026-07-21   |

## Week 2: Core Loop

**Binding PRD basis:** [PRD § 12 — Week 2](./PRD_AI_Sticker_Generator.md#week-2--core-loop-soft-mvp-checkpoint).

| ID      | Deliverable                                                                                                     | Status      | Owner        | Target        | Dependencies                                         | Acceptance evidence                                                                                                                     | Last updated |
| ------- | --------------------------------------------------------------------------------------------------------------- | ----------- | ------------ | ------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `W2-01` | Integrate the selected Plan A/B/C path: prompt input → input filter → generation → background removal → preview | Not started | Mobile lead  | Week 2        | `W1-06`; application and on-device runtime contracts | Contract-fixture result on real target devices showing the selected path reaches preview with a local transparent asset                 | 2026-07-21   |
| `W2-02` | On-device input content filter, including the bundled Android text-embedding model                              | Not started | Safety owner | Week 2        | Selected plan; safety-decision contract              | Allowed and blocked fixture results prove filtering occurs before generation, exposes only the safe response, and records no raw prompt | 2026-07-21   |
| `W2-03` | Local “My Stickers” gallery storage skeleton in Room                                                            | Not started | Mobile lead  | Week 2        | Asset-persistence contract                           | Create/read lifecycle test shows immutable local gallery records and transparent PNG provenance after a successful generation           | 2026-07-21   |
| `W2-04` | Soft-MVP core-loop check across the chip-vendor spread on real target devices                                   | Not started | QA lead      | End of Week 2 | `W2-01`–`W2-03`; `W1-02`                             | Device-matrix report shows the selected core loop's pass/fail result, latency observation, and known failures for every test device     | 2026-07-21   |

## Week 3: Style, Safety, and Complete Flow

**Binding PRD basis:** [PRD § 12 — Week 3](./PRD_AI_Sticker_Generator.md#week-3--style-safety-depth-and-flow-completion) and [PRD § 10 — Content Safety & Moderation](./PRD_AI_Sticker_Generator.md#10-content-safety--moderation).

| ID      | Deliverable                                                                              | Status      | Owner          | Target | Dependencies                                                     | Acceptance evidence                                                                                                                                              | Last updated |
| ------- | ---------------------------------------------------------------------------------------- | ----------- | -------------- | ------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `W3-01` | Begin LoRA fine-tune data curation and training for Plan A/B; explicitly skip for Plan C | Not started | Native/ML lead | Week 3 | `W1-06`; licensed training data                                  | Plan-conditioned record: approved provenance and training run for Plan A/B, or documented Plan C skip                                                            | 2026-07-21   |
| `W3-02` | Native OS save/share flow and polished “My Stickers” gallery UI                          | Not started | Mobile lead    | Week 3 | `W2-03`; platform-sharing contract                               | Physical-device save/share test preserves the local asset; gallery UI acceptance recording covers saved assets and error handling                                | 2026-07-21   |
| `W3-03` | First adversarial red-team pass against the input filter                                 | Not started | Safety owner   | Week 3 | `W2-02`; approved safe/adversarial fixture set                   | Versioned red-team report records cases, decisions, reason-code mapping, findings, and remediation owners                                                        | 2026-07-21   |
| `W3-04` | Device capability check and graceful below-floor “not supported” experience              | Not started | Mobile lead    | Week 3 | Capability-gate and error-taxonomy contracts; below-floor device | Supported and unsupported capability fixtures plus physical-device capture prove no generation starts below floor and the user receives the defined safe message | 2026-07-21   |

## Week 4: Integration and Wide Testing

**Binding PRD basis:** [PRD § 12 — Week 4](./PRD_AI_Sticker_Generator.md#week-4--integration-wide-testing-begins) and [PRD § 4 — Goals & Success Metrics](./PRD_AI_Sticker_Generator.md#4-goals--success-metrics).

| ID      | Deliverable                                                                                                                      | Status      | Owner          | Target | Dependencies                                              | Acceptance evidence                                                                                                                                                                                                                                            | Last updated |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------- | ------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `W4-01` | Integrate applicable fine-tuned weights and re-test quality/latency against the Week 1 baseline across the device spread         | Not started | Native/ML lead | Week 4 | `W3-01`; `W1-03`; selected plan                           | Comparative evidence package identifies artifact/version and quality plus combined-latency results for each device; Plan C records the applicable fallback comparison                                                                                          | 2026-07-21   |
| `W4-02` | Opportunistic remote-config sync and lightweight opt-in telemetry                                                                | Not started | Mobile lead    | Week 4 | Privacy disclosure; offline-first contract                | Tests show core generation requires no network while a verified safety package at/above the floor remains local, and fails closed without lowering the floor when all eligible copies are unavailable; opt-in, crash, usage, and feedback results are recorded | 2026-07-21   |
| `W4-03` | Begin focused wide user testing through Play Console Internal/Closed Testing across the device-tier matrix with users aged 16–30 | Not started | QA lead        | Week 4 | Test build; `W4-02`; `XC-CONFIG`; participant recruitment | Distribution begins only after accepted `XC-CONFIG` WorkManager uniqueness/persistence/validation/retry/fallback evidence; record includes the anonymized participant/device matrix, consent/eligibility record, and release-gate test plan                    | 2026-07-21   |
| `W4-04` | Second red-team pass incorporating first-round findings                                                                          | Not started | Safety owner   | Week 4 | `W3-03`; revised filter/fixtures                          | Second versioned red-team report maps prior findings to retest outcomes and records unresolved risks                                                                                                                                                           | 2026-07-21   |
| `W4-05` | Fix defects reported by wide testing in parallel                                                                                 | Not started | Mobile lead    | Week 4 | `W4-03`; triaged defects                                  | Defect register links each fixed issue to reproduction, verification, and regression/contract-fixture result                                                                                                                                                   | 2026-07-21   |

## Week 5: Hardening and Release

**Binding PRD basis:** [PRD § 12 — Week 5](./PRD_AI_Sticker_Generator.md#week-5--hardening--release).

| ID      | Deliverable                                                                                    | Status      | Owner         | Target | Dependencies                            | Acceptance evidence                                                                                                                | Last updated |
| ------- | ---------------------------------------------------------------------------------------------- | ----------- | ------------- | ------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `W5-01` | Final bug fixes and polish from wide-testing results                                           | Not started | Mobile lead   | Week 5 | `W4-03`; `W4-05`                        | Release candidate defect register shows disposition and verification for every accepted wide-testing issue                         | 2026-07-21   |
| `W5-02` | Final device-tier QA across floor devices and graceful degradation on unsupported devices      | Not started | QA lead       | Week 5 | `W5-01`; device matrix; capability gate | Signed final matrix records functional, performance, and unsupported-device outcomes across required chip vendors                  | 2026-07-21   |
| `W5-03` | Google Play submission preparation: Data Safety form, listing, screenshots, and privacy policy | Not started | Release owner | Week 5 | `W4-02`; approved release candidate     | Submission-ready artifact checklist contains reviewed Data Safety form, listing, screenshots, and telemetry-aligned privacy policy | 2026-07-21   |
| `W5-04` | Submit for Play Store review with a buffer sized for a possible first-submission delay         | Not started | Release owner | Week 5 | `W5-02`; `W5-03`; Play Console access   | Play Console submission receipt, submitted build/version, timestamp, and release-buffer record                                     | 2026-07-21   |
| `W5-05` | Release                                                                                        | Not started | Release owner | Week 5 | Play review approval; `W5-01`–`W5-04`   | Production release record identifies approved build, rollout time, and post-release ownership handoff                              | 2026-07-21   |

## Cross-Cutting Workstreams

**Binding PRD basis:** [PRD § 12 — Development Plan & Timeline](./PRD_AI_Sticker_Generator.md#12-development-plan--timeline), [PRD § 10 — Patch Channel](./PRD_AI_Sticker_Generator.md#patch-channel-for-post-launch-gaps), and [Integration Contracts — Change Procedure](./INTEGRATION_CONTRACTS.md#change-procedure).

| ID          | Deliverable                                                                                                                                                                                      | Status      | Owner         | Target    | Dependencies                                            | Acceptance evidence                                                                                                                                                                                                                                                                                               | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ------------- | --------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `CC-01`     | Documentation migration: use this roadmap as the sole progress ledger and retire duplicate status documents                                                                                      | Complete    | Product owner | Week 1    | Current-state review; PRD and contract terminology      | Roadmap baseline preserves relevant reusable-shell facts; obsolete status documents are removed; milestone IDs are available to remaining documents                                                                                                                                                               | 2026-07-21   |
| `CC-02`     | Contract conformance and fixture evidence across application, on-device runtime, safety, persistence, and QA owners                                                                              | Not started | QA lead       | Weeks 1–5 | Integration Contracts v1.0; affected workstream rows    | Versioned fixture results and owner approvals accompany each integration or contract-impacting release decision                                                                                                                                                                                                   | 2026-07-21   |
| `XC-CONFIG` | WorkManager ownership for signed safety-config sync: unique periodic/immediate work, connected constraint, validation, dual-slot atomic activation, monotonic revision floor, and retry/recovery | Not started | Mobile lead   | Week 4    | `W2-02`; `W4-02`; Safety-owner policy approval          | Android tests and WorkManager inspection prove unique names/policies, `NetworkType.CONNECTED`, approved cadence/backoff, two verified slots at `maximumAcceptedRevision`, atomic commit, active-corrupt backup promotion, older-bundle fail-closed behavior, qualifying later fetch, and reset floor preservation | 2026-07-21   |
| `XC-RESET`  | Production application ID, in-app reset route/action, and literal ADB reset documentation                                                                                                        | Not started | Mobile lead   | Week 3    | `W2-03`; gallery deletion contract; safety reset policy | Reviewed evidence records the production application ID, exact UI route/action, literal `adb shell pm clear <production-id>` command, and tests for gallery/prompt-history/telemetry cleanup plus baseline/rollback-state handling                                                                                | 2026-07-21   |

## Contingency Decision Record

**Binding PRD basis:** [PRD § 11 — Risk Register & Contingency Plan](./PRD_AI_Sticker_Generator.md#11-risk-register--contingency-plan) and [PRD § 12 — Week 1](./PRD_AI_Sticker_Generator.md#week-1--feasibility-spike--gono-go).

Selection criteria and the evidence-package format are defined in [FEASIBILITY_SPIKE.md](./FEASIBILITY_SPIKE.md#plan-abc-decision-rules). The selected plan must preserve the Integration Contracts' observable behavior and the roadmap cadence.

| Decision date                    | Evidence package                                              | Selected plan                    | Approvers                                                                        | Consequences                                                         | Revisit trigger                                                                                                            |
| -------------------------------- | ------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Decision pending Week 1 evidence | `docs/FEASIBILITY_SPIKE.md` evidence package not yet recorded | Decision pending Week 1 evidence | Product owner; Native/ML lead; QA lead; Safety owner where safety impact applies | Weeks 2–5 remain branch-dependent; no production runtime is selected | New physical-device, license, runtime-compatibility, memory, thermal, or safety evidence invalidates the recorded decision |

## Blockers and Decisions

**Binding PRD basis:** [PRD § 11 — Risk Register & Contingency Plan](./PRD_AI_Sticker_Generator.md#11-risk-register--contingency-plan).

| ID     | Deliverable                                                  | Status  | Owner         | Target          | Dependencies                                   | Acceptance evidence                                                          | Last updated |
| ------ | ------------------------------------------------------------ | ------- | ------------- | --------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- | ------------ |
| `D-01` | Prevent a Plan A/B/C selection before Week 1 evidence exists | Blocked | Product owner | Day 4 of Week 1 | `W1-01`–`W1-05`; feasibility decision criteria | `W1-06` decision record contains the required evidence package and approvals | 2026-07-21   |

## Update Procedure

**Binding PRD basis:** [PRD § 12 — Development Plan & Timeline](./PRD_AI_Sticker_Generator.md#12-development-plan--timeline) and [Integration Contracts — Ownership Matrix](./INTEGRATION_CONTRACTS.md#ownership-matrix).

1. The accountable owner attaches or links the stated acceptance evidence before changing a row to `Complete`.
2. The Product owner records any scope, Plan A/B/C, target, or dependency change and obtains affected contract-owner approval.
3. The updater sets `Last updated` to the evidence/status-review date and records any unmet dependency as `Blocked` with a decision row when it affects delivery.
4. QA lead records fixture and device evidence; Safety owner records safety evidence; Release owner records submission and release evidence.
5. No row may be advanced on the basis of mock generation, a backend service, or an unmeasured desktop/emulator result when its acceptance evidence requires on-device behavior.

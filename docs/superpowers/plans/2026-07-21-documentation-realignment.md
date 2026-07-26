# Documentation Realignment Implementation Plan

**Status:** Complete; superseded for future execution.

> **Do not re-run this plan.** The PRD and active top-level documents under `docs/` govern future implementation. Named Expo/TypeScript target steps below are historical and were superseded by the Kotlin, Jetpack Compose, Room, and WorkManager target architecture.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the superseded cloud/selfie/backend documentation with a coherent, team-oriented documentation set for the PRD-defined Android-first on-device text-to-sticker release.

**Architecture:** Keep `docs/PRD_AI_Sticker_Generator.md` unchanged as product authority. Organize supporting documents by responsibility: architecture defines boundaries, integration contracts define observable interfaces, the roadmap tracks evidence-backed progress, and focused guides cover feasibility, model delivery, safety, flows, testing, release, and local development.

**Tech Stack:** Markdown, Expo SDK 57, React Native 0.86, React 19.2.3, Node.js 22.13.x or newer, Android native modules, an on-device TFLite or ONNX Runtime Mobile inference path selected by the Week 1 feasibility gate, ML Kit Subject Segmentation, local device storage, and native Android save/share integration.

## Global Constraints

- `docs/PRD_AI_Sticker_Generator.md` is the primary source of truth and must not change during this migration.
- The release is Android-first and must work fully offline after installation.
- Core generation must use no cloud inference and no custom production backend.
- V1 supports text-to-sticker only; selfie generation, sticker fusion, native messenger pack installation, iOS release work, and output-image moderation are out of scope.
- The Deployable Release deadline is five weeks; the Week 1 feasibility spike controls the formal Plan A/Plan B/Plan C decision.
- The documented device floor is Snapdragon 7-series or Google Tensor G2-equivalent and above.
- Expo statements must match the versioned Expo SDK 57 reference: React Native 0.86, React 19.2.3, React Native Web 0.21.0, and minimum Node.js 22.13.x.
- Supporting documents must distinguish `Current repository state` from `Target release state`.
- Progress claims exist only in `docs/ROADMAP.md`; shared interface definitions exist only in `docs/INTEGRATION_CONTRACTS.md`.
- Requirements are linked to PRD headings and are not silently reinterpreted.
- Use the canonical terms `prompt`, `generation request`, `model runtime`, `progress stage`, `generated asset`, `gallery item`, `capability gate`, and `contingency plan`.

---

## Target File Map

| File                            | Responsibility                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `docs/README.md`                | Documentation index, authority hierarchy, current-to-target orientation, and reading routes by role               |
| `docs/ARCHITECTURE.md`          | Target system boundaries, component responsibilities, data flow, failure isolation, and capability gate           |
| `docs/INTEGRATION_CONTRACTS.md` | Versioned application/native/model/storage interfaces, events, errors, ownership, and contract-change policy      |
| `docs/ROADMAP.md`               | Five-week workstreams, live status, owners, dependencies, blockers, acceptance evidence, and contingency decision |
| `docs/FEASIBILITY_SPIKE.md`     | Week 1 experiment protocol, device matrix, measurements, decision thresholds, and Plan A/B/C record               |
| `docs/MODEL_PIPELINE.md`        | Workstation model preparation and shipped on-device runtime/artifact responsibilities                             |
| `docs/SAFETY_AND_PRIVACY.md`    | Input moderation, negative prompting, red-team policy, blocklist update, data handling, and telemetry             |
| `docs/USER_FLOWS.md`            | User-visible states, transitions, edge cases, and recovery behavior                                               |
| `docs/TESTING_AND_RELEASE.md`   | Test layers, device/performance evidence, wide-user gate, and Google Play readiness                               |
| `docs/LOCAL_DEVELOPMENT.md`     | Reproducible Expo SDK 57 and Android native development workflow                                                  |

---

### Task 1: Establish the documentation hierarchy and target architecture

**Files:**

- Create: `docs/README.md`
- Modify: `docs/ARCHITECTURE.md`
- Reference only: `docs/PRD_AI_Sticker_Generator.md`

**Interfaces:**

- Consumes: PRD Sections 5, 7, 8, and 9 plus the approved source-of-truth hierarchy.
- Produces: Canonical component names and boundaries used by every later document: `App shell`, `Capability gate`, `Safety filter`, `Generation orchestrator`, `Model runtime`, `Segmentation`, `Asset repository`, and `Platform sharing`.

- [ ] **Step 1: Capture the pre-rewrite mismatch evidence**

Run:

```powershell
rg -n "FastAPI|Supabase|Celery|Redis|GPU AI Worker|Selfie" docs/ARCHITECTURE.md
```

Expected: matches demonstrating that the existing architecture conflicts with the PRD.

- [ ] **Step 2: Create the documentation index**

Write `docs/README.md` with these exact top-level sections:

```markdown
# GenSticker Documentation

## Source-of-Truth Hierarchy

## Current Repository State

## Target Release State

## Documentation Map

## Reading Paths by Role

## Documentation Maintenance Rules
```

The index must identify `PRD_AI_Sticker_Generator.md` as authoritative; describe the current Expo mock and unused FastAPI scaffold without presenting either as target architecture; link all ten target documents; and provide reading paths for product, application, native/ML, QA/safety, and release contributors.

- [ ] **Step 3: Rewrite the architecture around on-device boundaries**

Replace `docs/ARCHITECTURE.md` with these exact sections:

```markdown
# GenSticker On-Device Architecture

## Document Control

## Architectural Drivers

## Current Repository State

## Target System Context

## Component Responsibilities

## End-to-End Data Flow

## Native Boundary

## Storage and Asset Lifecycle

## Failure Isolation and Recovery

## Capability Gate

## Explicit Non-Goals

## Related Documents
```

Include one Mermaid flow showing:

```text
Prompt UI -> Safety filter -> Generation orchestrator -> Model runtime
Model runtime -> Segmentation -> Transparent PNG -> Local gallery -> Save/share
Capability gate -> Prompt UI
```

State that the TypeScript application depends on the abstract contract in `INTEGRATION_CONTRACTS.md`, while the Week 1 spike chooses the native runtime implementation. Do not lock MediaPipe Image Generator as the production path.

- [ ] **Step 4: Validate authority, links, and retired architecture terms**

Run:

```powershell
rg -n "PRD_AI_Sticker_Generator|INTEGRATION_CONTRACTS|ROADMAP" docs/README.md docs/ARCHITECTURE.md
rg -n "Supabase|Celery|Redis|cloud generation|FastAPI Backend" docs/README.md docs/ARCHITECTURE.md
```

Expected: the first command finds the intended cross-references; the second has no target-architecture matches. Historical mentions are allowed only inside the explicitly labeled current-state section.

- [ ] **Step 5: Commit the hierarchy and architecture**

```powershell
git add docs/README.md docs/ARCHITECTURE.md
git commit -m "docs: define on-device architecture"
```

### Task 2: Define the team integration contract

**Files:**

- Create: `docs/INTEGRATION_CONTRACTS.md`
- Reference only: `docs/ARCHITECTURE.md`
- Reference only: `docs/PRD_AI_Sticker_Generator.md`

**Interfaces:**

- Consumes: Component names from Task 1.
- Produces: Contract version `1.0`, TypeScript port signatures, native bridge payloads, progress stages, error codes, model manifest, asset metadata, fixtures, ownership, and change rules consumed by Tasks 3–7.

- [ ] **Step 1: Verify that no active shared contract exists for the target architecture**

Run:

```powershell
Test-Path docs/INTEGRATION_CONTRACTS.md
rg -n "StickerGenerationEngine|GenerationProgressEvent|ModelManifest" docs
```

Expected: the file does not exist and the target types are absent.

- [ ] **Step 2: Write the contract control and application port**

Create `docs/INTEGRATION_CONTRACTS.md` with contract version `1.0` and these sections:

```markdown
# GenSticker Integration Contracts

## Document Control

## Contract Principles

## Ownership Matrix

## Application Generation Port

## Native Bridge Contract

## Progress and Cancellation

## Model Manifest Contract

## Generated Asset Contract

## Safety Decision Contract

## Error Taxonomy

## Compatibility and Versioning

## Contract Test Fixtures

## Change Procedure
```

Document this application-facing TypeScript port exactly:

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

Define `GenerationRequest` with `contractVersion`, `requestId`, normalized `prompt`, `stylePresetId`, `seed`, `outputWidth`, and `outputHeight`. V1 output dimensions are square and bounded by the selected model manifest.

- [ ] **Step 3: Define stable progress, cancellation, and result semantics**

Use these progress stages exactly:

```text
validating -> preparing_model -> generating -> removing_background -> encoding -> completed
```

Each progress event contains `contractVersion`, `requestId`, `sequence`, `stage`, `stageProgress` from `0` through `1`, and monotonic `elapsedMs`. Cancellation is idempotent. A cancelled request resolves as error code `GENERATION_CANCELLED`, emits no later `completed` event, and leaves no gallery item.

Define `GenerationResult` as a discriminated union with `status: "succeeded" | "failed"`, where success contains a `GeneratedAsset` and failure contains a `GenerationError`.

- [ ] **Step 4: Define device, model, asset, safety, and error payloads**

Require `DeviceCapabilities` to report support status, reason code, total memory class, available acceleration delegates, and runtime version. Require `ModelManifest` to include:

```text
manifestVersion, modelId, modelVersion, runtime, runtimeVersion,
quantization, artifactSha256, artifactBytes, minimumMemoryMb,
supportedDelegates, inputWidth, inputHeight, licenseId
```

Require `GeneratedAsset` to include:

```text
assetId, requestId, localUri, mimeType, width, height, byteSize,
sha256, createdAt, promptDigest, modelId, modelVersion, seed
```

Use safety decisions `allowed` and `blocked`. A blocked prompt never crosses the native generation boundary and never logs raw prompt text.

Define these stable error codes:

```text
DEVICE_UNSUPPORTED
MODEL_NOT_AVAILABLE
MODEL_INCOMPATIBLE
INSUFFICIENT_MEMORY
PROMPT_BLOCKED
GENERATION_BUSY
GENERATION_TIMEOUT
GENERATION_CANCELLED
INFERENCE_FAILED
SEGMENTATION_FAILED
ASSET_ENCODING_FAILED
ASSET_STORAGE_FAILED
SHARE_UNAVAILABLE
UNKNOWN_ERROR
```

- [ ] **Step 5: Define ownership and compatibility policy**

Assign application contracts to the mobile lead, native bridge and runtime contracts to the native/ML lead, safety decisions to the safety owner, and acceptance fixtures to QA. Specify semantic contract versioning: additive optional fields are minor-compatible; removed fields, renamed fields, changed meanings, or reordered required progress semantics require a major version. Every change request lists producers, consumers, fixtures, migration steps, roadmap impact, and approvals.

- [ ] **Step 6: Validate contract completeness**

Run:

```powershell
rg -n "StickerGenerationEngine|DeviceCapabilities|GenerationRequest|GenerationProgressEvent|GenerationResult|ModelManifest|GeneratedAsset|PROMPT_BLOCKED|GENERATION_CANCELLED|Change Procedure" docs/INTEGRATION_CONTRACTS.md
```

Expected: every contract family and governance section is present.

- [ ] **Step 7: Commit the integration contract**

```powershell
git add docs/INTEGRATION_CONTRACTS.md
git commit -m "docs: define on-device integration contracts"
```

### Task 3: Replace fragmented status documents with an evidence-based roadmap

**Files:**

- Modify: `docs/ROADMAP.md`
- Delete: `docs/IMPLEMENTATION_STATUS.md`
- Delete: `docs/FRONTEND_IMPLEMENTATION_STATUS.md`
- Reference only: `docs/PRD_AI_Sticker_Generator.md`
- Reference only: `docs/INTEGRATION_CONTRACTS.md`

**Interfaces:**

- Consumes: PRD Week 1–5 plan, contract ownership roles, and status vocabulary.
- Produces: The sole progress ledger, including milestone IDs used by the remaining documents.

- [ ] **Step 1: Capture the obsolete roadmap and duplicate-status evidence**

Run:

```powershell
rg -n "FastAPI|Cloud Infrastructure|GPU Workers|Selfie|Pack Generation" docs/ROADMAP.md docs/IMPLEMENTATION_STATUS.md docs/FRONTEND_IMPLEMENTATION_STATUS.md
```

Expected: matches showing superseded milestones and duplicate status sources.

- [ ] **Step 2: Write the roadmap control schema**

Replace `docs/ROADMAP.md` with these sections:

```markdown
# GenSticker Delivery Roadmap

## Document Control

## Status Rules

## Current Baseline

## Five-Week Delivery Summary

## Week 1: Feasibility and Go/No-Go

## Week 2: Core Loop

## Week 3: Style, Safety, and Complete Flow

## Week 4: Integration and Wide Testing

## Week 5: Hardening and Release

## Cross-Cutting Workstreams

## Contingency Decision Record

## Blockers and Decisions

## Update Procedure
```

Define only these statuses: `Not started`, `In progress`, `Blocked`, and `Complete`. Each roadmap row has columns:

```text
ID | Deliverable | Status | Owner | Target | Dependencies | Acceptance evidence | Last updated
```

Use role placeholders that are actionable without naming unknown people: `Product owner`, `Mobile lead`, `Native/ML lead`, `Safety owner`, `QA lead`, and `Release owner`. These are ownership roles, not unfinished content.

- [ ] **Step 3: Map all PRD weeks into measurable roadmap items**

Create milestone IDs `W1-01` onward through Week 5. Week 1 must include runtime/model smoke tests, device matrix, latency/memory/thermal measurements, segmentation validation, model/license validation, and the formal contingency decision. Weeks 2–5 must map every bullet from PRD Section 12 to one roadmap row with concrete acceptance evidence.

Mark documentation migration as `In progress`; mark existing reusable Expo shell capabilities only as current baseline; mark all on-device inference deliverables `Not started` until evidence exists. Do not credit backend mock generation as on-device AI progress.

- [ ] **Step 4: Add the contingency decision record**

Use a table with:

```text
Decision date | Evidence package | Selected plan | Approvers | Consequences | Revisit trigger
```

The initial state says `Decision pending Week 1 evidence`, which is a real state rather than an unspecified requirement. Link selection criteria to `FEASIBILITY_SPIKE.md`.

- [ ] **Step 5: Remove the duplicate status files**

Delete `docs/IMPLEMENTATION_STATUS.md` and `docs/FRONTEND_IMPLEMENTATION_STATUS.md` after confirming all still-relevant current-state facts appear in the roadmap baseline.

- [ ] **Step 6: Validate roadmap coverage and status vocabulary**

Run:

```powershell
rg -n "^## Week [1-5]|W1-|W2-|W3-|W4-|W5-|Acceptance evidence|Last updated|Contingency Decision" docs/ROADMAP.md
rg -n "Mock-complete|Partially Prepared|Phase 2: FastAPI|Cloud Infrastructure" docs/ROADMAP.md
```

Expected: all five weeks and tracking fields are present; superseded status language is absent.

- [ ] **Step 7: Commit the roadmap consolidation**

```powershell
git add docs/ROADMAP.md docs/IMPLEMENTATION_STATUS.md docs/FRONTEND_IMPLEMENTATION_STATUS.md
git commit -m "docs: consolidate delivery status in roadmap"
```

### Task 4: Document the feasibility gate and model-delivery pipeline

**Files:**

- Create: `docs/FEASIBILITY_SPIKE.md`
- Create: `docs/MODEL_PIPELINE.md`
- Reference only: `docs/INTEGRATION_CONTRACTS.md`
- Reference only: `governance/model_license_registry.example.yaml`
- Reference only: `experiments/benchmark/runner.py`

**Interfaces:**

- Consumes: `DeviceCapabilities`, `ModelManifest`, `GenerationResult`, and generated-asset provenance from Task 2.
- Produces: Week 1 evidence format, selected-plan decision input, model artifact lifecycle, and runtime acceptance data used by the roadmap and release guide.

- [ ] **Step 1: Record the current absence of on-device evidence**

Run:

```powershell
rg -n "TFLite|ONNX Runtime Mobile|quantization|thermal|Tensor G2|Snapdragon" docs experiments governance
```

Expected: PRD and skeleton references exist, but no complete repeatable feasibility protocol exists.

- [ ] **Step 2: Create the feasibility experiment protocol**

Write `docs/FEASIBILITY_SPIKE.md` with:

```markdown
# Week 1 On-Device Feasibility Spike

## Document Control

## Decision to Be Made

## Hypotheses

## Candidate Runtime and Model Matrix

## Device Test Matrix

## Test Inputs and Golden Prompts

## Measurement Protocol

## Quality Review Protocol

## Safety Smoke Test

## Evidence Package

## Plan A/B/C Decision Rules

## Decision Record

## Reproduction Checklist
```

Measure cold start, warm generation, total generation plus segmentation latency, peak resident memory, artifact size, install-size impact, battery delta, thermal state, crash/recovery behavior, and transparent-edge quality. Run at least three measured repetitions after one warm-up per device/model combination. Record median and worst observed values; never claim a pass from desktop emulation.

Use the PRD's device floor. If the PRD does not provide a numeric threshold for a metric, label it `Spike exit threshold requiring product-owner approval` and require the approved value to be recorded in the decision record before Plan A is selected. This is an explicit decision field, not a hidden placeholder.

- [ ] **Step 3: Define the formal contingency decision**

Document:

- Plan A: open-ended on-device generative pipeline;
- Plan B: constrained prompt-builder using the validated generative pipeline;
- Plan C: template-based fallback with no claim of open-ended generation.

Require the evidence package path, results summary, selected plan, approvers, date, consequences, and roadmap changes. Plan selection is blocked until license compatibility and representative-device evidence are recorded.

- [ ] **Step 4: Create the model pipeline guide**

Write `docs/MODEL_PIPELINE.md` with:

```markdown
# On-Device Model Pipeline

## Document Control

## Scope and Separation of Concerns

## Candidate Selection Criteria

## License and Provenance Gate

## Workstation Preparation Pipeline

## Conversion and Quantization

## Validation Against Source Outputs

## Model Manifest Generation

## App Packaging Strategy

## Runtime Delegate Selection

## Inference and Segmentation Sequence

## Artifact Integrity and Rollback

## Reproducibility Evidence

## Explicit Non-Goals
```

Define the artifact path as `source model -> pinned conversion environment -> converted artifact -> quantized artifact -> checksum -> manifest -> device validation -> release bundle`. State that the chosen runtime remains undecided until the spike; document both TFLite and ONNX Runtime Mobile as candidates, not simultaneous release dependencies.

- [ ] **Step 5: Validate evidence and manifest coverage**

Run:

```powershell
rg -n "cold start|warm|peak|thermal|battery|Plan A|Plan B|Plan C|Decision Record" docs/FEASIBILITY_SPIKE.md
rg -n "license|provenance|conversion|quantization|sha256|manifest|delegate|rollback" docs/MODEL_PIPELINE.md
```

Expected: all feasibility measurements, contingency outcomes, and model lifecycle gates are present.

- [ ] **Step 6: Commit the feasibility and model guides**

```powershell
git add docs/FEASIBILITY_SPIKE.md docs/MODEL_PIPELINE.md
git commit -m "docs: define feasibility and model pipeline"
```

### Task 5: Define safety, privacy, and user-state behavior

**Files:**

- Create: `docs/SAFETY_AND_PRIVACY.md`
- Create: `docs/USER_FLOWS.md`
- Delete: `docs/PRIVACY_AND_ASSETS.md`
- Delete: `docs/MOBILE_USER_FLOWS.md`
- Reference only: `docs/INTEGRATION_CONTRACTS.md`

**Interfaces:**

- Consumes: Safety decisions, error codes, progress stages, cancellation, and generated asset contract from Task 2.
- Produces: User-visible behavior and policy rules consumed by testing and implementation work.

- [ ] **Step 1: Capture obsolete privacy and flow assumptions**

Run:

```powershell
rg -n "selfie|canonical|character|pack|upload|backend" docs/PRIVACY_AND_ASSETS.md docs/MOBILE_USER_FLOWS.md
```

Expected: matches tied to the retired personalization flow.

- [ ] **Step 2: Write safety and privacy policy**

Create `docs/SAFETY_AND_PRIVACY.md` with:

```markdown
# Safety and Privacy

## Document Control

## Scope and Accepted Residual Risk

## Layered Input-Side Safety

## Prompt Handling and Logging Rules

## Fixed Safety Negative Prompt

## Local Blocklist

## Opportunistic Signed Blocklist Updates

## Adversarial Red-Team Protocol

## Local Data Lifecycle

## Deletion and Reset

## Lightweight Opt-In Telemetry

## Incident and Patch Response

## Explicit V1 Exclusions
```

State that blocked prompts do not cross the generation boundary; raw prompts, generated images, and full local URIs do not enter logs or diagnostics; the fixed negative prompt is not user-editable; update failure never blocks offline generation with the last valid ruleset; update payloads require authenticity and rollback protection; and output-image classification is explicitly excluded from v1.

- [ ] **Step 3: Write state-based user flows**

Create `docs/USER_FLOWS.md` with:

```markdown
# GenSticker User Flows

## Document Control

## Shared State Model

## First Launch and Capability Gate

## Prompt Submission and Moderation

## Generation and Progress

## Cancellation

## Successful Preview

## Save and Share

## Regenerate and Edit Prompt

## Local Gallery

## Failure and Recovery Matrix

## Unsupported Device Flow

## Offline Guarantees
```

Use states `checking_capability`, `unsupported`, `ready`, `moderating`, `blocked`, `preparing`, `generating`, `removing_background`, `encoding`, `preview`, `saving`, `sharing`, `failed`, and `cancelled`. Map failures to the stable error codes in `INTEGRATION_CONTRACTS.md` rather than redefining errors.

- [ ] **Step 4: Remove superseded safety and flow documents**

Delete `docs/PRIVACY_AND_ASSETS.md` and `docs/MOBILE_USER_FLOWS.md` after preserving only PRD-compatible concepts in the new documents.

- [ ] **Step 5: Validate safety boundaries and flow coverage**

Run:

```powershell
rg -n "raw prompt|negative prompt|signed|rollback|opt-in|output-image" docs/SAFETY_AND_PRIVACY.md
rg -n "checking_capability|blocked|removing_background|preview|cancelled|Offline Guarantees" docs/USER_FLOWS.md
```

Expected: safety constraints and all contract-aligned user states are present.

- [ ] **Step 6: Commit safety and flow documentation**

```powershell
git add docs/SAFETY_AND_PRIVACY.md docs/USER_FLOWS.md docs/PRIVACY_AND_ASSETS.md docs/MOBILE_USER_FLOWS.md
git commit -m "docs: define safety and user flows"
```

### Task 6: Define verification, release, and local development workflows

**Files:**

- Create: `docs/TESTING_AND_RELEASE.md`
- Modify: `docs/LOCAL_DEVELOPMENT.md`
- Delete: `docs/MOBILE_QA_CHECKLIST.md`
- Delete: `docs/RUNBOOK.md`
- Reference only: `docs/FEASIBILITY_SPIKE.md`
- Reference only: `docs/INTEGRATION_CONTRACTS.md`

**Interfaces:**

- Consumes: All stable contracts, user states, safety constraints, feasibility evidence, and roadmap gates.
- Produces: Repeatable contributor setup, verification commands, evidence packages, and release acceptance procedure.

- [ ] **Step 1: Capture obsolete service-runbook and QA assumptions**

Run:

```powershell
rg -n "FastAPI|worker|Alembic|backend|selfie|canonical|pack" docs/LOCAL_DEVELOPMENT.md docs/MOBILE_QA_CHECKLIST.md docs/RUNBOOK.md
```

Expected: matches that must not survive in the target development path.

- [ ] **Step 2: Create the layered test and release guide**

Write `docs/TESTING_AND_RELEASE.md` with:

```markdown
# Testing and Release

## Document Control

## Quality Gates

## Unit Tests

## Contract Tests

## Native Integration Tests

## Golden Prompt Regression

## Device Performance and Thermal Tests

## Functional and Accessibility QA

## Safety Red-Team Tests

## Failure-Recovery Tests

## Wide User Testing

## Evidence Package Format

## Google Play Readiness

## Release Go/No-Go Checklist
```

Keep functional QA and adversarial safety testing as separate evidence packages. Require representative physical devices at the documented floor, contract fixture tests for every producer and consumer, checksum validation for model assets, offline cold-start testing after installation, cancellation cleanup validation, and crash-free recovery checks.

- [ ] **Step 3: Rewrite local development for Expo SDK 57 and native builds**

Replace `docs/LOCAL_DEVELOPMENT.md` with:

```markdown
# Local Development

## Document Control

## Supported Host Setup

## Required Versions

## Repository Setup

## Expo Application Workflow

## Android Development Build

## Native Module Workflow

## Model Fixtures

## Verification Commands

## Local Data Reset

## Common Failures

## Related Documents
```

Require Node.js 22.13.x or newer. Use `npm ci`, `npx expo install --check`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run format:check`. Explain that Expo Go cannot host a custom native inference module and contributors must use an Android development build once the native bridge exists. Do not include FastAPI, Alembic, worker, Redis, Docker, or HTTP service mode as part of the target workflow.

- [ ] **Step 4: Remove superseded QA and service runbook files**

Delete `docs/MOBILE_QA_CHECKLIST.md` and `docs/RUNBOOK.md` after their PRD-compatible checks have been incorporated into `TESTING_AND_RELEASE.md`.

- [ ] **Step 5: Validate version accuracy and workflow scope**

Run:

```powershell
rg -n "22\.13|React Native 0\.86|React 19\.2\.3|development build|expo install --check" docs/LOCAL_DEVELOPMENT.md
rg -n "contract|physical device|thermal|accessibility|red-team|wide user|Google Play|go/no-go" docs/TESTING_AND_RELEASE.md
rg -n "FastAPI|Alembic|Redis|Celery|worker:dev|api:dev" docs/LOCAL_DEVELOPMENT.md docs/TESTING_AND_RELEASE.md
```

Expected: SDK 57 requirements and all quality layers are present; the final command returns no matches.

- [ ] **Step 6: Commit development and release documentation**

```powershell
git add docs/TESTING_AND_RELEASE.md docs/LOCAL_DEVELOPMENT.md docs/MOBILE_QA_CHECKLIST.md docs/RUNBOOK.md
git commit -m "docs: define development testing and release workflow"
```

### Task 7: Remove remaining obsolete contracts and complete cross-document validation

**Files:**

- Delete: `docs/API_CONTRACT.md`
- Delete: `docs/DATA_MODEL.md`
- Delete: `docs/FRONTEND_ARCHITECTURE.md`
- Delete: `docs/FRONTEND_DATA_CONTRACTS.md`
- Delete: `docs/MOCK_SERVICE.md`
- Modify if required for link fixes: every target document from Tasks 1–6
- Preserve unchanged: `docs/PRD_AI_Sticker_Generator.md`

**Interfaces:**

- Consumes: The complete target documentation set.
- Produces: One internally linked, PRD-aligned documentation system with no duplicate contracts or progress ledgers.

- [ ] **Step 1: Record the PRD checksum before final cleanup**

Run:

```powershell
Get-FileHash docs/PRD_AI_Sticker_Generator.md -Algorithm SHA256
```

Expected: record the hash in the command output for comparison in Step 6.

- [ ] **Step 2: Remove superseded API, data, frontend, and mock documents**

Delete exactly:

```text
docs/API_CONTRACT.md
docs/DATA_MODEL.md
docs/FRONTEND_ARCHITECTURE.md
docs/FRONTEND_DATA_CONTRACTS.md
docs/MOCK_SERVICE.md
```

Do not delete backend source code or other non-documentation artifacts; source cleanup is outside this plan.

- [ ] **Step 3: Verify the final documentation inventory**

Run:

```powershell
Get-ChildItem docs -File -Filter *.md | Sort-Object Name | Select-Object -ExpandProperty Name
```

Expected active product-document list:

```text
ARCHITECTURE.md
FEASIBILITY_SPIKE.md
INTEGRATION_CONTRACTS.md
LOCAL_DEVELOPMENT.md
MODEL_PIPELINE.md
PRD_AI_Sticker_Generator.md
README.md
ROADMAP.md
SAFETY_AND_PRIVACY.md
TESTING_AND_RELEASE.md
USER_FLOWS.md
```

The approved design spec and this implementation plan remain under `docs/superpowers/` as process records.

- [ ] **Step 4: Run the stale target-term scan**

Run:

```powershell
rg -n -i "Supabase|Celery|Redis|FastAPI backend|cloud generation|selfie generation|canonical candidate|character profile|sticker pack export|ComfyUI server" docs -g "*.md" -g "!PRD_AI_Sticker_Generator.md" -g "!superpowers/**"
```

Expected: no target-architecture claims. A historical statement is permitted only when explicitly labeled as current repository state or retired architecture.

- [ ] **Step 5: Validate relative Markdown links**

Run this PowerShell link check:

```powershell
$docsRoot = Resolve-Path docs
$missing = @()
Get-ChildItem $docsRoot -Recurse -Filter *.md | ForEach-Object {
  $source = $_
  $content = Get-Content -Raw -LiteralPath $source.FullName
  [regex]::Matches($content, '\[[^\]]+\]\((?!https?://|#)([^)#]+)(?:#[^)]+)?\)') | ForEach-Object {
    $target = Join-Path $source.DirectoryName ([uri]::UnescapeDataString($_.Groups[1].Value))
    if (-not (Test-Path -LiteralPath $target)) { $missing += "$($source.FullName) -> $target" }
  }
}
if ($missing.Count -gt 0) { $missing; exit 1 }
```

Expected: exit code 0 with no missing-link output.

- [ ] **Step 6: Verify the PRD is unchanged**

Run:

```powershell
Get-FileHash docs/PRD_AI_Sticker_Generator.md -Algorithm SHA256
git diff -- docs/PRD_AI_Sticker_Generator.md
```

Expected: the SHA256 matches Step 1 and `git diff` has no output. Because the PRD began untracked, do not infer immutability from `git diff` alone.

- [ ] **Step 7: Run formatting and repository consistency checks**

Run:

```powershell
npm.cmd run format:check
git diff --check
rg -n "Mock-complete|Partially Prepared|Future Integration Plan|Backend and real AI are outside this task" docs -g "*.md" -g "!superpowers/**"
```

Expected: formatting and diff checks pass; the stale status-language scan returns no matches.

- [ ] **Step 8: Review roadmap completeness against the PRD**

Read PRD Sections 5, 10, 11, and 12 beside `docs/ROADMAP.md`. Confirm every in-scope release requirement has a roadmap item or cross-cutting workstream, every Week 1 decision input is in `FEASIBILITY_SPIKE.md`, and no deferred feature is scheduled in Weeks 1–5.

- [ ] **Step 9: Commit the final cleanup and link fixes**

```powershell
git add docs
git commit -m "docs: complete PRD-aligned documentation migration"
```

## Final Acceptance Checklist

- [ ] `docs/PRD_AI_Sticker_Generator.md` is byte-for-byte unchanged from the start of execution.
- [ ] The final active file inventory matches Task 7 Step 3.
- [ ] `docs/README.md` clearly communicates the authority hierarchy and current-to-target gap.
- [ ] `docs/INTEGRATION_CONTRACTS.md` defines every application/native/model/storage/safety boundary used by architecture and user flows.
- [ ] `docs/ROADMAP.md` is the only implementation-status source and contains all five weeks, ownership, blockers, dependencies, and evidence fields.
- [ ] `docs/FEASIBILITY_SPIKE.md` contains a repeatable physical-device protocol and formal Plan A/B/C decision record.
- [ ] No supporting document presents a backend, cloud generation, selfie flow, canonical character, or sticker pack as v1 target architecture.
- [ ] Relative Markdown links resolve.
- [ ] Expo SDK 57 version statements match the official versioned documentation.
- [ ] Formatting and `git diff --check` pass, or any environment-only inability to run them is reported with the exact missing dependency.

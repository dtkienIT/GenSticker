# Documentation Realignment Design

**Date:** July 21, 2026  
**Status:** Superseded historical process record
**Authority:** `docs/PRD_AI_Sticker_Generator.md`

> **Do not use this record for implementation.** The PRD and active top-level documents under `docs/` govern. This record's Expo/TypeScript target assumptions were superseded by the Kotlin, Jetpack Compose, Room, and WorkManager target architecture.

## Objective

Replace the documentation inherited from the cloud-backed, selfie-personalization prototype with a smaller documentation system for the Android-first, fully on-device text-to-sticker product defined by the PRD.

The rewrite must let multiple developers work independently while preserving compatible interfaces, visible progress, and one unambiguous product direction.

## Source-of-Truth Hierarchy

Documentation follows this precedence order:

1. `PRD_AI_Sticker_Generator.md` defines product goals, scope, constraints, acceptance criteria, and contingency policy.
2. `ARCHITECTURE.md` defines system boundaries and component responsibilities consistent with the PRD.
3. `INTEGRATION_CONTRACTS.md` defines versioned interfaces between independently developed components.
4. `ROADMAP.md` tracks implementation, ownership, dependencies, blockers, and acceptance evidence.
5. The remaining guides explain how to build, test, and operate within those decisions.
6. Source code implements the approved contracts and must not silently redefine higher-level requirements.

When documents conflict, the higher document wins and the lower document must be corrected. Supporting documents may link to PRD sections but must not duplicate or reinterpret product requirements.

## Target Documentation Set

### `README.md`

Acts as the documentation index and branch orientation guide. It identifies the PRD as authoritative, summarizes the current code-versus-target gap, links every active document, and explains which documents developers must read for a given kind of work.

### `ARCHITECTURE.md`

Defines the target Android architecture: Expo SDK 57 and React Native application shell, native inference boundary, on-device prompt filtering, diffusion generation, subject segmentation, transparent image composition, local gallery storage, and native save/share integration. It also records the absence of a custom production backend and describes failure isolation and capability gating.

### `INTEGRATION_CONTRACTS.md`

Provides the team integration contract. It defines:

- TypeScript-to-native inference module methods and data types;
- generation request, progress, cancellation, success, and failure semantics;
- stable progress stages and error taxonomy;
- model manifest fields and compatibility rules;
- generated asset metadata and local-storage identifiers;
- content-filter decisions and safe user-facing error mapping;
- contract versioning, ownership, review, and change procedure;
- test fixtures and evidence required before a contract change is accepted.

Contracts describe observable behavior, not internal implementation. Breaking changes require a version increment and coordinated consumer updates. Additive changes remain backward compatible within the same major version.

### `ROADMAP.md`

Combines the five-week development plan with live implementation status. Each workstream records status, owner, target, dependencies, acceptance criteria, evidence, blockers, and last update. Allowed statuses are `Not started`, `In progress`, `Blocked`, and `Complete`. An item is complete only when linked evidence satisfies its acceptance criteria.

The roadmap also records the Week 1 Plan A/B/C go/no-go decision. It does not redefine PRD scope.

### `FEASIBILITY_SPIKE.md`

Defines the Week 1 experiment protocol: candidate runtime and model, representative device tiers, cold and warm latency, peak memory, package size, thermal behavior, output quality, segmentation quality, crash behavior, and pass/fail thresholds copied from the PRD where specified. It provides a repeatable evidence template and the formal contingency decision record.

### `MODEL_PIPELINE.md`

Defines the offline workstation pipeline and shipped runtime responsibilities: model selection, license review, conversion, quantization, validation, packaging, runtime delegate selection, deterministic metadata, background removal, and artifact provenance. It distinguishes developer tooling from code and models shipped in the app.

### `SAFETY_AND_PRIVACY.md`

Defines input-side content filtering, fixed negative prompting, adversarial testing, opportunistic blocklist updates, accepted residual risk, local data handling, deletion, logging restrictions, and lightweight opt-in telemetry. It preserves the PRD constraint that v1 has no output-image classifier and no custom server dependency.

### `USER_FLOWS.md`

Defines user-visible states and transitions for device capability gating, prompt entry, moderation rejection, generation, cancellation, failure, preview, save, share, regeneration, prompt editing, and local gallery access. Every flow includes expected recovery behavior and a reference to the corresponding integration contract.

### `TESTING_AND_RELEASE.md`

Defines unit, contract, integration, device-performance, thermal, functional, accessibility, adversarial, regression, and release testing. It contains the supported-device matrix, acceptance evidence format, wide-user-test gate, and Google Play release checklist. It keeps functional QA distinct from safety red-team testing.

### `LOCAL_DEVELOPMENT.md`

Defines reproducible development setup for Expo SDK 57, React Native 0.86, React 19.2.3, and Node.js 22.13.x or newer. It covers Android tooling, development builds required for custom native modules, environment-independent commands, model fixture handling, tests, and local reset procedures. It must not instruct developers to start the superseded FastAPI or worker stack.

## Documents to Remove

The following documents describe superseded boundaries or duplicate information and will be removed:

- `API_CONTRACT.md`
- `DATA_MODEL.md`
- `FRONTEND_ARCHITECTURE.md`
- `FRONTEND_DATA_CONTRACTS.md`
- `FRONTEND_IMPLEMENTATION_STATUS.md`
- `IMPLEMENTATION_STATUS.md`
- `MOBILE_QA_CHECKLIST.md`
- `MOBILE_USER_FLOWS.md`
- `MOCK_SERVICE.md`
- `PRIVACY_AND_ASSETS.md`
- `RUNBOOK.md`

Their relevant concepts will be rewritten into the target documents rather than copied. Backend endpoints, server authentication, cost ledgers, selfie assets, character profiles, canonical candidates, sticker packs, cloud queues, and ComfyUI server execution are not carried forward as target architecture.

## Cross-Document Rules

- Every supporting document begins with its purpose, authority, scope, and last-updated date.
- Requirements copied from the PRD retain their exact meaning and link back to the relevant PRD heading.
- Terms use one canonical vocabulary: prompt, generation request, model runtime, progress stage, generated asset, gallery item, capability gate, and contingency plan.
- Documents distinguish `Current repository state` from `Target release state` so existing scaffold code is never mistaken for completed product functionality.
- Progress claims appear only in `ROADMAP.md`; other documents link to it.
- Interface definitions appear only in `INTEGRATION_CONTRACTS.md`; other documents link to them.
- Test gates appear only in `TESTING_AND_RELEASE.md`, except feasibility-specific measurements in `FEASIBILITY_SPIKE.md`.
- No supporting document introduces cloud generation, a custom production backend, selfie generation, sticker fusion, native messenger pack installation, iOS release work, or output-image moderation into v1 scope.
- Markdown links must resolve within the repository, and all documents must pass a repository-wide stale-term and broken-link check.

## Team Workflow

Component owners implement against the versioned integration contract. Proposed contract changes identify affected producers, consumers, fixtures, migration impact, and roadmap items before approval. Workstream owners update `ROADMAP.md` when status, blockers, or evidence changes; completion requires evidence rather than a narrative claim.

Architecture decisions that materially change PRD constraints are escalated to the PRD rather than recorded only in a lower-level guide.

## Validation

The documentation migration is complete when:

1. The target set exists and the obsolete set is removed.
2. Every active document follows the source-of-truth hierarchy and cross-document rules.
3. The integration contract covers every boundary required by the user flows and architecture.
4. The roadmap maps all five PRD weeks, the go/no-go gate, owners, dependencies, blockers, and evidence.
5. A stale-term scan finds no target-architecture references to the retired backend/selfie/canonical-pack design.
6. All relative Markdown links resolve.
7. Expo statements match the versioned Expo SDK 57 documentation.
8. The PRD remains unchanged during the supporting-document rewrite.

## Scope Boundary

This design covers documentation migration only. It does not remove backend or frontend source code, select the final on-device model, implement native modules, or claim feasibility before Week 1 evidence exists.

# GenSticker Documentation

## Source-of-Truth Hierarchy

[`PRD_AI_Sticker_Generator.md`](./PRD_AI_Sticker_Generator.md) is the authoritative product document. It defines product goals, scope, constraints, acceptance criteria, and contingency policy. When documents conflict, the higher document in this hierarchy wins:

1. [`PRD_AI_Sticker_Generator.md`](./PRD_AI_Sticker_Generator.md)
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md)
3. [`INTEGRATION_CONTRACTS.md`](./INTEGRATION_CONTRACTS.md)
4. [`ROADMAP.md`](./ROADMAP.md)
5. The supporting implementation, testing, safety, and development guides

Source code implements approved decisions and contracts; it must not silently redefine them. Product-progress claims belong in the roadmap, interface definitions belong in the integration contracts, and release test gates belong in the testing and release guide.

## Current Repository State

The repository contains the shared Expo/TypeScript product, the Android ONNX native adapter, and
the iOS Core ML native adapter. Deterministic mock mode remains available only through an explicit
development setting. Native feasibility and release claims still require the physical-device
evidence defined in the testing guide.

An unused FastAPI scaffold also remains in the repository from the earlier prototype. It is historical code, not a release dependency or target architecture. The current codebase is therefore a starting point to realign, rather than evidence that the target release is implemented.

## Target Release State

The target release is the Expo SDK 57 text-to-sticker experience running fully locally after model
setup. Android ONNX/NNAPI and iOS Core ML/ANE are separate native adapters behind contract `1.0`.
The application accepts a prompt, applies on-device input filtering, generates through the selected
adapter, segments the result into a transparent PNG, and stores it locally for preview, save, and
OS sharing.

The release has [no custom production backend](./PRD_AI_Sticker_Generator.md#constraints). It uses a [capability gate for the supported device floor](./PRD_AI_Sticker_Generator.md#constraints), preserves a usable local gallery, and follows the [Week 1 Plan A/B/C contingency decision](./PRD_AI_Sticker_Generator.md#contingency-ladder-formalized).

## Documentation Map

The target documentation set is:

- [`README.md`](./README.md) — documentation index and branch orientation.
- [`PRD_AI_Sticker_Generator.md`](./PRD_AI_Sticker_Generator.md) — authoritative product requirements and contingency policy.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — target system boundaries and component responsibilities.
- [`INTEGRATION_CONTRACTS.md`](./INTEGRATION_CONTRACTS.md) — active versioned observable interfaces between application and on-device components.
- [`ROADMAP.md`](./ROADMAP.md) — implementation status, ownership, dependencies, blockers, and evidence.
- [`FEASIBILITY_SPIKE.md`](./FEASIBILITY_SPIKE.md) — active Week 1 runtime and model evaluation protocol and go/no-go record.
- [`MODEL_PIPELINE.md`](./MODEL_PIPELINE.md) — active offline model preparation and shipped-runtime responsibilities.
- [`SAFETY_AND_PRIVACY.md`](./SAFETY_AND_PRIVACY.md) — active input safety, local data handling, and accepted residual risk guide.
- [`USER_FLOWS.md`](./USER_FLOWS.md) — active user-visible states, transitions, and recovery behavior.
- [`TESTING_AND_RELEASE.md`](./TESTING_AND_RELEASE.md) — active quality, safety, device, and release-evidence procedure.
- [`LOCAL_DEVELOPMENT.md`](./LOCAL_DEVELOPMENT.md) — active current-scaffold and target-native contributor workflow.

## Reading Paths by Role

- **Product contributors:** read the PRD, then the roadmap and user flows.
- **Application contributors:** read the PRD, architecture, integration contracts, user flows, and local development guide.
- **Native/ML contributors:** read the PRD, architecture, integration contracts, feasibility spike, model pipeline, and testing and release guide.
- **QA/safety contributors:** read the PRD, safety and privacy guide, user flows, integration contracts, and testing and release guide.
- **Release contributors:** read the PRD, roadmap, safety and privacy guide, testing and release guide, and local development guide.

## Documentation Maintenance Rules

- Preserve the source-of-truth hierarchy; correct lower-ranked documents when they conflict with higher-ranked ones.
- Keep `Current Repository State` distinct from `Target Release State` so scaffold code is never mistaken for completed functionality.
- Use the canonical vocabulary: prompt, generation request, model runtime, progress stage, generated asset, gallery item, capability gate, and contingency plan.
- Link requirements back to the PRD instead of duplicating or reinterpreting them.
- Update [`ROADMAP.md`](./ROADMAP.md) when status, blockers, ownership, or evidence changes.
- Change interfaces only through [`INTEGRATION_CONTRACTS.md`](./INTEGRATION_CONTRACTS.md), with the required versioning and consumer coordination.
- Keep Markdown links valid and preserve the PRD unchanged during supporting-document updates.

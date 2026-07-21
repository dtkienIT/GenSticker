# Frontend Implementation Status

Last updated: 2026-07-21.

Member C owns the mobile/frontend side. Backend endpoints, real AI providers, GPU work, production archives, and final device/UAT evidence remain outside this frontend-only pass. “Mock-complete” means behavior is implemented against the deterministic device-local service; it does not mean the real API integration is complete.

## Feature backlog

| ID    | Progress | Frontend status | Remaining dependency                                                                                                                           |
| ----- | -------: | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| F-015 |      70% | In Progress     | Local diagnostics and safe error context are implemented; production telemetry needs backend integration.                                      |
| F-017 |      60% | In Progress     | Gallery/camera picker, permission, validation, preview, retry seam, and local-URI handling exist; real multipart progress/abort needs the API. |
| F-020 |      80% | In Progress     | Explicit candidate approval and versioned profile flow are implemented in mock mode; real API persistence remains.                             |
| F-021 |      80% | In Progress     | Polling, terminal-state handling, persisted IDs, and resume routing exist; backend job recovery remains.                                       |
| F-023 |      75% | In Progress     | Versioned core-eight emotion template is implemented; final product/prompt acceptance remains.                                                 |
| F-028 |      65% | In Progress     | Export manifest, targeted retry, and native share invocation exist; real files/archive generation needs backend output.                        |
| F-031 |      40% | In Progress     | Local debug route and safe record diagnostics exist; operational backend data is not connected.                                                |
| F-032 |      50% | In Progress     | Consent versioning, safe persistence/logging constraints, deletion flow, and tests exist; security/device evidence remains.                    |
| F-033 |      45% | In Progress     | Unit regressions and a Maestro mock smoke flow exist; device execution and API/queue suites remain.                                            |
| F-034 |      65% | In Progress     | Local setup, mock guide, QA checklist, and handoff docs exist; team rehearsal evidence remains.                                                |
| F-051 |      85% | In Progress     | Structured profile presets, schema validation, accessory constraints, and immutable versions are implemented.                                  |
| F-053 |      85% | In Progress     | Candidate compare/select, full-screen preview, approval, retry, and profile editor are implemented; real candidate API remains.                |
| F-057 |      90% | In Progress     | Eight-slot gallery, independent progress, partial state, and targeted retry are implemented; real generation endpoint remains.                 |
| F-058 |      85% | In Progress     | Exact-text controls, checkerboard preview, format selection, export manifest, and native share UX are implemented; real exported files remain. |
| F-059 |      60% | In Progress     | Versioned consent, input constraints, and safe error guidance exist; moderation policy and red-team execution remain.                          |

## Integration tasks

| ID      | Progress | Frontend status | Backend/device boundary                                                                                                                 |
| ------- | -------: | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| INT-004 |      80% | In Progress     | Mode factory and visible service badge exist; real environment/CORS verification remains.                                               |
| INT-006 |      60% | In Progress     | Local URI is preserved and base64 is rejected; multipart upload progress and abort need the API client contract.                        |
| INT-007 |      90% | In Progress     | Stable reason codes and Vietnamese presentation are wired; backend must return matching codes.                                          |
| INT-011 |      85% | In Progress     | TanStack Query polling stops at terminal states; real endpoint/cache behavior remains.                                                  |
| INT-012 |      80% | In Progress     | Active IDs persist and resume routes are selected locally; backend non-terminal job listing remains.                                    |
| INT-016 |     100% | Completed       | Central query keys and invalidation helpers are implemented and covered by the current frontend suite.                                  |
| INT-017 |      50% | In Progress     | Emulator URL and checklist are documented; runtime network evidence remains.                                                            |
| INT-018 |      60% | In Progress     | Mock mode is safe by default and HTTP mode is explicit; the product HTTP service stays disabled until the backend contract is supplied. |
| INT-030 |      90% | In Progress     | Candidate compare, zoom, select, recommendation, retry/error UI are implemented; real private assets/API remain.                        |
| INT-031 |      90% | In Progress     | Structured editor, validation, immutable versions, and save-error handling are implemented; real persistence remains.                   |
| INT-033 |      90% | In Progress     | Pack grid, partial state, independent polling, and targeted retry are implemented; real endpoint remains.                               |
| INT-035 |      75% | In Progress     | Text/editor/export/share UI is implemented; selected-only rendering and downloadable archives need backend output.                      |
| INT-036 |      60% | In Progress     | Consent UI/versioning and safe error guidance exist; moderation/audit hooks and red-team evidence remain.                               |

## Implemented frontend-only flows

- Consent → image picker/validation → character creation.
- Deterministic canonical job polling, cancellation, timeline, and resume.
- Three candidates with recommendation, full-screen preview, explicit selection, approval, and retry.
- Immutable CharacterProfile versions with preset and accessory constraints.
- Eight independent pack slots, partial-pack use, and single-slot retry.
- Exact-text editing, transparency preview, format selection, export manifest, and native share invocation.
- Product Library for Character/Pack/Job entities, resume navigation, cascade deletion, and query invalidation.
- Mock-mode badge, safe diagnostics, unit tests, and a basic Maestro smoke flow.

No backend endpoint, production provider, GPU pipeline, downloadable archive creation, or AI quality work is marked complete here.

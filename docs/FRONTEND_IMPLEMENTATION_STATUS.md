# Frontend Implementation Status

Last updated: 2026-07-21.

The mobile contract now runs against either the deterministic device-local service or the FastAPI HTTP stack. Production authentication/moderation and final physical-device UAT evidence remain outstanding.

## Feature backlog

| ID    | Progress | Frontend status | Remaining dependency                                                                                                                           |
| ----- | -------: | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| F-015 |      70% | In Progress     | Local diagnostics and safe error context are implemented; production telemetry needs backend integration.                                      |
| F-017 |      90% | In Progress     | Gallery/camera picker, validation, preview, and real multipart upload work; upload progress/abort remains.                                      |
| F-020 |      95% | In Progress     | Candidate approval and immutable profile versions persist through the real API; device UAT remains.                                             |
| F-021 |      95% | In Progress     | Polling, persisted IDs, resume, cancellation races, stale recovery, and worker lifecycle are covered; device interruption evidence remains.      |
| F-023 |      75% | In Progress     | Versioned core-eight emotion template is implemented; final product/prompt acceptance remains.                                                 |
| F-028 |      90% | In Progress     | Backend renders exact text into PNG/WebP and creates one ZIP per pack; native device share/download evidence remains.                            |
| F-031 |      85% | In Progress     | Debug UI consumes safe backend counts and lifecycle metadata in HTTP mode; production telemetry remains.                                       |
| F-032 |      50% | In Progress     | Consent versioning, safe persistence/logging constraints, deletion flow, and tests exist; security/device evidence remains.                    |
| F-033 |      80% | In Progress     | Frontend and backend/API/worker regressions exist; physical-device and paid-provider execution evidence remain.                                |
| F-034 |      65% | In Progress     | Local setup, mock guide, QA checklist, and handoff docs exist; team rehearsal evidence remains.                                                |
| F-051 |      85% | In Progress     | Structured profile presets, schema validation, accessory constraints, and immutable versions are implemented.                                  |
| F-053 |      95% | In Progress     | Candidate compare/select, private image delivery, approval, retry, and profile persistence use the real API; device UAT remains.                |
| F-057 |      95% | In Progress     | Eight real expression jobs update independent pack slots and support targeted retry; paid-provider smoke remains.                              |
| F-058 |      95% | In Progress     | Exact-text controls and real PNG/WebP/ZIP export are implemented; native device share evidence remains.                                        |
| F-059 |      60% | In Progress     | Versioned consent, input constraints, and safe error guidance exist; moderation policy and red-team execution remain.                          |

## Integration tasks

| ID      | Progress | Frontend status | Backend/device boundary                                                                                                                 |
| ------- | -------: | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| INT-004 |      95% | In Progress     | Mode factory, service badge, HTTP adapter, CORS, and LAN host resolution work; phone evidence remains.                                   |
| INT-006 |      80% | In Progress     | Local URI is uploaded as multipart and base64 is rejected; progress and abort remain.                                                     |
| INT-007 |      90% | In Progress     | Stable reason codes and Vietnamese presentation are wired; backend must return matching codes.                                          |
| INT-011 |      95% | In Progress     | TanStack Query polling uses real job/pack endpoints and stops at terminal states; device timing evidence remains.                        |
| INT-012 |      95% | In Progress     | Active IDs persist; resume uses contract-valid backend detail/list/filter endpoints and clears stale flow safely.                        |
| INT-016 |     100% | Completed       | Central query keys and invalidation helpers are implemented and covered by the current frontend suite.                                  |
| INT-017 |      50% | In Progress     | Emulator URL and checklist are documented; runtime network evidence remains.                                                            |
| INT-018 |     100% | Completed       | Both factories select mock/HTTP consistently; the HTTP implementation covers the full product contract.                                 |
| INT-030 |      95% | In Progress     | Candidate compare, preview, selection, recommendation and private asset routes are connected; device UAT remains.                       |
| INT-031 |     100% | Completed       | Structured validation, immutable versions, save errors, and backend persistence are implemented and tested.                             |
| INT-033 |      95% | In Progress     | Pack grid, partial state, independent polling, worker updates, and targeted retry use real endpoints; device UAT remains.                |
| INT-035 |      95% | In Progress     | Backend renders selected stickers and exposes downloadable PNG/WebP/ZIP assets; device sharing evidence remains.                        |
| INT-036 |      60% | In Progress     | Consent UI/versioning and safe error guidance exist; moderation/audit hooks and red-team evidence remain.                               |

## Implemented mock and HTTP flows

- Consent → image picker/validation → character creation.
- Canonical job polling, cancellation, timeline, and resume.
- Three candidates with recommendation, full-screen preview, explicit selection, approval, and retry.
- Immutable CharacterProfile versions with preset and accessory constraints.
- Eight independent pack slots, partial-pack use, and single-slot retry.
- Exact-text editing, transparency preview, format selection, export manifest, and native share invocation.
- Product Library for Character/Pack/Job entities, resume navigation, cascade deletion, and query invalidation.
- Mode badge, safe mock/HTTP diagnostics, unit/integration tests, and a basic Maestro smoke flow.

No backend endpoint, production provider, GPU pipeline, downloadable archive creation, or AI quality work is marked complete here.

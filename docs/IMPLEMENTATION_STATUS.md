# GenSticker Technical Implementation Status

This document maps implemented code and components to Feature Backlog IDs.

---

## ✅ Completed Technical Foundations (Phase 1)

| Feature ID | Description                         | Status       | Implementation Details                                                 |
| :--------- | :---------------------------------- | :----------- | :--------------------------------------------------------------------- |
| **F-001**  | Benchmark harness skeleton          | ✅ Completed | `experiments/benchmark/runner.py` & `schemas.py`                       |
| **F-006**  | License registry skeleton           | ✅ Completed | `governance/model_license_registry.example.yaml`                       |
| **F-007**  | Golden regression fixture structure | ✅ Completed | `experiments/golden/README.md`                                         |
| **F-008**  | Repo, CI & Docker baseline          | ✅ Completed | `docker-compose.yml`, `backend/Dockerfile`, `.github/workflows/ci.yml` |
| **F-009**  | Local auth & tenant seam            | ✅ Completed | `backend/app/core/security.py` (`X-Dev-User-Id`)                       |
| **F-010**  | SQLite schema & migrations          | ✅ Completed | `backend/app/db/models/`, `backend/migrations/` (Alembic)              |
| **F-011**  | Local filesystem asset store        | ✅ Completed | `backend/app/storage/asset_store.py` (Pillow + SHA256)                 |
| **F-012**  | Durable local job runner            | ✅ Completed | `backend/app/jobs/runner.py` & `worker.py` (SQLite polling)            |
| **F-013**  | Provider abstraction & ComfyUI seam | ✅ Completed | `backend/app/providers/` (`Mock` & `ComfyUI` adapter)                  |
| **F-014**  | Cost & telemetry ledger             | ✅ Completed | `backend/app/observability/cost_ledger.py`                             |
| **F-015**  | Structured local JSON logs          | ✅ Completed | `backend/app/core/logging.py`                                          |
| **F-016**  | FastAPI contract & TS client        | ✅ Completed | `backend/app/api/v1/`, `src/services/api/localApiClient.ts`            |

---

## 🟡 Partially Prepared / Vertical Slice Features

| Feature ID | Description                | Status       | Details                                                                                  |
| :--------- | :------------------------- | :----------- | :--------------------------------------------------------------------------------------- |
| **F-017**  | Mobile selfie upload       | 🟡 Partial   | Local API client multipart upload ready; mock UI flow preserved.                         |
| **F-018**  | Basic selfie validation    | ✅ Completed | `LocalSelfieValidator` checking format, dimensions, blank image, returning reason codes. |
| **F-019**  | Mock canonical generation  | ✅ Completed | `MockGenerationProvider` producing 3 candidate local mock PNGs with seed support.        |
| **F-021**  | Job progress and resume    | ✅ Completed | Durable polling, stage transitions (`JobEvent`), stale job recovery.                     |
| **F-022**  | Character deletion cascade | ✅ Completed | `DELETE /api/v1/characters/{id}` with soft delete & asset file removal.                  |

---

## 🛑 Explicitly Deferred Non-Goals (Future Phases)

The following items are NOT implemented in this phase per design specification:

- Real Stable Diffusion inference & model downloads.
- Real InstantID / IP-Adapter inference.
- Real ComfyUI workflow execution.
- Cloud deployment (RunPod, AWS, Supabase, Modal, Replicate).
- Character scoring & pack-level optimizer.
- WhatsApp / Telegram sticker pack export.

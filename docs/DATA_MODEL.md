# Data Model Documentation

This document describes the SQLite / PostgreSQL database domain schema.

---

## Entity Relationship Diagram

```text
  ┌──────────┐ 1      * ┌───────────┐ 1      * ┌──────────────────┐
  │   User   ├─────────►│ Character ├─────────►│ CharacterProfile │
  └────┬─────┘          └─────┬─────┘          └──────────────────┘
       │                      │
       │ 1                    │ 1
       │                      │
       ▼ *                    ▼ *
  ┌──────────┐          ┌───────────┐ 1      * ┌──────────────────┐
  │  Asset   │          │   Pack    ├─────────►│  GenerationJob   │
  └──────────┘          └───────────┘          └────────┬─────────┘
                                                        │
                                                        ├──► JobEvent (*)
                                                        └──► CostLedger (*)
```

---

## Table Schema Summary

### `users`

- `id` (PK, String 36)
- `external_id` (Unique, String 255)
- `created_at`, `updated_at` (DateTime)

### `characters`

- `id` (PK, String 36)
- `user_id` (FK -> users.id, CASCADE)
- `display_name` (String 255)
- `status` (`active` | `archived` | `deleted`)
- `approved_profile_version` (Integer, Nullable)
- `created_at`, `updated_at`, `deleted_at` (DateTime)

### `character_profiles`

- `id` (PK, String 36)
- `character_id` (FK -> characters.id, CASCADE)
- `version` (Integer)
- `canonical_asset_id` (String 36)
- `config_json` (Text JSON)
- `approved_at`, `created_at` (DateTime)

### `packs`

- `id` (PK, String 36)
- `user_id` (FK -> users.id)
- `character_id` (FK -> characters.id)
- `status` (`draft` | `generating` | `completed`)
- `config_version` (Integer)
- `created_at`, `updated_at` (DateTime)

### `assets`

- `id` (PK, String 36)
- `user_id` (FK -> users.id)
- `character_id` (FK -> characters.id, Nullable)
- `job_id` (FK -> generation_jobs.id, Nullable)
- `asset_type` (`selfie` | `canonical` | `sticker` | `temp`)
- `relative_path` (String 512)
- `mime_type` (String 100)
- `byte_size` (Integer)
- `sha256` (String 64)
- `width`, `height` (Integer, Nullable)
- `created_at`, `expires_at`, `deleted_at` (DateTime)

### `generation_jobs`

- `id` (PK, String 36)
- `user_id` (FK -> users.id)
- `character_id` (FK -> characters.id, Nullable)
- `pack_id` (FK -> packs.id, Nullable)
- `kind` (`canonical_generation` | `expression_generation` | `pack_generation`)
- `status` (`queued` | `running` | `succeeded` | `failed` | `cancelled`)
- `current_stage` (`validating` | `preparing` | `generating` | `background_removal` | `completed`)
- `progress` (Integer 0-100)
- `provider` (`universal`)
- `request_json`, `result_json` (Text)
- `error_code`, `error_message` (Text)
- `retry_count` (Integer)
- `created_at`, `started_at`, `completed_at`, `updated_at` (DateTime)

### `cost_ledgers`

- `id` (PK, String 36)
- `user_id` (FK -> users.id)
- `job_id` (FK -> generation_jobs.id, Nullable)
- `provider`, `model_name`, `workflow_version` (String)
- `gpu_seconds`, `estimated_cost_usd` (Float)
- `retry_count` (Integer)
- `metadata_json` (Text)
- `created_at` (DateTime)

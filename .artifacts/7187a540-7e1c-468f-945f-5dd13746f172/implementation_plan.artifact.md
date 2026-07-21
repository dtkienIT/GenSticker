# Integration of Supabase and AI Model Repositories

This plan outlines the steps to migrate the GenSticker backend from a local mock environment to a production-ready cloud environment using Supabase (PostgreSQL & Storage) and integrating specialized AI models from the identified GitHub repositories.

## User Review Required

> [!IMPORTANT]
> This migration involves moving from local SQLite to Supabase PostgreSQL. Existing local data in SQLite will not be automatically migrated to Supabase.
>
> Integration with Replicate (for AI models) requires a paid API token after free credits are exhausted.

## Proposed Changes

### 1. Configuration & Foundations

#### [MODIFY] [config.py](file:///E:/python/GenSticker/backend/app/core/config.py)
- Add Supabase configuration fields (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`).
- Add Replicate configuration fields (`REPLICATE_API_TOKEN`).
- Update `DATABASE_URL` default handling.

#### [MODIFY] [pyproject.toml](file:///E:/python/GenSticker/backend/pyproject.toml)
- Add `supabase`, `replicate`, and `psycopg2-binary` (for PostgreSQL) to dependencies.

---

### 2. Database & Migrations

#### [MODIFY] [session.py](file:///E:/python/GenSticker/backend/app/db/session.py)
- Ensure PostgreSQL compatibility (removing SQLite-specific `connect_args`).

#### [ACTION] Run Database Migrations
- Execute `alembic upgrade head` to initialize the Supabase schema.

---

### 3. Storage Layer (Supabase Storage)

#### [NEW] [supabase_store.py](file:///E:/python/GenSticker/backend/app/storage/supabase_store.py)
- Implement `SupabaseAssetStore` using the Supabase Python SDK.
- Handles uploading selfies and generated stickers to Supabase Storage Buckets.

#### [MODIFY] [asset_store.py](file:///E:/python/GenSticker/backend/app/storage/asset_store.py) (Factory section)
- Update the factory to return `SupabaseAssetStore` if `SUPABASE_URL` is present.

---

### 4. AI Provider Integration (Replicate)

#### [NEW] [replicate_provider.py](file:///E:/python/GenSticker/backend/app/providers/replicate_provider.py)
- Implement `ReplicateGenerationProvider`.
- Integrate `fofr/cog-face-to-sticker` for Selfie-to-Sticker.
- Integrate `fofr/cog-stickers` for Text-to-Sticker.

#### [MODIFY] [factory.py](file:///E:/python/GenSticker/backend/app/providers/__init__.py) (or wherever the factory lives)
- Register the new Replicate provider.

---

### 5. Frontend Connectivity

#### [MODIFY] [.env](file:///E:/python/GenSticker/.env) (Mobile)
- Set `EXPO_PUBLIC_USE_MOCK_SERVICE=false`.
- Ensure `EXPO_PUBLIC_API_URL` is pointing to the reachable Backend IP.

## Verification Plan

### Automated Tests
- Run `pytest backend/tests` to ensure existing logic still works with the new database/storage abstraction.
- Create a specific test script to verify Supabase connectivity.

### Manual Verification
- **Selfie Upload**: Verify image appears in Supabase Storage dashboard.
- **Generation Job**: Trigger a generation and monitor the Replicate dashboard.
- **Mobile Integration**: Use the app to generate a real sticker and verify it saves to the "Saved Library" (Supabase DB).

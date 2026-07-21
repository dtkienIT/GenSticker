# Walkthrough: Supabase & Replicate AI Integration

I have successfully migrated the backend to support Supabase (PostgreSQL & Storage) and integrated real AI model pipelines using Replicate.

## Changes Made

### 1. Backend Foundations
- **`config.py`**: Added configuration for Supabase (URL, Keys, Bucket) and Replicate (API Token).
- **`pyproject.toml`**: Added dependencies for `supabase`, `replicate`, and `psycopg2-binary`.
- **`session.py`**: Updated database engine to be compatible with PostgreSQL.

### 2. Storage Layer (Cloud Ready)
- **`supabase_store.py` [NEW]**: Implemented a cloud storage provider that uploads selfies and generated stickers directly to Supabase Storage Buckets.
- **`asset_store.py`**: Updated the factory to automatically switch to Supabase storage if the credentials are present in the environment.

### 3. AI Model Integration
- **`replicate_provider.py` [NEW]**: Implemented the `ReplicateGenerationProvider` using the `replicate` library.
    - **Selfie-to-Sticker**: Uses `fofr/face-to-sticker` (InstantID).
    - **Text-to-Sticker**: Uses `fofr/stickers` (SDXL).
- **`factory.py` [NEW]**: Added a provider factory to switch between `mock`, `replicate`, and `comfyui`.
- **`runner.py`**: Updated the background job runner to use the new provider factory.

### 4. Configuration
- **`.env`**: Updated with AI and Mobile app configurations.

## Verification

> [!WARNING]
> **Database Migration Required**:
> I attempted to run the migrations automatically, but encountered a DNS error connecting to `db.ncwfomqbhxhytziroxtr.supabase.co`.
>
> Please ensure your computer can connect to the Supabase host and run the following command manually from the project root:
> ```bash
> python -m alembic -c backend/alembic.ini upgrade head
> ```

> [!IMPORTANT]
> **Replicate API Token**:
> I have added the `REPLICATE_API_TOKEN` field to your `.env`. Please fill it with your token from [Replicate](https://replicate.com/account/api-tokens) to enable real AI generation.

## How to Test
1. **Start Backend**: `npm run api:dev`
2. **Start Job Runner**: `npm run worker:dev`
3. **Start Mobile App**: `npm start`
4. Try creating a sticker from a selfie. The app will now:
    - Upload the selfie to Supabase Storage.
    - Create a job in the Supabase Database.
    - The Worker will pick up the job, call Replicate AI, and save the result back to Supabase.

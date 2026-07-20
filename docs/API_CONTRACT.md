# API Contract Specification (v1)

Base Path: `/api/v1`

---

## 🔐 Authentication Header

- Header: `X-Dev-User-Id`
- Default (Dev mode): `local-dev-user`
- Scope: Every operation is strictly scoped to the authenticated tenant.

---

## 📌 Endpoints

### 1. `GET /health`

Returns process health status.

### 2. `GET /ready`

Returns database & local asset store readiness.

### 3. `GET /api/v1/me`

Returns current authenticated development user details.

### 4. `POST /api/v1/assets/selfies`

Multipart image upload.

- Request: `file: UploadFile` (Multipart)
- Response:
  ```json
  {
    "asset": {
      "id": "uuid-str",
      "user_id": "user-str",
      "asset_type": "selfie",
      "relative_path": "user-str/selfies/uuid.jpg",
      "mime_type": "image/jpeg",
      "byte_size": 123456,
      "sha256": "hash",
      "width": 512,
      "height": 512,
      "created_at": "ISO-8601"
    },
    "validation": {
      "valid": true,
      "reason_codes": [],
      "warnings": [],
      "width": 512,
      "height": 512,
      "mime_type": "image/jpeg",
      "byte_size": 123456
    }
  }
  ```

### 5. `GET /api/v1/assets/{asset_id}/content`

Authenticated private file download route.

### 6. `POST /api/v1/characters`

Creates a new Character profile.

- Body: `{"display_name": "String", "selfie_asset_id": "Optional UUID"}`

### 7. `GET /api/v1/characters`

Lists characters owned by current user.

### 8. `DELETE /api/v1/characters/{character_id}`

Idempotent local deletion cascade for Character and associated local assets.

### 9. `POST /api/v1/generation-jobs`

Submits a mock canonical-generation job.

- Body: `{"character_id": "UUID", "kind": "canonical_generation", "seed": 42, "style": "chibi", "emotion": "happy"}`

### 10. `GET /api/v1/generation-jobs/{job_id}`

Returns durable job status, progress, stage, and candidate results.

### 11. `GET /api/v1/generation-jobs/{job_id}/events`

Returns ordered stage transition events for a job.

### 12. `POST /api/v1/generation-jobs/{job_id}/cancel`

Cancels a queued or running job.

### 13. `GET /api/v1/cost-ledger`

Lists local cost & GPU seconds ledger entries.

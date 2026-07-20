# Privacy & Asset Management Specification

## Local-First Privacy Guarantees

1. **Zero Cloud Upload in Local MVP**: All uploaded selfie images, character profiles, and generated candidate stickers remain on the local machine under `data/assets/`.
2. **Private File Content Route**: Asset raw content is served exclusively via the authenticated `/api/v1/assets/{id}/content` route. Absolute local disk paths are never exposed to clients or written to response JSON.
3. **No Sensitive Data Logging**: Raw image binary data, base64 strings, or personal selfie identifiers are excluded from JSON logs.
4. **Idempotent Deletion Cascade**: Calling `DELETE /api/v1/characters/{id}` flags character records as soft-deleted and unlinks/deletes all associated local file binaries from disk.
5. **Path Traversal Guard**: All asset store file paths are validated against `data/assets/` to block directory traversal attacks.

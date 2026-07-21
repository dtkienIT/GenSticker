# Frontend Data Contracts

The shared contract is defined once in `src/services/contracts/types.ts` and validated at service boundaries by `schemas.ts`.

Core entities are `ApiError`, `ValidationResult`, `Asset`, `Character`, `GenerationJob`, `JobEvent`, `CanonicalCandidate`, immutable-version `CharacterProfile`, `StickerPack`, independent `StickerSlot`, `ExportManifest`, and `ConsentState`.

UI decisions use stable statuses and error codes, never human-readable service messages. Route parameters contain only stable IDs. Selfie upload accepts a local URI and metadata and rejects data/base64 URIs. The HTTP implementation maps backend DTOs into these shapes and validates responses with the exported Zod schemas.

`CharacterProfile` validation permits at most two face accessories and treats `none` as exclusive. Sticker text uses the frontend's 16–48 font-size limits. `ExportManifest` describes shareable outputs; the UI may invoke native file sharing only for a local `file:` asset and otherwise uses the platform share fallback. The backend remains responsible for producing real downloadable PNG/WebP/ZIP assets.

# Frontend Data Contracts

The shared contract is defined once in `src/services/contracts/types.ts` and validated at service boundaries by `schemas.ts`.

Core entities are `ApiError`, `ValidationResult`, `Asset`, `Character`, `GenerationJob`, `JobEvent`, `CanonicalCandidate`, immutable-version `CharacterProfile`, `StickerPack`, independent `StickerSlot`, `ExportManifest`, and `ConsentState`.

UI decisions use stable statuses and error codes, never human-readable service messages. Route parameters contain only stable IDs. Selfie upload accepts a local URI and metadata and rejects data/base64 URIs. The future HTTP implementation must preserve these shapes and validate responses with the exported Zod schemas.

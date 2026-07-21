# Frontend Architecture

GenSticker Mobile uses Expo SDK 54, Expo Router, strict TypeScript, Zustand, TanStack Query, React Hook Form, Zod, `expo-image-picker`, and `expo-sharing`.

The selfie product path is provider-neutral: `screens → query/hooks → StickerProductService → mock or HTTP adapter`. Screens pass stable entity IDs through routes and never import mock fixtures. Mock records live in AsyncStorage; HTTP records live behind FastAPI/PostgreSQL. Transient picker data remains in memory. The original `useStickerStore` remains only for the legacy Text-to-Sticker prototype.

- `services/contracts`: canonical types, errors, service interface, and boundary schemas.
- `services/mock`: deterministic character/job/profile/pack/export lifecycle simulation.
- `services/http`: disabled product-service seam for Member B's real API implementation.
- `services/http`: contract-validating FastAPI adapter with multipart upload and LAN URL resolution.
- `services/factory.ts`: explicit mock/HTTP mode selection.
- `services/sharing`: platform-aware export sharing with local-file support and fallback.
- `query` and `hooks`: keys, invalidation, terminal-state polling.
- `store`: persisted product-session IDs, consent migration, transient selfie draft, and legacy text saves.
- `components`: reusable character, pack, export, feedback, and common UI.
- `app`: thin route orchestration with stable IDs, loading/error states, and resume navigation.

The Product Library queries product entities rather than duplicating them into a second store. Character deletion goes through the service, then invalidates relevant queries and clears stale session references.

No frontend mock operation makes a network request. Safe diagnostics use an allowlist and reject raw URIs, tokens, data URIs, and image binary/base64 content.

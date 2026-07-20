# Frontend Architecture

GenSticker Mobile uses Expo SDK 57, Expo Router, strict TypeScript, Zustand, TanStack Query, React Hook Form, and Zod.

The selfie product path is provider-neutral: `screens → query/hooks → StickerProductService → MockStickerProductService`. `HttpStickerProductService` is an intentionally disabled contract skeleton for later backend work. Screens pass stable entity IDs through routes and never import mock fixtures. Durable product-like records live in AsyncStorage; transient picker data remains in memory. The original `useStickerStore` remains only for Text-to-Sticker.

- `services/contracts`: canonical types and boundary schemas.
- `services/mock`: deterministic lifecycle simulation.
- `services/factory.ts`: mode selection; mock is the safe default.
- `query` and `hooks`: keys, invalidation, terminal-state polling.
- `store`: small persisted session state and non-persisted selfie draft.
- `components`: reusable product UI.
- `app`: thin route orchestration with stable IDs.

No frontend mock operation makes a network request. Safe diagnostics use an allowlist and reject raw URIs, tokens, and data URIs.

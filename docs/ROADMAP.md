# GenSticker Product & Technical Roadmap

---

## 📌 Phase 1: Mobile and Full-Stack Product Path (Current)

- [x] React Native & Expo project setup with Expo Router.
- [x] TypeScript strict mode configuration.
- [x] Zustand state management for draft requests, job status, and local library.
- [x] TanStack Query setup.
- [x] Form management with React Hook Form & Zod schema validation.
- [x] Offline `MockStickerGenerationService` with multi-step progress tracking.
- [x] Light and Dark theme design system.
- [x] Screens: Home, Create Mode Selection, Text-to-Sticker, Selfie-to-Sticker, Generating Progress, Result View, Saved Library, Settings.
- [x] Canonical candidate comparison, private delivery, explicit approval, and immutable profile persistence in mock and HTTP modes.
- [x] Eight-slot pack gallery backed by durable expression jobs, partial state, and targeted retry.
- [x] Exact-text controls plus real PNG/WebP/ZIP generation and share manifests.
- [x] Product Library navigation and cascade deletion for local Character/Pack/Job entities.
- [x] Frontend unit regressions and a basic Maestro smoke-flow definition.
- [ ] Execute Android device/emulator QA and retain evidence.
- [x] Connect the complete product service contract to FastAPI.

---

## 📌 Phase 2: FastAPI Backend & Cloud Infrastructure

- [x] FastAPI service setup with a development auth seam.
- [ ] Replace development auth with verified Supabase JWT authentication.
- [x] PostgreSQL schema and Alembic migrations for product/job metadata.
- [x] Private Supabase Storage with signed asset URLs.
- [x] Durable database-polled worker with stale recovery and row locking.
- [ ] Consider SSE only if polling no longer meets product needs.

---

## 📌 Phase 3: AI Model Pipeline

- [x] One-person identity-preserving pipeline (SDXL + InstantID + hair Canny ControlNet).
- [x] BiRefNet foreground removal, hard chin cutoff, adaptive tone, and white outline.
- [ ] Multi-person detection, identity assignment, and composition.
- [x] HTTP product-service binding with validated frontend contracts.

---

## 📌 Phase 4: Production Pack Generation & Messenger Export

- [ ] Character consistency across sticker sets.
- [x] Deterministic frontend eight-slot pack flow with partial completion and targeted retry.
- [x] Backend-connected multi-sticker generation and private asset delivery.
- [ ] Direct export to WhatsApp Sticker Pack format (`.wasticker`).
- [ ] Direct export to Telegram Sticker Set format.
- [x] Frontend in-app sticker text controls and checkerboard preview.
- [ ] Production text rendering into downloadable sticker assets.

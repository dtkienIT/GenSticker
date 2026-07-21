# GenSticker Product & Technical Roadmap

---

## 📌 Phase 1: Mobile Scaffold & Mock Generation (Current)

- [x] React Native & Expo project setup with Expo Router.
- [x] TypeScript strict mode configuration.
- [x] Zustand state management for draft requests, job status, and local library.
- [x] TanStack Query setup.
- [x] Form management with React Hook Form & Zod schema validation.
- [x] Offline `MockStickerGenerationService` with multi-step progress tracking.
- [x] Light and Dark theme design system.
- [x] Screens: Home, Create Mode Selection, Text-to-Sticker, Selfie-to-Sticker, Generating Progress, Result View, Saved Library, Settings.
- [x] Canonical candidate comparison, recommendation, full-screen preview, explicit approval, and immutable profile editing in mock mode.
- [x] Eight-slot mock pack gallery with partial state and targeted single-slot retry.
- [x] Exact-text controls, transparency preview, export manifest, and native share invocation in mock mode.
- [x] Product Library navigation and cascade deletion for local Character/Pack/Job entities.
- [x] Frontend unit regressions and a basic Maestro smoke-flow definition.
- [ ] Execute Android device/emulator QA and retain evidence.
- [ ] Connect the product service to Member B's real API implementation.

---

## 📌 Phase 2: FastAPI Backend & Cloud Infrastructure

- [ ] FastAPI service setup with JWT / Supabase Auth.
- [ ] PostgreSQL schema for sticker jobs, user quotas, and metadata.
- [ ] Supabase Storage bucket integration for image uploads and sticker CDN.
- [ ] Celery / Redis job queue setup.
- [ ] SSE (Server-Sent Events) status stream endpoint for real-time progress updates.

---

## 📌 Phase 3: AI Model Pipeline & GPU Workers

- [ ] Colab Pro / Modal GPU worker integration.
- [ ] ComfyUI pipeline setup for Text-to-Sticker (SDXL / SD1.5 + LoRA).
- [ ] ComfyUI pipeline for Selfie-to-Sticker (InstantID / IP-Adapter + ControlNet).
- [ ] Background removal nodes (rembg / BiRefNet / SAM) for clean transparent PNG stickers.
- [ ] Production API service binding in `StickerGenerationService`.

---

## 📌 Phase 4: Production Pack Generation & Messenger Export

- [ ] Character consistency across sticker sets.
- [x] Deterministic frontend eight-slot pack flow with partial completion and targeted retry.
- [ ] Backend-connected multi-sticker generation and production asset delivery.
- [ ] Direct export to WhatsApp Sticker Pack format (`.wasticker`).
- [ ] Direct export to Telegram Sticker Set format.
- [x] Frontend in-app sticker text controls and checkerboard preview.
- [ ] Production text rendering into downloadable sticker assets.

# GenSticker Architecture Overview

This document describes the high-level system architecture of GenSticker, covering both the current mobile scaffold and the future end-to-end backend & AI worker infrastructure.

---

## 1. Current Phase: Mobile Scaffold & Mock-First Architecture

In the initial phase, GenSticker runs entirely client-side without external cloud dependencies.

```text
[ React Native / Expo App ]
       │
       ├── Expo Router (File-Based Navigation)
       ├── React Hook Form + Zod (Validation)
       ├── Zustand Store (Local Library & Job State)
       └── MockStickerGenerationService
                └── Simulated Delays & Local SVG Assets
```

---

## 2. Target End-to-End System Architecture

The future production environment will connect the mobile app to an asynchronous AI generation job pipeline:

```text
┌──────────────┐       HTTP / REST        ┌──────────────┐
│  Mobile App  ├─────────────────────────►│ FastAPI      │
│  (React      │                          │ Backend      │
│   Native)    │◄─────────────────────────┤ API          │
└──────┬───────┘       WebSocket / SSE    └──────┬───────┘
       │                                         │
       │                                         │ Push Jobs
       │                                         ▼
       │                                  ┌──────────────┐
       │                                  │ Redis /      │
       │                                  │ Celery Queue │
       │                                  └──────┬───────┘
       │                                         │
       │                                         │ Pull Jobs
       │                                         ▼
       │                                  ┌──────────────┐
       │   Download Sticker               │ GPU AI       │
       └──────────────────────────────────┤ Worker       │
              (Supabase CDN / S3)         │ (ComfyUI /   │
                                          │  Diffusers)  │
                                          └──────────────┘
```

---

## 3. Component Details

### A. Mobile Client (`GenSticker`)

- Built with React Native, Expo Router, and TypeScript.
- Handles user inputs, image upload preprocessing, progress display, local caching, and sticker sharing.

### B. Backend API (`FastAPI`)

- Handles authentication, prompt sanitation, credit management, and sticker metadata CRUD.
- Enqueues sticker generation requests into Redis/Celery queue.
- Provides SSE (Server-Sent Events) / WebSocket endpoints for real-time progress updates.

### C. Storage & Database (`Supabase / S3`)

- PostgreSQL database storing user profiles, generation requests, and sticker metadata.
- Object storage bucket hosting raw uploads and generated transparent sticker PNGs.

### D. GPU AI Worker (`ComfyUI / Colab Pro / Modal`)

- Asynchronous worker listening on job queues.
- Executes customized ComfyUI workflows (Text2Img, ControlNet, IP-Adapter, Segment Anything for background removal).
- Uploads final high-resolution PNG to object storage and marks job as completed.

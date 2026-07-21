# GenSticker 🎨✨

**GenSticker** is an Expo SDK 57 application for text and canonical-first personalized sticker prototypes.

> All current personalized-product data use deterministic, device-local frontend mocks. Backend and real AI are not implemented by this frontend task.

Keep `EXPO_PUBLIC_STICKER_SERVICE=mock`. The legacy mock flag remains supported temporarily; HTTP product mode is a disabled interface skeleton. The selfie journey is consent → picker/validation → three candidates with full-screen preview → explicit approval → versioned profile → eight-slot pack → targeted retry → exact text → export/share manifest → native share invocation.

See [Frontend architecture](docs/FRONTEND_ARCHITECTURE.md), [mock service](docs/MOCK_SERVICE.md), [user flows](docs/MOBILE_USER_FLOWS.md), and [Android QA checklist](docs/MOBILE_QA_CHECKLIST.md).

---

## 🚀 Key Features (Scaffold Phase)

- ✍️ **Text-to-Sticker**: Generate expressive stickers from text prompts.
- 🤳 **Selfie-to-Sticker**: Pick photos from gallery and customize styles and emotions.
- 🎨 **Multiple AI Styles**: Chibi, Cartoon, 3D Pixar, and Meme.
- 😄 **Expressive Emotions**: Happy, Angry, Sad, Love, Confused.
- ⏳ **Simulated Progress**: Multi-step AI generation progress indicator with step descriptions.
- 📚 **Product Library**: Resume local Character, Pack, and Job records; retain legacy text-sticker saves.
- 🧑‍🎨 **Canonical Profile Flow**: Compare three candidates, approve explicitly, and save immutable profile versions.
- 📦 **Eight-Slot Packs**: Track independent emotion slots, partial completion, and targeted retry.
- 📤 **Export & Share UX**: Exact-text controls, transparency preview, format selection, and platform sharing.
- 🌓 **Design System**: Full light & dark theme support with custom component tokens.

---

## 🛠️ Technology Stack

- **Framework**: React Native + Expo (v57)
- **Routing**: Expo Router (File-based navigation)
- **Language**: TypeScript (Strict Mode)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Form Management**: React Hook Form
- **Validation**: Zod
- **Media Picker**: `expo-image-picker`
- **Native Sharing**: `expo-sharing` with React Native fallback
- **Testing**: Vitest and Maestro smoke-flow definition
- **Linting & Formatting**: ESLint + Prettier

---

## 💻 Installation & Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/dtkienIT/GenSticker.git
   cd GenSticker
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Environment Setup**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

---

## 🚀 Available Scripts

```bash
# Start Expo development server
npm run start

# Run on Android emulator / device
npm run android

# Run on iOS simulator / device
npm run ios

# Run on web browser
npm run web

# TypeScript strict type checking
npm run typecheck

# Code linting with ESLint
npm run lint

# Frontend unit tests
npm test

# Format code with Prettier
npm run format

# Verify formatting without editing
npm run format:check
```

---

## 📁 Project Directory Structure

```text
GenSticker/
├── .github/workflows/        # Mobile, backend, migration, and Docker CI
├── .maestro/                 # Android mock-flow smoke definition
├── app/                      # Expo Router screens
│   ├── canonical/            # Canonical generation and candidate selection
│   ├── create/               # Text/Selfie creation and legacy result flow
│   ├── library/              # Product and legacy sticker library
│   ├── pack/                 # Eight-slot pack progress and targeted retry
│   ├── profile/              # Immutable CharacterProfile editor
│   ├── settings/             # Theme and application settings
│   ├── sticker/              # Text, preview, export, and share screen
│   ├── _layout.tsx           # Navigation root and providers
│   ├── consent.tsx           # Versioned selfie consent
│   ├── debug.tsx             # Safe local mock diagnostics
│   └── index.tsx             # Home and resume entry point
├── assets/                   # Static Expo and bundled mock assets
├── backend/                  # FastAPI local backend scaffold
│   ├── app/
│   │   ├── api/v1/           # Health, user, asset, character, job, and cost API
│   │   ├── core/             # Configuration, errors, logging, and dev auth
│   │   ├── db/models/        # SQLAlchemy domain models
│   │   ├── domain/           # Selfie validation domain logic
│   │   ├── jobs/             # Durable job runner and worker
│   │   ├── observability/    # Cost ledger and budget policy
│   │   ├── providers/        # Mock provider and ComfyUI seam
│   │   └── storage/          # Local private asset storage
│   ├── migrations/           # Alembic migration environment and versions
│   ├── tests/                # Backend API and lifecycle tests
│   ├── Dockerfile
│   └── pyproject.toml
├── data/                     # Local SQLite/runtime assets; not production data
├── docs/                     # Architecture, contracts, status, QA, and runbooks
├── experiments/              # Benchmark harness, configs, manifests, golden data
├── governance/               # Model-license registry and governance notes
├── scripts/                  # Cross-platform setup, start, and reset helpers
├── src/                      # Mobile application modules
│   ├── components/           # Character, common, export, feedback, pack, selfie UI
│   ├── constants/            # Styles, emotion templates, presets, and mock assets
│   ├── hooks/                # Generation-job and sticker-pack polling hooks
│   ├── i18n/                 # Vietnamese/English UI and error strings
│   ├── query/                # Query keys, invalidation, and terminal-state policy
│   ├── services/             # API, contracts, mock/http, diagnostics, sharing, storage
│   ├── store/                # Persisted product session and transient draft state
│   ├── testing/              # Frontend test mocks
│   ├── theme/                # Design tokens and ThemeProvider
│   ├── types/                # Legacy sticker types
│   └── validation/           # Legacy Text-to-Sticker validation
├── .env.example              # Backend and mobile environment template
├── app.json                  # Expo SDK 57 application configuration
├── docker-compose.yml        # Local API/worker stack
├── eslint.config.js          # ESLint flat configuration
├── package.json              # Mobile scripts and dependencies
├── tsconfig.json             # Strict TypeScript configuration
└── vitest.config.ts          # Frontend unit-test configuration
```

Generated directories such as `node_modules/`, `.expo/`, Python caches, and local planning workbooks are intentionally omitted. `data/` contains local development state only; never commit user selfies, private exports, or production credentials.

---

## 🔮 Future Integration Plan

In future phases, Member B's real API implementation will replace the current disabled `HttpStickerProductService` skeleton and connect the frontend contract to FastAPI, private asset delivery, job recovery, and GPU inference workers. Mock mode remains available for deterministic frontend development. See [ARCHITECTURE.md](docs/ARCHITECTURE.md), [FRONTEND_IMPLEMENTATION_STATUS.md](docs/FRONTEND_IMPLEMENTATION_STATUS.md), and [ROADMAP.md](docs/ROADMAP.md) for details.

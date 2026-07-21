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
├── app/                      # Expo Router screens
│   ├── _layout.tsx           # Navigation root layout & providers
│   ├── index.tsx             # Home Screen
│   ├── create/               # Generation flow screens
│   │   ├── index.tsx         # Generation mode selection
│   │   ├── text.tsx          # Text-to-Sticker form
│   │   ├── selfie.tsx        # Selfie-to-Sticker form
│   │   ├── generating.tsx    # Progress & status screen
│   │   └── result.tsx        # Result & save screen
│   ├── library/              # Saved sticker gallery
│   └── settings/             # Settings & theme toggle
│
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── common/           # AppButton, AppTextInput, ScreenContainer, etc.
│   │   ├── sticker/          # StyleCard, EmotionChip, StickerCard, LoadingProgress
│   │   └── layout/           # Custom layout components
│   ├── constants/            # Sticker styles, emotions & offline mock assets
│   ├── services/
│   │   ├── api/              # API Client skeleton reading EXPO_PUBLIC_API_URL
│   │   └── mock/             # MockStickerGenerationService implementation
│   ├── store/                # Zustand store (state management)
│   ├── theme/                # Design tokens, palettes & ThemeProvider
│   ├── types/                # TypeScript type definitions
│   └── validation/           # Zod validation schemas
│
├── assets/                   # Static app assets
├── docs/                     # Architectural documentation & roadmap
├── .env.example              # Environment variables template
├── .eslintrc.js              # ESLint configuration
├── .prettierrc               # Prettier configuration
└── package.json
```

---

## 🔮 Future Integration Plan

In future phases, Member B's real API implementation will replace the current disabled `HttpStickerProductService` skeleton and connect the frontend contract to FastAPI, private asset delivery, job recovery, and GPU inference workers. Mock mode remains available for deterministic frontend development. See [ARCHITECTURE.md](docs/ARCHITECTURE.md), [FRONTEND_IMPLEMENTATION_STATUS.md](docs/FRONTEND_IMPLEMENTATION_STATUS.md), and [ROADMAP.md](docs/ROADMAP.md) for details.

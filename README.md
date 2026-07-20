# GenSticker 🎨✨

**GenSticker** is a modern React Native & Expo mobile application designed for generative AI sticker creation from text prompts and selfie photos.

---

## 🚀 Key Features (Scaffold Phase)

- ✍️ **Text-to-Sticker**: Generate expressive stickers from text prompts.
- 🤳 **Selfie-to-Sticker**: Pick photos from gallery and customize styles and emotions.
- 🎨 **Multiple AI Styles**: Chibi, Cartoon, 3D Pixar, and Meme.
- 😄 **Expressive Emotions**: Happy, Angry, Sad, Love, Confused.
- ⏳ **Simulated Progress**: Multi-step AI generation progress indicator with step descriptions.
- 📚 **Sticker Library**: Save generated stickers to local Zustand state.
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

In future phases, the mock service layer (`MockStickerGenerationService`) will be replaced by an API implementation connecting to a Python FastAPI backend and GPU inference workers running Stable Diffusion / ComfyUI pipeline. See [ARCHITECTURE.md](docs/ARCHITECTURE.md) and [ROADMAP.md](docs/ROADMAP.md) for details.

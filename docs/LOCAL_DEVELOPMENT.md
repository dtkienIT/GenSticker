# Local Development Guide

This guide explains how to set up, run, and test the **GenSticker** local-first stack. Member C's normal workflow is the frontend-only mock mode; Python/backend setup is optional for backend integration work.

---

## 💻 Prerequisites

- Python 3.10+
- Node.js 20+ & npm
- Git
- PowerShell (Windows) or Bash (Unix)
- Optional: Docker & Docker Compose

---

## 🛠️ Step-by-Step Local Setup

### 1. Automated Script (Recommended)

On Windows PowerShell:

```powershell
.\scripts\setup-local.ps1
```

On Linux / macOS:

```bash
chmod +x ./scripts/*.sh
./scripts/setup-local.sh
```

### 2. Manual Setup

1. Create virtual environment and install backend in editable mode:
   ```bash
   python -m venv .venv
   # Windows:
   .\.venv\Scripts\python.exe -m pip install -e "backend[dev]"
   # Linux/macOS:
   ./.venv/bin/pip install -e "backend[dev]"
   ```
2. Copy environment file:
   ```bash
   cp .env.example .env
   ```
3. Run Alembic migrations:
   ```bash
   python -m alembic -c backend/alembic.ini upgrade head
   ```

---

## 🚀 Running the Local Stack

### Mobile App Modes

#### Mode A: Client-Side Mock Mode (Default)

In `.env` or environment:

```env
EXPO_PUBLIC_STICKER_SERVICE=mock
EXPO_PUBLIC_USE_MOCK_SERVICE=true
```

`EXPO_PUBLIC_STICKER_SERVICE` controls the current product service. The legacy flag remains because the separate Text-to-Sticker prototype still reads it. Mock is the safe product default.

Run mobile app:

```bash
npm run start
```

#### Mode B: Local API Mode

> The product-level `HttpStickerProductService` is intentionally disabled until Member B supplies a contract-compatible implementation. The settings below describe the intended integration mode, not a completed Member C flow.

In `.env` or environment:

```env
EXPO_PUBLIC_STICKER_SERVICE=http
EXPO_PUBLIC_USE_MOCK_SERVICE=false
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1  # Android Emulator
# EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1  # Web Browser
```

1. Start API Server:
   ```bash
   npm run api:dev
   ```
2. Start Job Worker:
   ```bash
   npm run worker:dev
   ```
3. Start Mobile App:
   ```bash
   npm run start
   ```

Use `10.0.2.2` from the Android emulator, `localhost` from web, and the development machine's LAN address from a physical device. CORS, firewall, authentication, multipart upload, private assets, and job recovery must be verified with the backend owner.

---

## ✅ Frontend Verification

```bash
npm run typecheck
npm test
npm run lint
npm run format:check
npx expo config --type public
```

The basic device smoke definition is `.maestro/mock-smoke.yaml`; it still needs execution on an emulator/device before it counts as E2E evidence.

---

## 🧹 Resetting Local Data

To clear local SQLite database and generated assets:

```powershell
.\scripts\reset-local.ps1
```

# Local Development Guide

This guide explains how to set up, run, and test the **GenSticker** SDK 54 stack in either frontend mock mode or full HTTP mode.

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

### SDK 54 device client

The store version of Expo Go only supports the current SDK. For an Android phone running this SDK 54 project, install the matching [Expo Go 54 build](https://expo.dev/go?device=true&platform=android&sdkVersion=54). A physical iPhone cannot sideload an older Expo Go build, so use an SDK 54 development build instead.

### Mobile App Modes

#### Mode A: Client-Side Mock Mode

In `.env` or environment:

```env
EXPO_PUBLIC_STICKER_SERVICE=mock
EXPO_PUBLIC_USE_MOCK_SERVICE=true
```

Use this mode for deterministic UI work with no database, storage, worker, or paid provider calls.

Run mobile app:

```bash
npm run start
```

#### Mode B: Full HTTP Mode

In `.env` or environment:

```env
EXPO_PUBLIC_STICKER_SERVICE=http
EXPO_PUBLIC_USE_MOCK_SERVICE=false
# Optional: omit this variable on a physical device to derive the LAN host from Metro.
# EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1  # Android Emulator
# EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1  # Web / iOS Simulator
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

Use `10.0.2.2` from the Android emulator, loopback from web/iOS Simulator, and the development machine's LAN address from a physical device. Apply Alembic migrations before starting the processes. When `.env` selects Replicate, each generation can incur provider charges; automated tests always isolate external services.

The two frontend flags exist because the canonical product flow and the legacy Text-to-Sticker flow have separate service factories. Full HTTP mode therefore requires `http` plus `false`; mock mode requires `mock` plus `true`.

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

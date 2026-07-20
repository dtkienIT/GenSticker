# Local Development Guide

This guide explains how to set up, run, and test the **GenSticker** local-first stack on your local environment.

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
EXPO_PUBLIC_USE_MOCK_SERVICE=true
```

Run mobile app:

```bash
npm run start
```

#### Mode B: Local API Mode

In `.env` or environment:

```env
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

---

## 🧹 Resetting Local Data

To clear local SQLite database and generated assets:

```powershell
.\scripts\reset-local.ps1
```

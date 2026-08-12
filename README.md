# 🎨 DUHAT AI Sticker Studio — Personalized AI Sticker Generation (V1)

[![Python](https://img.shields.io/badge/Backend-FastAPI_0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_18_--_TypeScript-61DAFB?logo=react)](https://react.dev/)
[![Gemini API](https://img.shields.io/badge/AI-Gemini_Interactions_API-4285F4?logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/Status-V1_Production_Draft-orange)](#)

A full-stack web application that transforms user selfie photos into personalized, high-quality **chibi / kawaii AI sticker packs** for chat applications. Built according to the **DUHAT AI Sticker Generation PRD (V1.0)** specs using Google's native Gemini image generation and vision APIs.

---

## 📸 Key Features

- **📱 Mobile-First Wizard UX**: Clean 5-step wizard (`Landing` → `Upload` → `Generating` → `Preview` → `Tray`).
- **👤 Selfie-to-Chibi Transformation**: Converts a single selfie photo into 8 distinct expressive sticker variants:
  - 😊 **Happy** (Warm Yellow)
  - 😂 **LOL / Laughing** (Bright Orange)
  - 😍 **Love / Heart Eyes** (Pink)
  - 😢 **Sad / Crying** (Soft Blue)
  - 😡 **Angry / Frustrated** (Red)
  - 😲 **Surprised / Shocked** (Purple)
  - 👍 **Thumbs Up / OK** (Green)
  - 😴 **Sleepy / Tired** (Lavender)
- **🤖 Dual-Layer AI Validation**: 
  - *Client-side*: File format (JPEG/PNG/WebP), size limit (10MB), resolution check.
  - *Server-side AI*: Gemini vision (`gemini-3.6-flash`) evaluates face count (exactly 1), face clarity, lighting/blur quality, and content safety.
- **⚡ Parallel Progressive SSE Generation**: Fires 8 concurrent calls to `gemini-3.1-flash-image` via FastAPI SSE stream, showing stickers on the UI as each completes.
- **✂️ Automatic AI Background Removal**: Integrated `rembg` (U-2-Net AI cutout) pipeline that removes backgrounds from raw generated stickers, outputting transparent PNG cutouts ready for chat messaging.
- **🎨 Smart Text Compositing**: Post-generation client-side HTML5 Canvas compositing renders styled, color-coded pill text banners over stickers.
- **🌐 Full i18n (Bilingual)**: Instant language switching between **English (EN)** and **Vietnamese (VI)** for both UI controls and sticker wording.
- **📦 Pack & Sticker Management**: 
  - Save packs directly to browser storage (**IndexedDB** for blobs, `localStorage` for metadata).
  - Download individual PNG stickers or full pack as a `.zip` archive.
  - Delete individual stickers or entire packs.
  - Built-in **Abuse / Content Reporting** modal.
- **🔄 Session Regeneration**: Up to 3 pack regenerations per photo session.

---

## 🏗️ Architecture & Data Flow

```mermaid
graph TB
    subgraph Frontend ["Frontend (Vite + React + TS)"]
        LP[Landing Page]
        UP[Upload Page]
        GP[Generating Page]
        PP[Preview Page]
        TP[Tray Page]
        TC[Canvas Text Compositor]
        
        LP --> UP --> GP --> PP --> TP
        PP --> TC
    end

    subgraph Backend ["Backend (FastAPI + Python)"]
        VAL["/api/validate"]
        GEN["/api/generate-pack (SSE)"]
        HLT["/api/health"]
    end

    subgraph Gemini ["Google Gemini APIs"]
        VISION["gemini-3.6-flash<br/>(Face / Quality / Safety Validation)"]
        IMAGEN["gemini-3.1-flash-image<br/>(Chibi Image Generation)"]
    end

    subgraph ClientStorage ["Local Browser Storage"]
        IDB[IndexedDB: duhat_stickers]
        LS[localStorage: sticker_packs]
    end

    UP -->|Base64 Image| VAL
    GP -->|SSE EventSource| GEN
    VAL --> VISION
    GEN -->|8 Parallel Async Threads| IMAGEN
    PP -->|Save Selected| IDB
    PP -->|Save Metadata| LS
    TP -->|Read Blobs| IDB
    TP -->|Read Metadata| LS
```

---

## 📁 Project Structure

```
duhat_stickergen/
├── PRD_Sticker_Generation_V1.md  # Official Product Requirements Document
├── README.md                     # Project Overview & Setup Guide
├── backend/                      # Python FastAPI Backend
│   ├── .env.example              # Environment variables template
│   ├── main.py                   # FastAPI app entrypoint & SSE router
│   ├── models.py                 # Pydantic schemas (Validation, Generation, Pack)
│   ├── prompts.py                # Chibi character prompts & Gemini validation schema
│   ├── requirements.txt          # Python dependencies
│   ├── validators.py             # Server-side Gemini AI image validation logic
│   └── venv/                     # Python virtual environment
└── frontend/                     # Vite + React (TypeScript) Frontend
    ├── index.html                # App entry HTML & Google Fonts
    ├── package.json              # NPM dependencies (jszip, file-saver, etc.)
    ├── vite.config.ts            # Vite configuration
    └── src/
        ├── App.tsx               # Root app layout & wizard step router
        ├── index.css             # Global design tokens, pastels & animations
        ├── components/           # Reusable UI components
        │   ├── Header.tsx        # App header & branding
        │   ├── LanguageToggle.tsx# EN / VI language switcher
        │   ├── StickerCard.tsx   # Sticker display card with skeleton/selection states
        │   ├── ConsentModal.tsx  # User photo permission modal
        │   └── ReportModal.tsx   # Abuse / content reporting modal
        ├── i18n/                 # Internationalization system
        │   ├── i18n.ts           # i18n helper & context provider
        │   ├── en.json           # English UI & expression labels
        │   └── vi.json           # Vietnamese UI & expression labels
        ├── pages/                # Wizard step pages
        │   ├── LandingPage.tsx   # Hero intro page
        │   ├── UploadPage.tsx    # Drag-and-drop selfie uploader
        │   ├── GeneratingPage.tsx# SSE progress grid loader
        │   ├── PreviewPage.tsx   # Pack selection, compositing & save
        │   └── TrayPage.tsx      # Saved packs manager & ZIP exporter
        ├── services/             # Core application services
        │   ├── api.ts            # REST & SSE backend client
        │   ├── storage.ts        # IndexedDB & localStorage persistence layer
        │   ├── textCompositor.ts # Canvas text overlay builder
        │   └── analytics.ts      # In-memory analytics event tracking
        └── types/
            └── index.ts          # TypeScript domain interfaces & EXPRESSIONS config
```

---

## 🛠️ Prerequisites & Installation

### Requirements
- **Node.js**: `v18.x` or later
- **Python**: `v3.10` or later
- **Gemini API Key**: Valid API Key from [Google AI Studio](https://aistudio.google.com/)

---

## 🚀 How to Run

### 1. Setup Backend (FastAPI)

```bash
cd backend

# Create .env file from template
cp .env.example .env

# Edit .env and set your Gemini API key:
# GEMINI_API_KEY=AIzaSy...

# Install dependencies into virtualenv (already set up in venv/)
./venv/bin/pip install -r requirements.txt

# Start FastAPI server on port 8000
./venv/bin/uvicorn main:app --reload --port 8000
```
> Backend runs at: `http://localhost:8000` (Health check: `http://localhost:8000/api/health`)

---

### 2. Setup Frontend (Vite + React)

In a new terminal window:

```bash
cd frontend

# Install Node dependencies (if needed)
npm install

# Start Vite development server
npm run dev
```
> Frontend runs at: `http://localhost:5173`

---

## 📡 API Reference

### `GET /api/health`
Checks API server availability.
- **Response**: `{"status": "ok"}`

---

### `POST /api/validate`
Validates uploaded selfie photo using `gemini-3.6-flash`.
- **Request Body**:
  ```json
  {
    "image_base64": "<base64_encoded_image_string>",
    "mime_type": "image/jpeg"
  }
  ```
- **Response**:
  ```json
  {
    "valid": true,
    "error_code": null,
    "error_message": null,
    "details": {
      "face_count": 1,
      "has_clear_face": true,
      "image_quality": "good",
      "is_safe": true,
      "subject_type": "person"
    }
  }
  ```

---

### `POST /api/generate-pack` (Server-Sent Events)
Generates 8 sticker variants concurrently using `gemini-3.1-flash-image` and streams SSE chunks as each completes.
- **Request Body**:
  ```json
  {
    "image_base64": "<base64_encoded_image_string>",
    "mime_type": "image/jpeg"
  }
  ```
- **SSE Stream Data**:
  ```text
  data: {"expression_id": "happy", "image_base64": "...", "success": true, "filtered": false}

  data: {"expression_id": "laughing", "image_base64": "...", "success": true, "filtered": false}

  ...

  data: {"done": true}
  ```

---

## 🧪 Verification & Build Status

- **TypeScript Type Check**: `npx tsc --noEmit` — ✅ Passed (0 errors)
- **Frontend Production Build**: `npx vite build` — ✅ Passed (64 modules transformed)
- **Backend Python Syntax**: `python3 -m py_compile` — ✅ Passed (0 syntax errors)

---

## 📜 License & Acknowledgements

Designed & developed according to **DUHAT AI Product Specifications (August 2026)**. Powered by Google Gemini Interactions API (`gemini-3.1-flash-image` & `gemini-3.6-flash`).

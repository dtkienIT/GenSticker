#!/bin/bash

# ==============================================================================
# DUHAT AI Sticker Studio — Startup Script
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "============================================================"
echo "🚀 Initializing DUHAT AI Sticker Studio..."
echo "============================================================"

# 1. Check Python & Node
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    exit 1
fi

# 2. Check Backend .env and GEMINI_API_KEY
ENV_FILE="$BACKEND_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "📄 Creating backend/.env from template..."
    cp "$BACKEND_DIR/.env.example" "$ENV_FILE"
fi

if grep -q "your_api_key_here" "$ENV_FILE" || ! grep -q "GEMINI_API_KEY=" "$ENV_FILE"; then
    echo "⚠️  WARNING: GEMINI_API_KEY is not set or using placeholder in backend/.env"
    echo "    Please edit backend/.env and set your Gemini API key before generating stickers."
    echo ""
fi

# 3. Setup Python virtual environment if needed
VENV_DIR="$BACKEND_DIR/venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating Python virtual environment in backend/venv..."
    python3 -m venv "$VENV_DIR"
    echo "📥 Installing backend requirements..."
    "$VENV_DIR/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
fi

# 4. Setup Frontend node_modules if needed
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "📦 Installing frontend dependencies (npm install)..."
    (cd "$FRONTEND_DIR" && npm install)
fi

echo "============================================================"
echo "✨ Starting Backend (FastAPI) and Frontend (Vite)..."
echo "============================================================"
echo "🌐 Backend URL : http://localhost:8000"
echo "🌐 Frontend URL: http://localhost:5173"
echo "Press Ctrl+C to stop all servers."
echo "============================================================"

# Function to kill all background processes on SIGINT/SIGTERM
cleanup() {
    echo -e "\n🛑 Stopping DUHAT AI Sticker Studio servers..."
    kill 0
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start Backend
(cd "$BACKEND_DIR" && ./venv/bin/uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!

# Start Frontend
(cd "$FRONTEND_DIR" && npm run dev) &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

#!/usr/bin/env bash
set -e

echo "Setting up GenSticker Local Environment..."

if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment (.venv)..."
    python3 -m venv .venv
fi

echo "Installing backend dependencies..."
./.venv/bin/pip install --upgrade pip
./.venv/bin/pip install -e "backend[dev]"

if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

mkdir -p data/assets data/artifacts

echo "Running Alembic database migrations..."
PYTHONPATH=. ./.venv/bin/python -m alembic -c backend/alembic.ini upgrade head

echo "Setup completed successfully!"

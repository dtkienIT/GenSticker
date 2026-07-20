#!/usr/bin/env bash
set -e

echo "Starting GenSticker Local API & Durable Job Worker..."

if command -v docker-compose &> /dev/null || command -v docker &> /dev/null; then
    docker compose up --build api worker
else
    PYTHONPATH=. ./.venv/bin/python -m backend.app.main &
    PYTHONPATH=. ./.venv/bin/python -m backend.app.jobs.worker &
    wait
fi

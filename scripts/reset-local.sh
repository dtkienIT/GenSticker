#!/usr/bin/env bash
set -e

if [ "$1" != "--yes" ]; then
    read -p "Are you sure you want to reset all local SQLite data and asset files? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Reset cancelled."
        exit 0
    fi
fi

echo "Resetting GenSticker local data..."

if command -v docker &> /dev/null; then
    docker compose down || true
fi

rm -f data/gensticker.db
rm -rf data/assets/*

PYTHONPATH=. ./.venv/bin/python -m alembic -c backend/alembic.ini upgrade head || true

echo "Local reset completed!"

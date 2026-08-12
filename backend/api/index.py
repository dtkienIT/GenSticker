"""Vercel's catch-all Python Function entrypoint for the FastAPI backend."""

from app.main import app

__all__ = ["app"]

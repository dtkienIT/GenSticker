import uvicorn

from app.config import settings


if __name__ == "__main__":
  print(f"Starting GenSticker FastAPI Backend on http://{settings.API_HOST}:{settings.API_PORT} ...")
  uvicorn.run(
    "app.main:app",
    host=settings.API_HOST,
    port=settings.API_PORT,
    reload=settings.APP_ENV == "development",
  )

FROM pytorch/pytorch:2.4.1-cuda12.4-cudnn9-runtime

WORKDIR /app

# InsightFace and OpenCV runtime/build dependencies.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    libgl1 \
    libglib2.0-0 \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml
COPY backend/pyproject.toml /app/backend/

# Install python dependencies
RUN pip install --no-cache-dir -e "/app/backend[dev]"

# Copy backend source code and migrations
COPY backend /app/backend
COPY data /app/data

EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
